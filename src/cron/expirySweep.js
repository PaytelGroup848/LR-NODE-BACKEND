const cron = require('node-cron');
const LicenseKey = require('../models/LicenseKey');

const startExpirySweep = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      const result = await LicenseKey.updateMany(
        { status: 'active', expiresAt: { $lt: now } },
        { status: 'expired' }
      );
      console.log(`Expiry sweep completed: ${result.modifiedCount} keys expired`);
    } catch (err) {
      console.error('Error in expiry sweep:', err);
    }
  });
  console.log('Expiry sweep cron job started');
};

module.exports = startExpirySweep;
