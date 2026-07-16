const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { listKeys, getDashboard } = require('../controllers/clientController');

router.use(requireAuth, requireRole(['SUPERADMIN_CLIENT', 'PARTNER_CLIENT']));

router.get('/dashboard', getDashboard);
router.get('/keys', listKeys);

module.exports = router;
