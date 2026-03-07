/**
 * 6551 OpenNews + OpenTwitter 数据源
 * 提供加密新闻叙事总结和热门推特查询能力
 */

const NEWS_BASE = 'https://ai.6551.io';

function getNewsToken() {
  return (process.env.OPENNEWS_TOKEN || process.env.TWITTER_TOKEN || process.env.TOKEN_6551 || '').trim();
}

function getTwitterToken() {
  return (process.env.TWITTER_TOKEN || process.env.OPENNEWS_TOKEN || process.env.TOKEN_6551 || '').trim();
}

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

// ─── 营销号/喊单号 过滤 ────────────────────────────

const SHILL_KEYWORDS_BIO = [
  'call group', 'signal group', 'gem call', '100x', '1000x',
  'pump group', 'guaranteed profit', 'dm for', 'join our',
  'free signal', 'paid group', 'vip group', 'buy now',
  'airdrop hunter', 'giveaway', 'nfa dyor', 'moonshot',
  '💎🙌', '🚀🚀🚀', 'shill', 'promo',
];

const SHILL_KEYWORDS_TEXT = [
  'join telegram', 'join discord', 'buy now', 'don\'t miss',
  'last chance', 'guaranteed', '100x gem', '1000x',
  'presale live', 'whitelist open', 'dm me',
  'free airdrop', '🚨🚨',
];

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
  if (followers < 50) return true;
  if (friends > 0 && followers / friends < 0.05) return true;

  if (screenName.match(/bot|shill|call|signal|gem\d|pump.*alert/)) return true;

  return false;
}

// ─── 新闻叙事总结 ────────────────────────────────────

/**
 * 获取代币相关新闻并生成叙事总结
 * 多轮搜索策略：coins 筛选 → 符号关键词 → 名称关键词
 */
export async function getTokenNarrative(symbol, name, contractAddress) {
  const newsToken = getNewsToken();
  if (!newsToken) {
    return { summary: '', articles: [], updatedAt: null, error: 'OPENNEWS_TOKEN 未配置' };
  }

  const cacheKey = `narrative:${symbol}:${name || ''}`;
  const cached = cacheGet(cacheKey, NEWS_CACHE_TTL);
  if (cached) return cached;

  try {
    const searches = [];

    if (symbol) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          coins: [symbol.toUpperCase()],
          limit: 20,
          page: 1,
        }, newsToken).catch(() => ({ data: [] }))
      );
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: `$${symbol}`,
          limit: 15,
          page: 1,
        }, newsToken).catch(() => ({ data: [] }))
      );
    }
    if (name && name !== symbol) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: name,
          limit: 15,
          page: 1,
        }, newsToken).catch(() => ({ data: [] }))
      );
    }
    if (contractAddress) {
      const shortAddr = contractAddress.slice(0, 8);
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: shortAddr,
          limit: 10,
          page: 1,
        }, newsToken).catch(() => ({ data: [] }))
      );
    }

    const results = await Promise.allSettled(searches);
    const allArticles = [];
    const seenIds = new Set();

    for (const r of results) {
      const data = r.status === 'fulfilled' ? r.value?.data : null;
      if (!data) continue;
      for (const article of data) {
        if (!seenIds.has(article.id)) {
          seenIds.add(article.id);
          allArticles.push(article);
        }
      }
    }

    allArticles.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const topArticles = allArticles
      .filter(a => a.aiRating?.status === 'done' && a.aiRating?.summary)
      .slice(0, 8);

    let summary = '';
    if (topArticles.length > 0) {
      const summaries = topArticles.map(a => a.aiRating.summary).filter(Boolean);
      summary = summaries.join(' ');
      if (summary.length > 500) {
        summary = summary.slice(0, 497) + '…';
      }
    }

    const articleList = allArticles.slice(0, 10).map(a => ({
      id: a.id,
      text: a.text,
      source: a.newsType,
      link: a.link,
      score: a.aiRating?.score,
      signal: a.aiRating?.signal,
      summary: a.aiRating?.summary || a.aiRating?.enSummary || '',
      ts: a.ts,
    }));

    const result = {
      summary,
      articles: articleList,
      updatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[6551] 获取新闻叙事失败:', e?.message);
    return { summary: '', articles: [], updatedAt: null, error: e?.message };
  }
}

// ─── 热门推特 ────────────────────────────────────────

/**
 * 获取代币热门推特（过滤营销号/喊单号）
 * 多关键词搜索 + 渐进式时间窗口
 */
export async function getTokenHotTweets(keywords, options = {}) {
  const twitterToken = getTwitterToken();
  if (!twitterToken) {
    return { tweets: [], updatedAt: null, error: 'TWITTER_TOKEN 未配置' };
  }

  const keywordsArr = Array.isArray(keywords) ? keywords : [keywords];
  const cacheKey = `tweets:${keywordsArr.join(',')}`;
  const cached = cacheGet(cacheKey, TWEET_CACHE_TTL);
  if (cached) return cached;

  try {
    const today = new Date();

    const searches = [];
    for (const kw of keywordsArr) {
      if (!kw) continue;

      const sinceDate3d = new Date(today);
      sinceDate3d.setDate(sinceDate3d.getDate() - 3);

      searches.push(
        fetchJson(`${NEWS_BASE}/open/twitter_search`, {
          keywords: kw,
          product: 'Top',
          maxResults: 40,
          excludeReplies: true,
          excludeRetweets: true,
          minLikes: 3,
          sinceDate: sinceDate3d.toISOString().slice(0, 10),
        }, twitterToken).catch(() => ({ data: [] }))
      );
    }

    const results = await Promise.allSettled(searches);
    const seenIds = new Set();
    let allTweets = [];

    for (const r of results) {
      const data = r.status === 'fulfilled' ? r.value?.data : null;
      if (!data) continue;
      for (const t of data) {
        if (t.id && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          allTweets.push(t);
        }
      }
    }

    allTweets = allTweets.filter(t => !isLikelyShill(t));

    allTweets.sort((a, b) => {
      const scoreA = (a.favoriteCount || 0) + (a.retweetCount || 0) * 2 + (a.replyCount || 0) * 0.5;
      const scoreB = (b.favoriteCount || 0) + (b.retweetCount || 0) * 2 + (b.replyCount || 0) * 0.5;
      return scoreB - scoreA;
    });

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
    }));

    const result = {
      tweets: tweetList,
      updatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[6551] 获取热门推特失败:', e?.message);
    return { tweets: [], updatedAt: null, error: e?.message };
  }
}
