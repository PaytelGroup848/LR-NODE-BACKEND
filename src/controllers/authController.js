const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    if (user.status === 'suspended') {
      return res.status(403).json(errorResponse('Account suspended'));
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json(successResponse({ token, user: { id: user._id, role: user.role, email: user.email, representativeName: user.representativeName } }));
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
