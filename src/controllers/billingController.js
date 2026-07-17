const Bill = require('../models/Bill');
const User = require('../models/User');
const LicenseKey = require('../models/LicenseKey');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { getPagination, buildPaginationResponse } = require('../utils/pagination');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const { sendInvoiceEmail } = require('../services/emailService');

const generateBillNumber = async () => {
  const year = new Date().getFullYear();
  // Find the last bill of the current year to get the sequence number
  const lastBill = await Bill.findOne({ billNumber: { $regex: `^LR-INV-${year}-` } })
    .sort({ createdAt: -1 })
    .lean();

  let nextSeq = 1;
  if (lastBill) {
    const match = lastBill.billNumber.match(/LR-INV-(\d{4})-(\d+)/);
    if (match) {
      nextSeq = parseInt(match[2]) + 1;
    }
  }

  // Pad sequence number with leading zeros (e.g., 001, 002)
  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `LR-INV-${year}-${paddedSeq}`;
};

const generateUniqueKey = async () => {
  let key;
  let collision = true;
  let attempts = 0;
  while (collision && attempts < 10) {
    const part1 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(4).toString('hex').toUpperCase();
    key = `LR-${part1}-${part2}`;
    const existing = await LicenseKey.exists({ key });
    if (!existing) {
      collision = false;
    }
    attempts++;
  }
  if (collision) throw new Error('Failed to generate unique key after multiple attempts');
  return key;
};

const generateBill = async (req, res, next) => {
  try {
    const { entityType, entityId, username, keyQuantity, purchasedDate, renewalDate, amountWithoutGST } = req.body;

    // Validate entity
    const entity = await User.findById(entityId).lean();
    if (!entity) {
      return res.status(404).json(errorResponse('Entity not found'));
    }

    if (entityType === 'client' && entity.role !== 'SUPERADMIN_CLIENT') {
      return res.status(400).json(errorResponse('Invalid client entity'));
    }
    if (entityType === 'partner' && entity.role !== 'PARTNER') {
      return res.status(400).json(errorResponse('Invalid partner entity'));
    }

    // Calculate validity days
    const purchasedDateObj = new Date(purchasedDate);
    const renewalDateObj = new Date(renewalDate);
    const validityDays = Math.ceil((renewalDateObj - purchasedDateObj) / (1000 * 60 * 60 * 24));

    // Generate keys
    const batchId = uuidv4();
    const keys = [];
    const keyDocs = [];

    for (let i = 0; i < keyQuantity; i++) {
      const keyStr = await generateUniqueKey();
      const keyDoc = new LicenseKey({
        key: keyStr,
        validityDays,
        issuedAt: purchasedDateObj,
        expiresAt: renewalDateObj,
        status: entityType === 'client' ? 'active' : 'unassigned',
        ownerType: entityType === 'client' ? 'client' : 'partner_pool',
        assignedToClient: entityType === 'client' ? entityId : null,
        partnerId: entityType === 'partner' ? entityId : null,
        generatedFor: entityType === 'client' ? 'superadmin_client' : 'partner_bulk',
        createdBy: req.user._id,
        batchId,
      });
      keys.push(keyStr);
      keyDocs.push(keyDoc);
    }

    // Save keys to DB
    const createdKeys = await LicenseKey.insertMany(keyDocs);

    // Calculate GST
    const gstRate = 18;
    const gstAmount = (amountWithoutGST * gstRate) / 100;
    const totalAmount = amountWithoutGST + gstAmount;

    // Generate bill number
    const billNumber = await generateBillNumber();

    // Create bill record
    const bill = new Bill({
      billNumber,
      entityType,
      entityId,
      username,
      keyQuantity,
      purchasedDate: purchasedDateObj,
      renewalDate: renewalDateObj,
      amountWithoutGST,
      gstRate,
      gstAmount,
      totalAmount,
      batchId,
      keyIds: createdKeys.map(k => k._id),
      createdBy: req.user._id,
    });

    const savedBill = await bill.save();

    res.status(201).json(successResponse({
      bill: savedBill.toObject(),
      keys,
    }));
  } catch (err) {
    next(err);
  }
};

const listBills = async (req, res, next) => {
  try {
    const { page, limit, skip, search, entityType, status } = getPagination(req.query);
    const filter = {};

    if (entityType) {
      filter.entityType = entityType;
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('entityId', 'representativeName companyName email')
        .lean(),
      Bill.countDocuments(filter),
    ]);

    res.json(successResponse(buildPaginationResponse(bills, total, page, limit)));
  } catch (err) {
    next(err);
  }
};

const getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('entityId', 'representativeName companyName email')
      .populate('keyIds')
      .lean();

    if (!bill) {
      return res.status(404).json(errorResponse('Bill not found'));
    }

    res.json(successResponse(bill));
  } catch (err) {
    next(err);
  }
};

const getBillPDF = async (req, res, next) => {
  try {
    const { mode } = req.query; // 'view' or 'download'
    const bill = await Bill.findById(req.params.id)
      .populate('entityId')
      .lean();

    if (!bill) {
      return res.status(404).json(errorResponse('Bill not found'));
    }

    const keys = await LicenseKey.find({ batchId: bill.batchId }).lean();
    const pdfBuffer = await generateInvoicePDF(bill, bill.entityId, keys);

    const filename = `Invoice_${bill.billNumber}.pdf`;
    const disposition = mode === 'view' ? 'inline' : 'attachment';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

const sendBillEmail = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('entityId')
      .lean();

    if (!bill) {
      return res.status(404).json(errorResponse('Bill not found'));
    }

    const keys = await LicenseKey.find({ batchId: bill.batchId }).lean();
    const pdfBuffer = await generateInvoicePDF(bill, bill.entityId, keys);

    // Send email
    await sendInvoiceEmail(bill.entityId.email, bill, pdfBuffer);

    // Update bill status
    await Bill.findByIdAndUpdate(req.params.id, {
      status: 'sent',
      emailSentAt: new Date(),
      $inc: { emailSentCount: 1 },
    });

    res.json(successResponse({ message: 'Invoice email sent successfully' }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateBill,
  listBills,
  getBill,
  getBillPDF,
  sendBillEmail,
};
