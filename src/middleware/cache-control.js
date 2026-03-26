/**
 * Cache-Control 中间件工厂
 * @param {number} maxAge  max-age 秒数（0 → no-store）
 * @param {number} [swr]   stale-while-revalidate 秒数（可选）
 * @returns Express 中间件
 */
export function cache(maxAge, swr) {
  return (_req, res, next) => {
    if (maxAge <= 0) {
      res.set('Cache-Control', 'no-store');
    } else if (swr) {
      res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
    } else {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    }
    next();
  };
}
