/**
 * 6551 OpenNews + OpenTwitter 数据源（增强版）
 *
 * 叙事总结：多策略搜索（coin symbol、名称、meme 引擎、cashtag），
 *          结果去重、AI 评分排序、情绪分析
 * 热门推特：cashtag ($SYMBOL) + 合约地址前缀多维搜索，
 *          相关性过滤、KOL 加权、增强营销号检测
 *
 * 成本优化：
 *   - 内存缓存（叙事 30min，推文 60min）
 *   - Supabase 持久化缓存由调用方（server.js）管理
 *   - 批量预取支持
 */

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

// ─── 营销号/喊单号 过滤（增强版）──────────────────────

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

const SHILL_NAME_PATTERNS = /bot|shill|call|signal|gem|pump|alert|airdrop|promo|giveaway/i;

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

  const followers = tweet.userFollowersCount || 0;
  const friends = tweet.userFriendsCount || 1;
  if (followers < 100) return true;
  if (friends > 0 && followers / friends < 0.1) return true;

  if (SHILL_NAME_PATTERNS.test(screenName)) return true;

  const textLen = text.length;
  if (textLen > 0) {
    const emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > textLen * 0.15) return true;
  }

  return false;
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

    const result = {
      summary,
      articles: articleList,
      sentiment,
      sourceCount: allArticles.length,
      updatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[6551] 获取新闻叙事失败:', e?.message);
    return { summary: '', articles: [], sentiment: 'neutral', updatedAt: null, error: e?.message };
  }
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
