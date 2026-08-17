import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async Express route handler so rejected promises are forwarded to `next(err)`
 * instead of becoming an unhandled promise rejection (which crashes the whole Node process
 * in modern Node versions). Every route handler in this app should be wrapped with this.
 */
export function asyncHandler<P = Record<string, string>>(
  fn: (req: Request<P>, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler<P> {
  return (req, res, next) => {
    Promise.resolve(fn(req as Request<P>, res, next)).catch(next);
  };
}
