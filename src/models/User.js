const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    representativeName: { type: String, required: true },
    companyName: { type: String },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    address: { type: String },
    gstNumber: { type: String },
    salesRepresentativeName: { type: String },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPERADMIN', 'PARTNER', 'SUPERADMIN_CLIENT', 'PARTNER_CLIENT'],
      index: true,
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema, 'lr_license_users');
