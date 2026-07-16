const app = require('./src/app');
const { connectDB } = require('./src/config');
const startExpirySweep = require('./src/cron/expirySweep');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    startExpirySweep();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
