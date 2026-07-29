import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

// Generic middleware factory: validates req.body / req.query / req.params against
// a Zod schema and replaces them with the parsed (typed, coerced) result.
export const validate =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  };
