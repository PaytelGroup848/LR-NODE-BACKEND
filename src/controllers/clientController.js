const LicenseKey = require('../models/LicenseKey');
const { successResponse } = require('../utils/responseFormatter');
const { getPagination, buildPaginationResponse } = require('../utils/pagination');

const listKeys = async (req, res, next) => {
  try {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(req.query);
    const filter = { assignedToClient: req.user._id };
    const [keys, total] = await Promise.all([
      LicenseKey.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).select('key status expiresAt issuedAt').lean(),
      LicenseKey.countDocuments(filter),
    ]);
    res.json(successResponse(buildPaginationResponse(keys, total, page, limit)));
  } catch (err) {
    next(err);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const keys = await LicenseKey.find({ assignedToClient: req.user._id }).select('key status expiresAt issuedAt').lean();
    res.json(successResponse({ keys }));
  } catch (err) {
    next(err);
  }
};

module.exports = { listKeys, getDashboard };
