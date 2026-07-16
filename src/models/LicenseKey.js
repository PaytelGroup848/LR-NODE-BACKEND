const mongoose = require('mongoose');

const licenseKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    validityDays: { type: Number, required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'expired', 'unassigned'],
      default: 'unassigned',
      index: true,
    },
    ownerType: {
      type: String,
      enum: ['client', 'partner_pool'],
      required: true,
    },
    assignedToClient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    generatedFor: {
      type: String,
      enum: ['superadmin_client', 'partner_bulk'],
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batchId: { type: String, index: true },
    emailSentAt: { type: Date, default: null },
    emailSentCount: { type: Number, default: 0 },
    lastValidatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LicenseKey', licenseKeySchema, 'lr_license_keys');
