class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static created(res, message = 'Created successfully', data = null) {
    return this.success(res, message, data, 201);
  }

  static error(res, message = 'Something went wrong', errors = null, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  static paginated(res, message = 'Success', data = [], pagination = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination
    });
  }
}

module.exports = ApiResponse;

