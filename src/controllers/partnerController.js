const User = require('../models/User');
const LicenseKey = require('../models/LicenseKey');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { getPagination, buildPaginationResponse } = require('../utils/pagination');
const { sendSingleKeyEmail } = require('../services/emailService');

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
      role: 'PARTNER_CLIENT',
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
    const filter = { role: 'PARTNER_CLIENT', createdBy: req.user._id };
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

const listKeys = async (req, res, next) => {
  try {
    const { page, limit, skip, search, status, sortBy, sortOrder } = getPagination(req.query);
    const filter = { ownerType: 'partner_pool', partnerId: req.user._id }; // changed createdBy to partnerId
    if (status) filter.status = status;
    if (search) {
      filter.key = { $regex: search, $options: 'i' };
    }
    const [keys, total] = await Promise.all([
      LicenseKey.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).populate('assignedToClient', 'representativeName email').lean(),
      LicenseKey.countDocuments(filter),
    ]);
    res.json(successResponse(buildPaginationResponse(keys, total, page, limit)));
  } catch (err) {
    next(err);
  }
};

const assignKey = async (req, res, next) => {
  try {
    const { clientId } = req.body;
    const key = await LicenseKey.findById(req.params.keyId);
    if (!key || key.ownerType !== 'partner_pool' || key.partnerId.toString() !== req.user._id.toString()) { // changed createdBy to partnerId
      return res.status(404).json(errorResponse('Key not found'));
    }
    const client = await User.findById(clientId);
    if (!client || client.role !== 'PARTNER_CLIENT' || client.createdBy.toString() !== req.user._id.toString()) {
      return res.status(404).json(errorResponse('Client not found'));
    }
    key.assignedToClient = client._id;
    key.status = 'active';
    await key.save();
    res.json(successResponse(key));
  } catch (err) {
    next(err);
  }
};

const suspendKey = async (req, res, next) => {
  try {
    const key = await LicenseKey.findById(req.params.keyId);
    if (!key || key.ownerType !== 'partner_pool' || key.partnerId.toString() !== req.user._id.toString()) { // changed createdBy to partnerId
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
    if (!key || key.ownerType !== 'partner_pool' || key.partnerId.toString() !== req.user._id.toString()) { // changed createdBy to partnerId
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
    if (!key || key.ownerType !== 'partner_pool' || key.partnerId.toString() !== req.user._id.toString()) { // changed createdBy to partnerId
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

const getDashboard = async (req, res, next) => {
  try {
    const [clientCount, keyStats] = await Promise.all([
      User.countDocuments({ role: 'PARTNER_CLIENT', createdBy: req.user._id }),
      LicenseKey.aggregate([
        { $match: { ownerType: 'partner_pool', partnerId: req.user._id } }, // changed createdBy to partnerId
        {
          $group: {
            _id: null,
            totalKeys: { $sum: 1 },
            usedKeys: { $sum: { $cond: [{ $ne: ['$assignedToClient', null] }, 1, 0] } },
            unusedKeys: { $sum: { $cond: [{ $eq: ['$assignedToClient', null] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const now = new Date();
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);
    const expiringSoon = await LicenseKey.countDocuments({
      ownerType: 'partner_pool',
      partnerId: req.user._id, // changed createdBy to partnerId
      expiresAt: { $gte: now, $lte: next7Days },
      status: { $in: ['active', 'unassigned'] },
    });
    const stats = keyStats[0] || { totalKeys: 0, usedKeys: 0, unusedKeys: 0 };
    res.json(successResponse({
      clientCount,
      totalKeys: stats.totalKeys,
      usedKeys: stats.usedKeys,
      unusedKeys: stats.unusedKeys,
      expiringSoon,
    }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClient,
  listClients,
  listKeys,
  assignKey,
  suspendKey,
  unsuspendKey,
  sendKeyEmail,
  getDashboard,
};
