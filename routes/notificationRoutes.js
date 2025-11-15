const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all notifications
// @route   GET /api/v1/notifications
// @access  Private
router.get('/', async (req, res) => {
  try {
    // Placeholder for notification functionality
    res.json({
      success: true,
      data: [],
      message: 'Notification feature coming soon'
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
