const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const {
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
} = require('../controllers/superadminController');
const {
  generateBill,
  listBills,
  getBill,
  getBillPDF,
  sendBillEmail,
} = require('../controllers/billingController');

router.use(requireAuth, requireRole(['SUPERADMIN']));

router.get('/dashboard', getDashboard);

router.post('/clients', createClient);
router.get('/clients', listClients);
router.get('/clients/:id', getClient);
router.post('/clients/:id/keys/generate', generateClientKeys);

router.get('/keys', listKeys);
router.patch('/keys/:keyId', updateKey);
router.patch('/keys/:keyId/suspend', suspendKey);
router.patch('/keys/:keyId/unsuspend', unsuspendKey);
router.post('/keys/:keyId/send-email', sendKeyEmail);

router.post('/partners', createPartner);
router.get('/partners', listPartners);
router.get('/partners/:id', getPartner);
router.post('/partners/:id/keys/generate-bulk', generatePartnerBulkKeys);
router.post('/partners/:id/keys/send-email', sendPartnerBulkEmail);
router.patch('/partners/:id/suspend', suspendPartner);
router.patch('/partners/:id/unsuspend', unsuspendPartner);
router.get('/partners/:id/stats', getPartnerStats);

// Billing Routes
router.post('/billing/generate', generateBill);
router.get('/billing', listBills);
router.get('/billing/:id', getBill);
router.get('/billing/:id/pdf', getBillPDF);
router.post('/billing/:id/send-email', sendBillEmail);

module.exports = router;
