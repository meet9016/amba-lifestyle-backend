const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Payload Too Large (e.g. body-parser limit)
  if (err.type === 'entity.too.large' || statusCode === 413) {
    statusCode = 413;
    message = 'Image payload size is too large. Please upload an image under 10MB.';
  }

  // Handle Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with id: ${err.value}`;
  }

  // Handle Zod Error
  if (err.name === 'ZodError' || (err.issues && Array.isArray(err.issues))) {
    statusCode = 400;
    const issues = err.issues || err.errors || [];
    message = issues[0]?.message || 'Validation failed';
    errors = issues.map(i => ({ field: (i.path || []).join('.'), message: i.message }));
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered: ${field}`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please log in again.';
  }

  return ApiResponse.error(
    res,
    message,
    process.env.NODE_ENV === 'development' ? { stack: err.stack, errors } : errors,
    statusCode
  );
};

module.exports = {
  notFound,
  errorHandler
};

