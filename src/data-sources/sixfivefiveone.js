/**
 * 6551 OpenNews + OpenTwitter 数据源（增强版 v2）
 *
 * 叙事总结：
 *   - OpenNews 多策略搜索（coin symbol、名称、meme 引擎、cashtag）
 *   - OpenTwitter CA 优先搜索 → KOL 审计 → 叙事评级 S/A/B/C
 *   结果去重、AI 评分排序、情绪分析、推特叙事分析
 *
 * 热门推特：cashtag ($SYMBOL) + 合约地址前缀多维搜索，
 *          相关性过滤、KOL 加权、增强营销号检测
 *
 * 推特叙事分析（来自 meme 叙事专家方法论）：
 *   - 以 CA 为核心搜索推特，避免同名代币干扰
 *   - KOL 分层（顶级 / 中高 / 中低 / 小博主）
 *   - 传销号识别与占比统计
 *   - 叙事等级判定（S / A / B / C）
 *   - 结构化叙事评估输出
 *
 * 成本优化：
 *   - 内存缓存（叙事 30min，推文 60min）
 *   - Supabase 持久化缓存由调用方（server.js）管理
 *   - 批量预取支持
 */

import * as dexscreener from './dexscreener.js';
import * as goplus from './goplus.js';

const NEWS_BASE = 'https://ai.6551.io';

function getNewsToken() {
  return (process.env.OPENNEWS_TOKEN || process.env.TWITTER_TOKEN || process.env.TOKEN_6551 || '').trim();
}

function getTwitterToken() {
  return (process.env.TWITTER_TOKEN || process.env.OPENNEWS_TOKEN || process.env.TOKEN_6551 || '').trim();
}

// ─── 内存缓存 ────────────────────────────────────────
const cache = new Map();
const NEWS_CACHE_TTL = 30 * 60_000;
const TWEET_CACHE_TTL = 60 * 60_000;

function cacheGet(key, ttl) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return undefined; }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, ts: Date.now() });
}

async function fetchJson(url, body, token) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`6551 API error ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

// ─── 营销号/传销号 过滤（增强版 v2 —— 融合推特叙事专家方法）──────

const SHILL_KEYWORDS_BIO = [
  'call group', 'signal group', 'gem call', '100x', '1000x',
  'pump group', 'guaranteed profit', 'dm for', 'join our',
  'free signal', 'paid group', 'vip group', 'buy now',
  'airdrop hunter', 'giveaway', 'nfa dyor', 'moonshot',
  '💎🙌', '🚀🚀🚀', 'shill', 'promo',
  'copy trading', 'alpha call', 'insider alert',
];

const SHILL_KEYWORDS_TEXT = [
  'join telegram', 'join discord', 'buy now', 'don\'t miss',
  'last chance', 'guaranteed', '100x gem', '1000x',
  'presale live', 'whitelist open', 'dm me',
  'free airdrop', '🚨🚨', 'BREAKING:',
  'not financial advice', 'send me', 'follow and rt',
  'like & rt for', 'claim your', 'drop your wallet',
];

const PAID_PROMO_MARKERS = ['#ad', 'sponsored', '#sponsored', 'paid partnership', 'collab'];

const SHILL_NAME_PATTERNS = /bot|shill|call|signal|gem|pump|alert|airdrop|promo|giveaway/i;

/**
 * 检测推文是否只有 CA + emoji，没有实质分析内容
 * （传销号典型行为：发 CA + 火箭 emoji，无分析）
 */
function isSubstanceless(text) {
  const stripped = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[A-HJ-NP-Za-km-z1-9]{32,44}/g, '')  // remove Solana-like addresses
    .replace(/0x[a-fA-F0-9]{40}/g, '')              // remove EVM addresses
    .replace(/\$[A-Za-z]+/g, '')                     // remove cashtags
    .replace(/#\w+/g, '')                            // remove hashtags
    .replace(/https?:\/\/\S+/g, '')                  // remove URLs
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length < 20;
}

/**
 * 估算账号年龄（月数），基于 createdAt 字段
 * 若无法判断则返回 Infinity（视为老号）
 */
function estimateAccountAgeMonths(tweet) {
  const created = tweet.userCreatedAt || tweet.user_created_at;
  if (!created) return Infinity;
  const d = new Date(created);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (30 * 86400_000);
}

function isLikelyShill(tweet) {
  const text = (tweet.text || '').toLowerCase();
  const bio = (tweet.userDescription || '').toLowerCase();
  const screenName = (tweet.userScreenName || '').toLowerCase();

  for (const kw of SHILL_KEYWORDS_TEXT) {
    if (text.includes(kw.toLowerCase())) return true;
  }
  for (const kw of SHILL_KEYWORDS_BIO) {
    if (bio.includes(kw.toLowerCase())) return true;
  }

  // 明显付费推广
  for (const marker of PAID_PROMO_MARKERS) {
    if (text.includes(marker)) return true;
  }

  const followers = tweet.userFollowersCount || 0;
  const friends = tweet.userFriendsCount || 1;
  if (followers < 100) return true;
  if (friends > 0 && followers / friends < 0.1) return true;

  if (SHILL_NAME_PATTERNS.test(screenName)) return true;

  // 新号（<6 个月）+ 无实质内容 → 大概率传销号
  const ageMonths = estimateAccountAgeMonths(tweet);
  if (ageMonths < 6 && isSubstanceless(tweet.text || '')) return true;

  const textLen = text.length;
  if (textLen > 0) {
    const emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > textLen * 0.15) return true;
  }

  // 纯 CA + emoji，无实质分析
  if (isSubstanceless(tweet.text || '') && followers < 5000) return true;

  return false;
}

// ─── KOL 分层系统 ─────────────────────────────────────

/**
 * KOL 层级划分（参考推特叙事专家标准）
 * tier1: 顶级 KOL（Cobie, Ansem, Hsaka 等级别，粉丝 ≥500K 或已认证 + ≥200K）
 * tier2: 中高权重博主（粉丝 ≥50K）
 * tier3: 中低博主（粉丝 ≥10K）
 * tier4: 小博主 / 普通用户（粉丝 <10K）
 */
function classifyKolTier(tweet) {
  const followers = tweet.userFollowersCount || 0;
  const verified = tweet.userVerified || false;

  if (followers >= 500_000) return 'tier1';
  if (verified && followers >= 200_000) return 'tier1';
  if (followers >= 50_000) return 'tier2';
  if (followers >= 10_000) return 'tier3';
  return 'tier4';
}

// ─── 推特叙事分析（核心新增）────────────────────────────

/**
 * 基于推特数据进行叙事评级
 *
 * @param {Array} tweets 已过滤的推文列表
 * @param {Array} rawTweets 未过滤的原始推文列表（用于计算传销号占比）
 * @returns {{ grade: string, kolSummary: object, shillRatio: number, organicScore: number, assessment: object }}
 */
function analyzeTwitterNarrative(tweets, rawTweets) {
  const kolDistribution = { tier1: [], tier2: [], tier3: [], tier4: [] };
  const seenUsers = new Set();

  for (const t of tweets) {
    const user = t.userScreenName || t.userName || '';
    if (seenUsers.has(user)) continue;
    seenUsers.add(user);
    const tier = classifyKolTier(t);
    kolDistribution[tier].push({
      user,
      followers: t.userFollowersCount || 0,
      verified: t.userVerified || false,
      likes: t.favoriteCount || 0,
      retweets: t.retweetCount || 0,
    });
  }

  const shillCount = rawTweets.filter(t => isLikelyShill(t)).length;
  const shillRatio = rawTweets.length > 0 ? shillCount / rawTweets.length : 0;

  // 有机度评分：自发 KOL 互动 vs 付费/传销驱动
  let organicScore = 0;
  const tier1Count = kolDistribution.tier1.length;
  const tier2Count = kolDistribution.tier2.length;
  const tier3Count = kolDistribution.tier3.length;
  const totalKolCount = tier1Count + tier2Count + tier3Count;
  const totalEngagement = tweets.reduce((sum, t) =>
    sum + (t.favoriteCount || 0) + (t.retweetCount || 0) * 2, 0);

  if (tier1Count >= 1) organicScore += 40;
  if (tier2Count >= 2) organicScore += 25;
  else if (tier2Count >= 1) organicScore += 15;
  if (tier3Count >= 3) organicScore += 15;
  if (totalEngagement > 1000) organicScore += 10;
  if (shillRatio < 0.2) organicScore += 10;
  else if (shillRatio > 0.5) organicScore -= 20;
  organicScore = Math.max(0, Math.min(100, organicScore));

  // 叙事等级判定
  let grade = 'C';
  if (tier1Count >= 2 || (tier1Count >= 1 && tier2Count >= 2 && shillRatio < 0.3)) {
    grade = 'S';
  } else if (tier2Count >= 2 && shillRatio < 0.4 && totalKolCount >= 3) {
    grade = 'A';
  } else if ((tier2Count >= 1 || tier3Count >= 2) && shillRatio < 0.5) {
    grade = 'B';
  }

  // 叙事驱动类型判定
  let driverType = 'unknown';
  if (organicScore >= 60) driverType = 'organic';      // 社区自发驱动
  else if (organicScore >= 30) driverType = 'mixed';    // 混合驱动
  else driverType = 'paid';                              // 付费/项目方营销驱动

  // 推荐
  let recommendation = '观察';
  if (grade === 'S') recommendation = '重点关注';
  else if (grade === 'A') recommendation = '值得关注';
  else if (grade === 'B') recommendation = '谨慎观察';
  else recommendation = '注意风险';

  const assessment = {
    narrativeGrade: grade,
    driverType,
    driverLabel: { organic: '社区自发驱动', mixed: '混合驱动', paid: '项目方/付费驱动', unknown: '未知' }[driverType],
    recommendation,
    shillRatio: Math.round(shillRatio * 100),
    organicScore,
    kolCount: { tier1: tier1Count, tier2: tier2Count, tier3: tier3Count, total: totalKolCount },
    topKols: [...kolDistribution.tier1, ...kolDistribution.tier2]
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 5)
      .map(k => ({ user: k.user, followers: k.followers, verified: k.verified })),
    totalTweets: tweets.length,
    totalEngagement,
  };

  return assessment;
}

// ─── 链上叙事分析（无需任何 API Key）─────────────────────

/**
 * 基于链上数据（DexScreener + GoPlus）进行叙事评估
 * 完全免费，不依赖推特/新闻 API
 *
 * 数据维度：
 *   1. 市场健康度：交易量/市值比、流动性深度、买卖比、价格波动
 *   2. 社区健康度：持币人数、Top10 集中度、交易人数
 *   3. 安全评估：LP 锁定、铸币权、冻结权、蜜罐风险
 *   4. 项目成熟度：代币年龄、DexScreener Profile、社交链接
 *
 * @param {string} contractAddress 合约地址
 * @param {string} [chain='solana'] 链
 * @returns {Promise<object|null>} 链上叙事评估
 */
async function getOnChainNarrative(contractAddress, chain = 'solana') {
  if (!contractAddress) return null;

  const cacheKey = `onchain-narrative:${contractAddress}`;
  const cached = cacheGet(cacheKey, NEWS_CACHE_TTL);
  if (cached) return cached;

  try {
    const [pairs, security] = await Promise.all([
      dexscreener.getTokenPairs(contractAddress).catch(() => []),
      goplus.getTokenSecuritySingle(chain, contractAddress).catch(() => null),
    ]);

    if (!pairs.length && !security) return null;

    // 选择流动性最高的交易对
    const sorted = [...pairs].sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const mainPair = sorted[0] || {};
    const pairInfo = mainPair.info || {};

    // ── 市场指标 ──
    const mcap = mainPair.marketCap || mainPair.fdv || 0;
    const volume24h = mainPair.volume?.h24 || 0;
    const liquidity = mainPair.liquidity?.usd || 0;
    const priceChange24h = mainPair.priceChange?.h24 || 0;
    const txns24h = mainPair.txns?.h24 || {};
    const buys24h = txns24h.buys || 0;
    const sells24h = txns24h.sells || 0;
    const totalTxns = buys24h + sells24h;
    const buyRatio = totalTxns > 0 ? buys24h / totalTxns : 0.5;

    // 交易量/市值比（velocity）
    const velocity = mcap > 0 ? volume24h / mcap : 0;
    // 流动性/市值比
    const liqDepth = mcap > 0 ? liquidity / mcap : 0;

    // 代币年龄（天）
    const pairAge = mainPair.pairCreatedAt
      ? (Date.now() - mainPair.pairCreatedAt) / 86400_000
      : null;

    // ── DexScreener Profile（社交/品牌）──
    const hasProfile = !!(pairInfo.imageUrl);
    const socials = pairInfo.socials || [];
    const websites = pairInfo.websites || [];
    const hasTwitter = socials.some(s => s.type === 'twitter' || s.platform === 'twitter');
    const hasTelegram = socials.some(s => s.type === 'telegram' || s.platform === 'telegram');
    const hasWebsite = websites.length > 0;
    const socialCount = socials.length + websites.length;

    // ── GoPlus 安全 ──
    const holderCount = security?.holder_count || 0;
    const lpLocked = security?.is_lp_locked || false;
    const isMintable = security?.is_mintable || false;
    const isFreezable = security?.is_freezable || false;
    const topHolderPct = security?.top_holder_percent || 0;
    const riskLevel = security?.risk_level || 'UNKNOWN';
    const isHoneypot = security?.is_honeypot || false;

    // ═══ 评分计算 ═══

    // 1) 市场健康度 (0-30)
    let marketScore = 0;
    if (velocity >= 0.5) marketScore += 10;
    else if (velocity >= 0.2) marketScore += 7;
    else if (velocity >= 0.05) marketScore += 4;

    if (liqDepth >= 0.1) marketScore += 8;
    else if (liqDepth >= 0.03) marketScore += 5;
    else if (liqDepth >= 0.01) marketScore += 2;

    if (totalTxns >= 500) marketScore += 6;
    else if (totalTxns >= 100) marketScore += 4;
    else if (totalTxns >= 20) marketScore += 2;

    if (buyRatio >= 0.45 && buyRatio <= 0.65) marketScore += 6;
    else if (buyRatio >= 0.35) marketScore += 3;

    // 2) 社区健康度 (0-25)
    let communityScore = 0;
    if (holderCount >= 10_000) communityScore += 10;
    else if (holderCount >= 3_000) communityScore += 7;
    else if (holderCount >= 1_000) communityScore += 5;
    else if (holderCount >= 300) communityScore += 2;

    if (topHolderPct > 0 && topHolderPct < 0.3) communityScore += 8;
    else if (topHolderPct < 0.5) communityScore += 4;

    const pairCount = pairs.length;
    if (pairCount >= 5) communityScore += 4;
    else if (pairCount >= 3) communityScore += 3;
    else if (pairCount >= 2) communityScore += 1;

    if (mcap >= 1_000_000) communityScore += 3;
    else if (mcap >= 100_000) communityScore += 1;

    // 3) 安全评估 (0-25)
    let securityScore = 10; // 基础分
    if (isHoneypot) securityScore = 0;
    else {
      if (lpLocked) securityScore += 6;
      if (!isMintable) securityScore += 4;
      if (!isFreezable) securityScore += 3;
      if (riskLevel === 'LOW') securityScore += 2;
      else if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') securityScore -= 8;
      else if (riskLevel === 'MEDIUM') securityScore -= 3;
    }
    securityScore = Math.max(0, Math.min(25, securityScore));

    // 4) 项目成熟度 (0-20)
    let maturityScore = 0;
    if (hasProfile) maturityScore += 4;
    if (hasTwitter) maturityScore += 3;
    if (hasTelegram) maturityScore += 2;
    if (hasWebsite) maturityScore += 3;

    if (pairAge !== null) {
      if (pairAge >= 30) maturityScore += 5;
      else if (pairAge >= 7) maturityScore += 3;
      else if (pairAge >= 1) maturityScore += 1;
    }

    if (socialCount >= 3) maturityScore += 3;
    else if (socialCount >= 1) maturityScore += 1;

    // ═══ 总分 & 等级 ═══
    const totalScore = marketScore + communityScore + securityScore + maturityScore;

    let grade = 'C';
    if (totalScore >= 70) grade = 'S';
    else if (totalScore >= 55) grade = 'A';
    else if (totalScore >= 35) grade = 'B';

    if (isHoneypot || riskLevel === 'CRITICAL') grade = 'C';

    let recommendation = '注意风险';
    if (grade === 'S') recommendation = '重点关注';
    else if (grade === 'A') recommendation = '值得关注';
    else if (grade === 'B') recommendation = '谨慎观察';

    const result = {
      narrativeGrade: grade,
      totalScore,
      recommendation,
      source: 'onchain',
      dimensions: {
        market: { score: marketScore, max: 30, velocity: Math.round(velocity * 100) / 100, liqDepth: Math.round(liqDepth * 100) / 100, txns24h: totalTxns, buyRatio: Math.round(buyRatio * 100) },
        community: { score: communityScore, max: 25, holders: holderCount, topHolderPct: Math.round(topHolderPct * 100), pairCount },
        security: { score: securityScore, max: 25, lpLocked, isMintable, isFreezable, isHoneypot, riskLevel },
        maturity: { score: maturityScore, max: 20, hasProfile, hasTwitter, hasTelegram, hasWebsite, ageDays: pairAge !== null ? Math.round(pairAge) : null },
      },
      mcap,
      volume24h,
      liquidity,
      priceChange24h,
    };

    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[链上叙事] 分析失败:', e?.message);
    return null;
  }
}

/**
 * 获取代币推特叙事分析（CA 优先搜索）
 *
 * 搜索策略（按优先级）：
 * 1. 合约地址搜索（最精准，避免同名干扰）
 * 2. cashtag 搜索（$SYMBOL）
 * 3. 代币名称补充搜索
 *
 * @param {string} symbol
 * @param {string} name
 * @param {object} options
 * @param {string} options.contractAddress
 * @returns {Promise<object>} 叙事评估结果
 */
async function getTokenTwitterNarrative(symbol, name, options = {}) {
  const { contractAddress = '' } = options;
  const twitterToken = getTwitterToken();
  if (!twitterToken) return null;

  const cacheKey = `tw-narrative:${symbol}:${contractAddress.slice(0, 8)}`;
  const cached = cacheGet(cacheKey, NEWS_CACHE_TTL);
  if (cached) return cached;

  try {
    const today = new Date();
    const sinceDate = new Date(today);
    sinceDate.setDate(sinceDate.getDate() - 3);
    const sinceDateStr = sinceDate.toISOString().slice(0, 10);

    const sym = (symbol || '').toUpperCase();
    const searchPromises = [];

    // 策略 1（核心）：合约地址搜索（CA 唯一性，避免同名代币干扰）
    if (contractAddress && contractAddress.length >= 10) {
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: contractAddress,
          product: 'Top',
          maxResults: 50,
          excludeRetweets: true,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
      // 也搜 Latest 以获取更全面的数据
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: contractAddress.slice(0, 12),
          product: 'Latest',
          maxResults: 30,
          excludeRetweets: true,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    // 策略 2：cashtag 搜索
    if (sym && sym.length >= 2) {
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: `$${sym}`,
          product: 'Top',
          maxResults: 40,
          excludeRetweets: true,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    // 策略 3：名称搜索（仅名称较独特时使用）
    if (name && name.length >= 4 && name.toLowerCase() !== (sym || '').toLowerCase()) {
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: name,
          product: 'Top',
          maxResults: 20,
          excludeRetweets: true,
          minLikes: 5,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    if (searchPromises.length === 0) return null;

    const responses = await Promise.allSettled(searchPromises);
    const seenIds = new Set();
    const allTweets = [];

    for (const r of responses) {
      if (r.status === 'fulfilled') {
        for (const t of (r.value?.data || [])) {
          if (t.id && !seenIds.has(t.id)) {
            seenIds.add(t.id);
            allTweets.push(t);
          }
        }
      }
    }

    if (allTweets.length === 0) return null;

    // 保留原始列表（用于计算传销号占比），然后过滤
    const rawTweets = [...allTweets];
    const filteredTweets = allTweets.filter(t => {
      if (isLikelyShill(t)) return false;
      if (contractAddress || (sym && sym.length <= 5)) {
        return isRelevantToToken(t, { symbol: sym, name, contractAddress });
      }
      return true;
    });

    const result = analyzeTwitterNarrative(filteredTweets, rawTweets);
    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[6551] 推特叙事分析失败:', e?.message);
    return null;
  }
}

/**
 * 判断推文是否真正提及目标代币（相关性检查）
 * 避免 symbol 是常见词（如 "AI"、"WIN"）时的误匹配
 */
function isRelevantToToken(tweet, { symbol, name, contractAddress }) {
  const text = (tweet.text || '').toLowerCase();
  const sym = (symbol || '').toLowerCase();
  const nm = (name || '').toLowerCase();
  const ca = (contractAddress || '').toLowerCase();

  if (sym && text.includes(`$${sym}`)) return true;
  if (ca && ca.length >= 8 && text.includes(ca.slice(0, 8))) return true;
  if (nm && nm.length >= 4 && text.includes(nm)) return true;
  if (sym && sym.length >= 4 && text.includes(sym)) return true;
  // 短 symbol（2-3字符）需要更严格：必须是独立词或 cashtag
  if (sym && sym.length <= 3) {
    const wordBoundary = new RegExp(`(?:^|\\s|\\$)${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$|[.,!?])`, 'i');
    if (wordBoundary.test(tweet.text || '')) return true;
  }

  return false;
}

/**
 * 计算推文综合质量分（KOL 加权 + 互动质量）
 */
function tweetQualityScore(tweet) {
  const likes = tweet.favoriteCount || 0;
  const retweets = tweet.retweetCount || 0;
  const replies = tweet.replyCount || 0;
  const followers = tweet.userFollowersCount || 0;
  const verified = tweet.userVerified ? 1 : 0;

  const engagement = likes * 1.0 + retweets * 2.0 + replies * 0.5;

  let kolMultiplier = 1.0;
  if (verified) kolMultiplier += 0.5;
  if (followers >= 100_000) kolMultiplier += 1.0;
  else if (followers >= 50_000) kolMultiplier += 0.7;
  else if (followers >= 10_000) kolMultiplier += 0.4;
  else if (followers >= 1_000) kolMultiplier += 0.1;

  // 新鲜度加成：24h 内的推文得分更高
  const age = tweet.createdAt ? (Date.now() - new Date(tweet.createdAt).getTime()) : Infinity;
  const freshnessBonus = age < 86400_000 ? 1.2 : (age < 172800_000 ? 1.0 : 0.8);

  return engagement * kolMultiplier * freshnessBonus;
}

// ─── 新闻叙事总结（增强版）─────────────────────────────

/**
 * 获取代币相关新闻并生成叙事总结
 * 多策略搜索：coin symbol → 名称 → meme 引擎 → cashtag
 *
 * @param {string} symbol 代币符号
 * @param {string} [name] 代币名称
 * @param {object} [options]
 * @param {string} [options.contractAddress] 合约地址（用于更精准的搜索）
 * @returns {{ summary: string, articles: Array, sentiment: string, updatedAt: string }}
 */
export async function getTokenNarrative(symbol, name, options = {}) {
  const { contractAddress = '' } = options;
  const newsToken = getNewsToken();
  if (!newsToken) {
    return { summary: '', articles: [], sentiment: 'neutral', updatedAt: null, error: 'OPENNEWS_TOKEN 未配置' };
  }

  const cacheKey = `narrative:${symbol}:${name || ''}:${contractAddress.slice(0, 8)}`;
  const cached = cacheGet(cacheKey, NEWS_CACHE_TTL);
  if (cached) return cached;

  try {
    const searches = [];

    // 策略 1：按 coin symbol 搜索（OpenNews 标准方式，匹配率最高）
    if (symbol) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          coins: [symbol.toUpperCase()],
          limit: 20,
          page: 1,
        }, newsToken)
      );
    }

    // 策略 2：按名称关键词搜索
    if (name && name.toLowerCase() !== (symbol || '').toLowerCase()) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: name,
          limit: 10,
          page: 1,
        }, newsToken)
      );
    }

    // 策略 3：meme 引擎搜索（专门覆盖 meme 代币相关内容）
    if (symbol || name) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: symbol || name,
          engineTypes: { meme: [] },
          limit: 15,
          page: 1,
        }, newsToken).catch(() => ({ data: [] }))
      );
    }

    // 策略 4：cashtag 格式搜索（加密推特常用格式 $PEPE）
    if (symbol && symbol.length >= 2) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: `$${symbol.toUpperCase()}`,
          limit: 10,
          page: 1,
        }, newsToken).catch(() => ({ data: [] }))
      );
    }

    const results = await Promise.allSettled(searches);
    const allArticles = [];
    const seenIds = new Set();

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.data) {
        for (const article of r.value.data) {
          if (!seenIds.has(article.id)) {
            seenIds.add(article.id);
            allArticles.push(article);
          }
        }
      }
    }

    allArticles.sort((a, b) => {
      const scoreA = a.aiRating?.score || 0;
      const scoreB = b.aiRating?.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.ts || 0) - (a.ts || 0);
    });

    // 提取有 AI 摘要的文章，去重相似内容
    const topArticles = [];
    const seenSummaries = new Set();
    for (const a of allArticles) {
      if (topArticles.length >= 8) break;
      if (a.aiRating?.status !== 'done' || !a.aiRating?.summary) continue;
      const summaryKey = a.aiRating.summary.slice(0, 50).toLowerCase();
      if (seenSummaries.has(summaryKey)) continue;
      seenSummaries.add(summaryKey);
      topArticles.push(a);
    }

    // 生成叙事摘要（去重后拼接，截断到合理长度）
    let summary = '';
    if (topArticles.length > 0) {
      const summaries = topArticles.map(a => a.aiRating.summary).filter(Boolean);
      summary = summaries.join(' ');
      if (summary.length > 600) {
        summary = summary.slice(0, 597) + '…';
      }
    }

    // 分析情绪
    let bullishCount = 0;
    let bearishCount = 0;
    for (const a of topArticles) {
      if (a.aiRating?.signal === 'long') bullishCount++;
      else if (a.aiRating?.signal === 'short') bearishCount++;
    }
    let sentiment = 'neutral';
    if (bullishCount > bearishCount * 2) sentiment = 'bullish';
    else if (bearishCount > bullishCount * 2) sentiment = 'bearish';
    else if (bullishCount > bearishCount) sentiment = 'slightly_bullish';
    else if (bearishCount > bullishCount) sentiment = 'slightly_bearish';

    const articleList = allArticles.slice(0, 12).map(a => ({
      id: a.id,
      text: a.text,
      source: a.newsType,
      engineType: a.engineType,
      link: a.link,
      score: a.aiRating?.score,
      signal: a.aiRating?.signal,
      summary: a.aiRating?.summary || a.aiRating?.enSummary || '',
      ts: a.ts,
    }));

    // 并行获取链上叙事 + 推特叙事
    let twitterNarrative = null;
    let onChainNarrative = null;

    const [twResult, ocResult] = await Promise.allSettled([
      getTokenTwitterNarrative(symbol, name, { contractAddress }),
      getOnChainNarrative(contractAddress),
    ]);
    if (twResult.status === 'fulfilled') twitterNarrative = twResult.value;
    if (ocResult.status === 'fulfilled') onChainNarrative = ocResult.value;

    // 如果推特分析可用，用推特结果作为主叙事；否则用链上分析
    // 两者都可用时合并，推特 KOL 数据 + 链上安全/市场数据
    const mergedNarrative = mergeNarratives(twitterNarrative, onChainNarrative);

    const result = {
      summary,
      articles: articleList,
      sentiment,
      sourceCount: allArticles.length,
      updatedAt: new Date().toISOString(),
      twitterNarrative: mergedNarrative,
    };

    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[6551] 获取新闻叙事失败:', e?.message);
    // 即使新闻失败，尝试获取链上叙事
    let fallbackNarrative = null;
    try {
      fallbackNarrative = await getOnChainNarrative(contractAddress);
    } catch { /* ignore */ }
    return { summary: '', articles: [], sentiment: 'neutral', updatedAt: null, twitterNarrative: fallbackNarrative, error: e?.message };
  }
}

/**
 * 合并推特叙事 + 链上叙事，产出综合评估
 * - 推特可用时：以推特 KOL/传销号分析为主，链上数据为辅
 * - 推特不可用时：以链上数据为主（完全不依赖推特）
 * - 两者都可用时：综合评分取加权平均
 */
function mergeNarratives(twitter, onChain) {
  if (!twitter && !onChain) return null;

  // 仅有链上数据（无推特 API 场景）
  if (!twitter && onChain) {
    return {
      ...onChain,
      source: 'onchain',
      driverType: deriveDriverType(onChain),
      driverLabel: deriveDriverLabel(onChain),
    };
  }

  // 仅有推特数据
  if (twitter && !onChain) return { ...twitter, source: 'twitter' };

  // 两者都有 → 综合评估
  // 推特权重 40%，链上权重 60%（链上数据更客观可靠）
  const twitterGradeScore = { S: 100, A: 75, B: 50, C: 25 }[twitter.narrativeGrade] || 25;
  const onChainGradeScore = onChain.totalScore;
  const combinedScore = Math.round(twitterGradeScore * 0.4 + onChainGradeScore * 0.6);

  let grade = 'C';
  if (combinedScore >= 70) grade = 'S';
  else if (combinedScore >= 55) grade = 'A';
  else if (combinedScore >= 35) grade = 'B';

  // 安全性一票否决
  if (onChain.dimensions?.security?.isHoneypot ||
      onChain.dimensions?.security?.riskLevel === 'CRITICAL') {
    grade = 'C';
  }

  let recommendation = '注意风险';
  if (grade === 'S') recommendation = '重点关注';
  else if (grade === 'A') recommendation = '值得关注';
  else if (grade === 'B') recommendation = '谨慎观察';

  return {
    narrativeGrade: grade,
    totalScore: combinedScore,
    recommendation,
    source: 'combined',
    driverType: twitter.driverType || deriveDriverType(onChain),
    driverLabel: twitter.driverLabel || deriveDriverLabel(onChain),
    shillRatio: twitter.shillRatio,
    organicScore: twitter.organicScore,
    kolCount: twitter.kolCount,
    topKols: twitter.topKols,
    totalTweets: twitter.totalTweets,
    totalEngagement: twitter.totalEngagement,
    dimensions: onChain.dimensions,
  };
}

function deriveDriverType(onChain) {
  if (!onChain?.dimensions) return 'unknown';
  const { community, market } = onChain.dimensions;
  if (community.holders >= 3000 && market.txns24h >= 100) return 'organic';
  if (community.holders >= 500 || market.txns24h >= 50) return 'mixed';
  return 'paid';
}

function deriveDriverLabel(onChain) {
  const type = deriveDriverType(onChain);
  return { organic: '社区自发驱动', mixed: '混合驱动', paid: '早期/项目方驱动', unknown: '未知' }[type];
}

// ─── 热门推特（增强版）────────────────────────────────

/**
 * 获取代币热门推特
 * 多维搜索：cashtag ($SYMBOL) → symbol → CA 前缀
 * 增强过滤：相关性检查 + KOL 加权 + 营销号检测
 *
 * @param {string} keyword 搜索关键词（代币名称或符号）
 * @param {object} [options]
 * @param {string} [options.contractAddress] 合约地址
 * @param {string} [options.symbol] 代币符号
 * @param {string} [options.name] 代币名称
 * @returns {{ tweets: Array, searchQueries: string[], updatedAt: string }}
 */
export async function getTokenHotTweets(keyword, options = {}) {
  const {
    contractAddress = '',
    symbol = keyword,
    name = '',
  } = options;

  const twitterToken = getTwitterToken();
  if (!twitterToken) {
    return { tweets: [], updatedAt: null, error: 'TWITTER_TOKEN 未配置' };
  }

  const cacheKey = `tweets:${symbol || keyword}:${contractAddress.slice(0, 8)}`;
  const cached = cacheGet(cacheKey, TWEET_CACHE_TTL);
  if (cached) return cached;

  try {
    const today = new Date();
    const sinceDate = new Date(today);
    sinceDate.setDate(sinceDate.getDate() - 2);
    const sinceDateStr = sinceDate.toISOString().slice(0, 10);

    const sym = (symbol || keyword || '').toUpperCase();
    const searchQueries = [];
    const searchPromises = [];

    // 搜索策略 1：cashtag 格式（加密推特最精准的搜索方式）
    if (sym) {
      const cashtagQuery = `$${sym}`;
      searchQueries.push(cashtagQuery);
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: cashtagQuery,
          product: 'Top',
          maxResults: 40,
          excludeReplies: true,
          excludeRetweets: true,
          minLikes: 3,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    // 搜索策略 2：合约地址前缀（抓取分享合约地址的推文）
    if (contractAddress && contractAddress.length >= 10) {
      const caPrefix = contractAddress.slice(0, 10);
      searchQueries.push(caPrefix);
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: caPrefix,
          product: 'Top',
          maxResults: 20,
          excludeReplies: true,
          excludeRetweets: true,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    // 搜索策略 3：代币名称（补充搜索，仅名称较独特时使用）
    if (name && name.length >= 4 && name.toLowerCase() !== sym.toLowerCase()) {
      searchQueries.push(name);
      searchPromises.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: name,
          product: 'Top',
          maxResults: 20,
          excludeReplies: true,
          excludeRetweets: true,
          minLikes: 5,
          sinceDate: sinceDateStr,
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    const responses = await Promise.allSettled(searchPromises);

    // 合并、去重
    const seenIds = new Set();
    let allTweets = [];
    for (const r of responses) {
      if (r.status === 'fulfilled') {
        const tweets = r.value?.data || [];
        for (const t of tweets) {
          if (t.id && !seenIds.has(t.id)) {
            seenIds.add(t.id);
            allTweets.push(t);
          }
        }
      }
    }

    // 过滤：营销号检测
    allTweets = allTweets.filter(t => !isLikelyShill(t));

    // 过滤：相关性检查（推文必须实际提及该代币）
    if (contractAddress || (sym && sym.length <= 5)) {
      allTweets = allTweets.filter(t =>
        isRelevantToToken(t, { symbol: sym, name, contractAddress })
      );
    }

    // 按综合质量分排序
    allTweets.sort((a, b) => tweetQualityScore(b) - tweetQualityScore(a));

    allTweets = allTweets.slice(0, 10);

    const tweetList = allTweets.map(t => ({
      id: t.id,
      text: t.text,
      userName: t.userName || t.userScreenName,
      userScreenName: t.userScreenName,
      userAvatar: t.userProfileImageUrl || t.userAvatar || '',
      userFollowers: t.userFollowersCount || 0,
      userVerified: t.userVerified || false,
      likes: t.favoriteCount || 0,
      retweets: t.retweetCount || 0,
      replies: t.replyCount || 0,
      createdAt: t.createdAt,
      mediaUrls: (t.media || []).map(m => m.media_url_https || m.url).filter(Boolean),
      qualityScore: Math.round(tweetQualityScore(t)),
    }));

    const result = {
      tweets: tweetList,
      searchQueries,
      updatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[6551] 获取热门推特失败:', e?.message);
    return { tweets: [], updatedAt: null, error: e?.message };
  }
}

/**
 * 批量预取代币叙事和推文（用于榜单更新后的后台任务）
 * 控制并发，避免触发 API rate limit
 *
 * @param {Array<{token: string, symbol: string, name: string}>} tokens
 * @param {object} [options]
 * @param {boolean} [options.fetchTweets=false] 是否同时预取推文（更贵）
 * @param {number} [options.concurrency=2] 并发数
 * @param {number} [options.delayMs=3000] 批次间延迟（毫秒）
 */
export async function batchPrefetch(tokens, options = {}) {
  const {
    fetchTweets = false,
    concurrency = 2,
    delayMs = 3000,
  } = options;

  const results = { narratives: 0, tweets: 0, errors: 0 };

  for (let i = 0; i < tokens.length; i += concurrency) {
    const batch = tokens.slice(i, i + concurrency);
    const promises = batch.map(async (t) => {
      try {
        await getTokenNarrative(t.symbol, t.name, { contractAddress: t.token });
        results.narratives++;

        if (fetchTweets) {
          await getTokenHotTweets(t.symbol, {
            contractAddress: t.token,
            symbol: t.symbol,
            name: t.name,
          });
          results.tweets++;
        }
      } catch (e) {
        results.errors++;
        console.error(`[预取] ${t.symbol} 失败:`, e?.message);
      }
    });

    await Promise.allSettled(promises);

    if (i + concurrency < tokens.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}
