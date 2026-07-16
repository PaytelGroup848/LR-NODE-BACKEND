const successResponse = (data) => {
  return { success: true, data };
};

const errorResponse = (message, statusCode = 400) => {
  return { success: false, error: message, statusCode };
};

module.exports = { successResponse, errorResponse };
