const { errorResponse } = require('../utils/responseFormatter');

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(errorResponse('Access denied'));
    }
    next();
  };
};

module.exports = requireRole;
