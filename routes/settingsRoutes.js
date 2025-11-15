const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get application settings
// @route   GET /api/v1/settings
// @access  Private
router.get('/', async (req, res) => {
  try {
    const settings = {
      company: {
        name: 'Jayshri Group',
        email: 'admin@jayshree.com',
        phone: '+91 9876543210',
        address: 'Jayshri Group Office, City, State',
        website: 'https://jayshrigroup.com'
      },
      features: {
        enableNotifications: true,
        enableCommissions: true,
        enableRegistry: true,
        enableReports: true
      },
      defaults: {
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Asia/Kolkata'
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update application settings
// @route   PUT /api/v1/settings
// @access  Private (Admin only)
router.put('/', authorize('settings_update', 'all'), async (req, res) => {
  try {
    // In a real application, you would save these to a database
    // For now, we'll just return the updated settings
    const updatedSettings = req.body;

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
