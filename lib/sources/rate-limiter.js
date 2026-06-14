/**
 * 简单令牌桶限流器，确保 API 调用不超过各平台速率限制
 * 线程安全：多个并发请求自动排队
 */
export class RateLimiter {
  #minInterval;
  #lastRequest;
  #queue;
  #processing;

  /**
   * @param {number} requestsPerMinute 每分钟允许的最大请求数
   */
  constructor(requestsPerMinute) {
    this.#minInterval = Math.ceil(60_000 / requestsPerMinute);
    this.#lastRequest = 0;
    this.#queue = [];
    this.#processing = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      this.#queue.push(resolve);
      this.#process();
    });
  }

  async #process() {
    if (this.#processing) return;
    this.#processing = true;
    while (this.#queue.length > 0) {
      const now = Date.now();
      const wait = this.#minInterval - (now - this.#lastRequest);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.#lastRequest = Date.now();
      const resolve = this.#queue.shift();
      resolve();
    }
    this.#processing = false;
  }
}
