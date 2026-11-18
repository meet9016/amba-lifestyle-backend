const { ZodError } = require('zod');
const ApiError = require('../utils/apiError');

/**
 * Zod validation middleware for Express
 * Validates req.body, req.query, or req.params against a Zod schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    const dataToValidate = schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params)
      ? { body: req.body, query: req.query, params: req.params }
      : req.body;

    const parsed = schema.parse(dataToValidate);

    if (parsed.body) {
      req.body = parsed.body;
    } else if (!schema.shape?.body && !schema.shape?.query && !schema.shape?.params) {
      req.body = parsed;
    }

    next();
  } catch (error) {
    const issues = error.issues || error.errors;
    if (issues && Array.isArray(issues)) {
      const extractedErrors = issues.map(err => ({
        field: err.path.join('.').replace(/^body\./, ''),
        message: err.message
      }));
      const firstMessage = extractedErrors[0]?.message || 'Validation Failed';
      return next(ApiError.badRequest(firstMessage, extractedErrors));
    }
    next(error);
  }
};

module.exports = validate;
