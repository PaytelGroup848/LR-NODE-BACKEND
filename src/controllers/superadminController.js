const User = require('../models/User');
const LicenseKey = require('../models/LicenseKey');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { getPagination, buildPaginationResponse } = require('../utils/pagination');
const { generateBulkKeys } = require('../services/keyGenerator');
const { sendSingleKeyEmail, sendBulkKeysEmail } = require('../services/emailService');

const createClient = async (req, res, next) => {
  try {
    const { representativeName, companyName, phone, email, address, gstNumber, salesRepresentativeName, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json(errorResponse('Passwords do not match'));
    }
    const existingUser = await User.exists({ email });
    if (existingUser) {
      return res.status(400).json(errorResponse('Email already in use'));
    }
    const client = new User({
      representativeName,
      companyName,
      phone,
      email,
      address,
      gstNumber,
      salesRepresentativeName,
      passwordHash: password,
      role: 'SUPERADMIN_CLIENT',
      createdBy: req.user._id,
    });
    await client.save();
    res.status(201).json(successResponse(client.toObject()));
  } catch (err) {
    next(err);
  }
};

const listClients = async (req, res, next) => {
  try {
    const { page, limit, skip, search, status, sortBy, sortOrder } = getPagination(req.query);
    const filter = { role: 'SUPERADMIN_CLIENT' };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { representativeName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [clients, total] = await Promise.all([
      User.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json(successResponse(buildPaginationResponse(clients, total, page, limit)));
  } catch (err) {
    next(err);
  }
};

const getClient = async (req, res, next) => {
  try {
    const client = await User.findById(req.params.id).lean();
    if (!client || client.role !== 'SUPERADMIN_CLIENT') {
      return res.status(404).json(errorResponse('Client not found'));
    }
    res.json(successResponse(client));
  } catch (err) {
    next(err);
  }
};

const generateClientKeys = async (req, res, next) => {
  try {
    const { quantity, validityDays } = req.body;
    const client = await User.findById(req.params.id);
    if (!client || client.role !== 'SUPERADMIN_CLIENT') {
      return res.status(404).json(errorResponse('Client not found'));
    }
    const { keys } = await generateBulkKeys(
      quantity,
      validityDays,
      'superadmin_client',
      req.user._id,
      'client',
      client._id
    );
    res.status(201).json(successResponse({ keys }));
  } catch (err) {
    next(err);
  }
};

const listKeys = async (req, res, next) => {
  try {
    const { page, limit, skip, search, status, sortBy, sortOrder, expiringWithinDays } = getPagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.key = { $regex: search, $options: 'i' };
    }
    if (expiringWithinDays) {
      const now = new Date();
      const future = new Date(now);
      future.setDate(future.getDate() + expiringWithinDays);
      filter.expiresAt = { $gte: now, $lte: future };
      filter.status = { $in: ['active', 'unassigned'] };
    }
    const [keys, total] = await Promise.all([
      LicenseKey.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).populate('assignedToClient', 'representativeName email').populate('createdBy', 'representativeName email').lean(),
      LicenseKey.countDocuments(filter),
    ]);
    res.json(successResponse(buildPaginationResponse(keys, total, page, limit)));
  } catch (err) {
    next(err);
  }
};

const updateKey = async (req, res, next) => {
  try {
    const key = await LicenseKey.findByIdAndUpdate(req.params.keyId, req.body, { new: true });
    if (!key) {
      return res.status(404).json(errorResponse('Key not found'));
    }
    res.json(successResponse(key));
  } catch (err) {
    next(err);
  }
};

const suspendKey = async (req, res, next) => {
  try {
    const key = await LicenseKey.findById(req.params.keyId);
    if (!key) {
      return res.status(404).json(errorResponse('Key not found'));
    }
    key.status = 'suspended';
    await key.save();
    res.json(successResponse(key));
  } catch (err) {
    next(err);
  }
};

const unsuspendKey = async (req, res, next) => {
  try {
    const key = await LicenseKey.findById(req.params.keyId);
    if (!key) {
      return res.status(404).json(errorResponse('Key not found'));
    }
    if (key.status === 'expired') {
      return res.status(400).json(errorResponse('Cannot unsuspend expired key'));
    }
    key.status = key.assignedToClient ? 'active' : 'unassigned';
    await key.save();
    res.json(successResponse(key));
  } catch (err) {
    next(err);
  }
};

const sendKeyEmail = async (req, res, next) => {
  try {
    const key = await LicenseKey.findById(req.params.keyId).populate('assignedToClient');
    if (!key) {
      return res.status(404).json(errorResponse('Key not found'));
    }
    if (!key.assignedToClient) {
      return res.status(400).json(errorResponse('Key not assigned to client'));
    }
    await sendSingleKeyEmail(key.assignedToClient, key);
    key.emailSentAt = new Date();
    key.emailSentCount += 1;
    await key.save();
    res.json(successResponse({ message: 'Email sent' }));
  } catch (err) {
    next(err);
  }
};

const createPartner = async (req, res, next) => {
  try {
    const { representativeName, companyName, phone, email, address, gstNumber, salesRepresentativeName, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json(errorResponse('Passwords do not match'));
    }
    const existingUser = await User.exists({ email });
    if (existingUser) {
      return res.status(400).json(errorResponse('Email already in use'));
    }
    const partner = new User({
      representativeName,
      companyName,
      phone,
      email,
      address,
      gstNumber,
      salesRepresentativeName,
      passwordHash: password,
      role: 'PARTNER',
      createdBy: req.user._id,
    });
    await partner.save();
    res.status(201).json(successResponse(partner.toObject()));
  } catch (err) {
    next(err);
  }
};

const listPartners = async (req, res, next) => {
  try {
    const { page, limit, skip, search, status, sortBy, sortOrder } = getPagination(req.query);
    const filter = { role: 'PARTNER' };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { representativeName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [partners, total] = await Promise.all([
      User.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json(successResponse(buildPaginationResponse(partners, total, page, limit)));
  } catch (err) {
    next(err);
  }
};

const getPartner = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id).lean();
    if (!partner || partner.role !== 'PARTNER') {
      return res.status(404).json(errorResponse('Partner not found'));
    }
    res.json(successResponse(partner));
  } catch (err) {
    next(err);
  }
};

const generatePartnerBulkKeys = async (req, res, next) => {
  try {
    const { quantity, validityDays } = req.body;
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'PARTNER') {
      return res.status(404).json(errorResponse('Partner not found'));
    }
    const { keys, batchId } = await generateBulkKeys(
      quantity,
      validityDays,
      'partner_bulk',
      req.user._id,
      'partner_pool',
      null,
      partner._id // pass partnerId as 7th arg!
    );
    res.status(201).json(successResponse({ keys, batchId }));
  } catch (err) {
    next(err);
  }
};

const sendPartnerBulkEmail = async (req, res, next) => {
  try {
    const { batchId } = req.body;
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'PARTNER') {
      return res.status(404).json(errorResponse('Partner not found'));
    }
    const keys = await LicenseKey.find({ batchId }).lean();
    await sendBulkKeysEmail(partner, keys);
    await LicenseKey.updateMany({ batchId }, { emailSentAt: new Date(), $inc: { emailSentCount: 1 } });
    res.json(successResponse({ message: 'Email sent' }));
  } catch (err) {
    next(err);
  }
};

const suspendPartner = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'PARTNER') {
      return res.status(404).json(errorResponse('Partner not found'));
    }
    partner.status = 'suspended';
    await partner.save();
    res.json(successResponse(partner));
  } catch (err) {
    next(err);
  }
};

const unsuspendPartner = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'PARTNER') {
      return res.status(404).json(errorResponse('Partner not found'));
    }
    partner.status = 'active';
    await partner.save();
    res.json(successResponse(partner));
  } catch (err) {
    next(err);
  }
};

const getPartnerStats = async (req, res, next) => {
  try {
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'PARTNER') {
      return res.status(404).json(errorResponse('Partner not found'));
    }
    const stats = await LicenseKey.aggregate([
      { $match: { createdBy: partner._id } },
      {
        $group: {
          _id: null,
          totalKeys: { $sum: 1 },
          usedKeys: { $sum: { $cond: [{ $ne: ['$assignedToClient', null] }, 1, 0] } },
          unusedKeys: { $sum: { $cond: [{ $eq: ['$assignedToClient', null] }, 1, 0] } },
          activeKeys: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          suspendedKeys: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          expiredKeys: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          nearestExpiry: { $min: '$expiresAt' },
        },
      },
    ]);
    res.json(successResponse(stats[0] || { totalKeys: 0, usedKeys: 0, unusedKeys: 0, activeKeys: 0, suspendedKeys: 0, expiredKeys: 0, nearestExpiry: null }));
  } catch (err) {
    next(err);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const [partnerCount, clientCount, keyStats] = await Promise.all([
      User.countDocuments({ role: 'PARTNER' }),
      User.countDocuments({ role: { $in: ['SUPERADMIN_CLIENT', 'PARTNER_CLIENT'] } }),
      LicenseKey.aggregate([
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
            expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const now = new Date();
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);
    const next30Days = new Date(now);
    next30Days.setDate(next30Days.getDate() + 30);
    const [expiring7Days, expiring30Days] = await Promise.all([
      LicenseKey.countDocuments({ expiresAt: { $gte: now, $lte: next7Days }, status: { $in: ['active', 'unassigned'] } }),
      LicenseKey.countDocuments({ expiresAt: { $gte: now, $lte: next30Days }, status: { $in: ['active', 'unassigned'] } }),
    ]);
    const stats = keyStats[0] || { active: 0, suspended: 0, expired: 0 };
    res.json(successResponse({
      partnerCount,
      clientCount,
      activeKeys: stats.active,
      suspendedKeys: stats.suspended,
      expiredKeys: stats.expired,
      expiringIn7Days: expiring7Days,
      expiringIn30Days: expiring30Days,
    }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClient,
  listClients,
  getClient,
  generateClientKeys,
  listKeys,
  updateKey,
  suspendKey,
  unsuspendKey,
  sendKeyEmail,
  createPartner,
  listPartners,
  getPartner,
  generatePartnerBulkKeys,
  sendPartnerBulkEmail,
  suspendPartner,
  unsuspendPartner,
  getPartnerStats,
  getDashboard,
};
