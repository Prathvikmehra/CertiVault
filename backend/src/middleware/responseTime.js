/**
 * responseTime.js — Response-time middleware.
 *
 * Adds an `X-Response-Time` header to every response, containing the
 * number of milliseconds elapsed between the server receiving the request
 * and the response being sent.
 *
 * Register this middleware early in the chain, immediately after requestId,
 * so the timer starts before any other processing.
 *
 * Example response header:
 *   X-Response-Time: 4ms
 *
 * Implementation note: `res.end()` is wrapped (rather than listening to the
 * "finish" event) because the "finish" event fires after headers have already
 * been flushed to the client, making it too late to call `setHeader`.
 */

export const responseTime = (_req, res, next) => {
  const startAt = process.hrtime.bigint();

  const originalEnd = res.end.bind(res);

  res.end = (...args) => {
    const elapsed = process.hrtime.bigint() - startAt;
    const ms = Number(elapsed / 1_000_000n);
    res.setHeader("X-Response-Time", `${ms}ms`);
    return originalEnd(...args);
  };

  next();
};
