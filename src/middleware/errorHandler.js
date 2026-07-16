const { errorResponse } = require('../utils/responseFormatter');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json(errorResponse(err.message || 'Internal server error', err.statusCode || 500));
};

module.exports = errorHandler;
