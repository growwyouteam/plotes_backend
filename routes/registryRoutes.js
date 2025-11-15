const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all registry records
// @route   GET /api/v1/registry
// @access  Private
router.get('/', async (req, res) => {
  try {
    // Placeholder for registry functionality
    res.json({
      success: true,
      data: [],
      message: 'Registry feature coming soon'
    });
  } catch (error) {
    console.error('Get registry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
