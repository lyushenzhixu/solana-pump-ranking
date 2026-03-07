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
const NEWS_CACHE_TTL = 30 * 60_000;   // 新闻缓存 30 分钟
const TWEET_CACHE_TTL = 60 * 60_000;  // 推特缓存 60 分钟

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
  'free airdrop', '🚨🚨', 'BREAKING:',
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
  if (followers < 100) return true;
  if (friends > 0 && followers / friends < 0.1) return true;

  if (screenName.match(/bot|shill|call|signal|gem|pump|alert/)) return true;

  return false;
}

// ─── 新闻叙事总结 ────────────────────────────────────

/**
 * 获取代币相关新闻并生成叙事总结
 * @param {string} symbol 代币符号
 * @param {string} [name] 代币名称（可选，用作关键词补充搜索）
 * @returns {{ summary: string, articles: Array, updatedAt: string }}
 */
export async function getTokenNarrative(symbol, name) {
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
        }, newsToken)
      );
    }
    if (name && name !== symbol) {
      searches.push(
        fetchJson(`${NEWS_BASE}/open/news_search`, {
          q: name,
          limit: 10,
          page: 1,
        }, newsToken)
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
 * @param {string} keyword 搜索关键词（代币名称或符号）
 * @param {object} [options]
 * @returns {{ tweets: Array, updatedAt: string }}
 */
export async function getTokenHotTweets(keyword, options = {}) {
  const twitterToken = getTwitterToken();
  if (!twitterToken) {
    return { tweets: [], updatedAt: null, error: 'TWITTER_TOKEN 未配置' };
  }

  const cacheKey = `tweets:${keyword}`;
  const cached = cacheGet(cacheKey, TWEET_CACHE_TTL);
  if (cached) return cached;

  try {
    const today = new Date();
    const sinceDate = new Date(today);
    sinceDate.setDate(sinceDate.getDate() - 1);
    const sinceDateStr = sinceDate.toISOString().slice(0, 10);

    const searchParams = {
      keywords: keyword,
      product: 'Top',
      maxResults: 50,
      excludeReplies: true,
      excludeRetweets: true,
      minLikes: 5,
      sinceDate: sinceDateStr,
    };

    const resp = await fetchJson(
      `${NEWS_BASE}/open/twitter_search`,
      searchParams,
      twitterToken
    );

    let tweets = resp?.data || [];

    tweets = tweets.filter(t => !isLikelyShill(t));

    tweets.sort((a, b) => {
      const scoreA = (a.favoriteCount || 0) * 1 + (a.retweetCount || 0) * 2 + (a.replyCount || 0) * 0.5;
      const scoreB = (b.favoriteCount || 0) * 1 + (b.retweetCount || 0) * 2 + (b.replyCount || 0) * 0.5;
      return scoreB - scoreA;
    });

    tweets = tweets.slice(0, 10);

    const tweetList = tweets.map(t => ({
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
