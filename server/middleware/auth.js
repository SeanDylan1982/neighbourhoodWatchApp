const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select('email role isActive neighbourhoodId');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      neighbourhoodId: user.neighbourhoodId
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

const requireNeighbourhood = async (req, res, next) => {
  try {
    if (!req.user.neighbourhoodId) {
      return res.status(400).json({ message: 'User must be assigned to a neighbourhood' });
    }

    // Verify neighbourhood exists and is active
    const Neighbourhood = require('../models/Neighbourhood');
    const neighbourhood = await Neighbourhood.findById(req.user.neighbourhoodId).select('isActive');

    if (!neighbourhood || !neighbourhood.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive neighbourhood' });
    }

    next();
  } catch (error) {
    console.error('Neighbourhood middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireNeighbourhood
};