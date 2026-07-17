const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const LicenseKey = require('../models/LicenseKey');

const generateSingleKey = () => {
  const part1 = crypto.randomBytes(4).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LR-${part1}-${part2}`;
};

const generateUniqueKey = async () => {
  let key;
  let collision = true;
  let attempts = 0;
  while (collision && attempts < 10) {
    key = generateSingleKey();
    const existing = await LicenseKey.exists({ key });
    if (!existing) {
      collision = false;
    }
    attempts++;
  }
  if (collision) throw new Error('Failed to generate unique key after multiple attempts');
  return key;
};

const generateBulkKeys = async (quantity, validityDays, generatedFor, createdBy, ownerType, assignedToClient = null, partnerId = null) => {
  const batchId = uuidv4();
  const keys = [];
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  for (let i = 0; i < quantity; i++) {
    const keyStr = await generateUniqueKey();
    keys.push({
      key: keyStr,
      validityDays,
      issuedAt,
      expiresAt,
      status: ownerType === 'client' ? 'active' : 'unassigned',
      ownerType,
      assignedToClient,
      partnerId,
      generatedFor,
      createdBy,
      batchId,
    });
  }

  const createdKeys = await LicenseKey.insertMany(keys);
  return { keys: createdKeys, batchId };
};

module.exports = {
  generateSingleKey,
  generateUniqueKey,
  generateBulkKeys,
};
