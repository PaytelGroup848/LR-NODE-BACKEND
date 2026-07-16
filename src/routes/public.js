const express = require('express');
const router = express.Router();
const { publicRateLimiter } = require('../middleware/rateLimiter');
const { validateKey } = require('../controllers/publicController');

router.post('/keys/validate', publicRateLimiter, validateKey);

module.exports = router;
