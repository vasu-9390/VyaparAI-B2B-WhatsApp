/**
 * Generic Zod schema validation middleware for Express
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);
      req[source] = parsed; // assign sanitized data back
      next();
    } catch (error) {
      next(error);
    }
  };
}
