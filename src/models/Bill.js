const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true, index: true },
    entityType: {
      type: String,
      enum: ['client', 'partner'],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    keyQuantity: { type: Number, required: true },
    purchasedDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true },
    amountWithoutGST: { type: Number, required: true },
    gstRate: { type: Number, default: 18 },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    batchId: { type: String, index: true },
    keyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LicenseKey' }],
    status: {
      type: String,
      enum: ['generated', 'sent'],
      default: 'generated',
    },
    emailSentAt: { type: Date, default: null },
    emailSentCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

billSchema.index({ entityId: 1, batchId: 1, billNumber: 1, createdAt: 1 });

module.exports = mongoose.model('Bill', billSchema, 'lr_bills');
