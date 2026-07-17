
const mongoose = require('mongoose');
const User = require('../models/User');
const LicenseKey = require('../models/LicenseKey');
require('dotenv').config();

const updateKeys = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all partner_pool keys without partnerId
    const keys = await LicenseKey.find({
      ownerType: 'partner_pool',
      partnerId: null
    });

    console.log(`Found ${keys.length} keys to update`);

    for (const key of keys) {
      // Check if createdBy is a partner
      const creator = await User.findById(key.createdBy);
      if (creator && creator.role === 'PARTNER') {
        key.partnerId = creator._id;
        await key.save();
        console.log(`Updated key ${key.key} with partnerId ${creator._id}`);
      } else {
        console.log(`Skipping key ${key.key} - creator not a partner`);
      }
    }

    console.log('Update complete');
    process.exit(0);
  } catch (err) {
    console.error('Error updating keys:', err);
    process.exit(1);
  }
};

updateKeys();
