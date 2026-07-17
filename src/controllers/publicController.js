const LicenseKey = require('../models/LicenseKey');
const { successResponse } = require('../utils/responseFormatter');

const validateKey = async (req, res, next) => {
  try {
    const { key } = req.body;
    const keyFormatRegex = /^LR-[A-F0-9]{8}-[A-F0-9]{8}$/;
    if (!keyFormatRegex.test(key)) {
      return res.json(successResponse({ valid: false, status: 'not_found' }));
    }
    const licenseKey = await LicenseKey.findOne({ key });
    if (!licenseKey) {
      return res.json(successResponse({ valid: false, status: 'not_found' }));
    }
    licenseKey.lastValidatedAt = new Date();
    await licenseKey.save();
    if (licenseKey.status === 'active') {
      return res.json(successResponse({ valid: true, status: 'active', expiresAt: licenseKey.expiresAt }));
    } else {
      return res.json(successResponse({ valid: false, status: licenseKey.status }));
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { validateKey };