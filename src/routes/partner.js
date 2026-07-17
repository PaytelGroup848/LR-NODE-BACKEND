const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const {
  createClient,
  listClients,
  listKeys,
  assignKey,
  suspendKey,
  unsuspendKey,
  sendKeyEmail,
  getDashboard,
} = require('../controllers/partnerController');

router.use(requireAuth, requireRole(['PARTNER']));

router.get('/dashboard', getDashboard);
router.post('/clients', createClient);
router.get('/clients', listClients);
router.get('/keys', listKeys);
router.patch('/keys/:keyId/assign', assignKey);
router.patch('/keys/:keyId/suspend', suspendKey);
router.patch('/keys/:keyId/unsuspend', unsuspendKey);
router.post('/keys/:keyId/send-email', sendKeyEmail);

module.exports = router;
