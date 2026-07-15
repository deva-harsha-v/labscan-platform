import { badRequest } from '../utils/errors.js';

/**
 * Validate and coerce a request part against a Zod schema.
 * @param {'body'|'query'|'params'} part
 * @param {import('zod').ZodTypeAny} schema
 */
export function validate(part, schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(badRequest('Validation failed', details));
    }
    req[part] = result.data;
    return next();
  };
}
