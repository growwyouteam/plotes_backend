const express = require('express');
const Plot = require('../models/Plot');
const Colony = require('../models/Colony');
const { protect, authorize } = require('../middleware/auth');
const { sendSuccess, sendPaginated } = require('../middleware/responseHandler');
const { validations, handleValidationErrors, sanitizeRequest } = require('../utils/validation');

const router = express.Router();

// @desc    Get plots by colony (Public for user app)
// @route   GET /api/v1/plots/colony/:colonyId
// @access  Public
router.get('/colony/:colonyId', 
  validations.params.objectId,
  validations.query.plotFilters,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, minPrice, maxPrice, minArea, maxArea, facing } = req.query;
      
      const query = { colony: req.params.colonyId };
      
      if (status) query.status = status;
      if (facing) query.facing = facing;
      if (minPrice || maxPrice) {
        query.totalPrice = {};
        if (minPrice) query.totalPrice.$gte = minPrice;
        if (maxPrice) query.totalPrice.$lte = maxPrice;
      }
      if (minArea || maxArea) {
        query.area = {};
        if (minArea) query.area.$gte = minArea;
        if (maxArea) query.area.$lte = maxArea;
      }

      const plots = await Plot.find(query)
        .populate({ path: 'colony', select: 'name city sellers' })
        .populate('currentOwner', 'name email phone')
        .sort({ plotNumber: 1 })
        .lean();

      return sendSuccess(res, 200, 'Plots fetched', { plots });
    } catch (error) {
      console.error('Get plots by colony error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Get plot by ID (Public for user app)
// @route   GET /api/v1/plots/:id
// @access  Public
router.get('/:id', 
  validations.params.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const plot = await Plot.findById(req.params.id)
        .populate({ path: 'colony', select: 'name city address sellers' })
        .populate('currentOwner', 'name email phone')
        .populate('createdBy', 'name email')
        .lean();

      if (!plot) {
        return res.status(404).json({
          success: false,
          message: 'Plot not found'
        });
      }

      return sendSuccess(res, 200, 'Plot fetched', { plot });
    } catch (error) {
      console.error('Get plot error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// Protected routes
router.use(protect);

// @desc    Get all plots
// @route   GET /api/v1/plots
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, colony, status, search } = req.query;
    const query = {};
    if (colony) query.colony = colony;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { plotNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const plots = await Plot.find(query)
      .populate({ path: 'colony', select: 'name city sellers' })
      .populate('currentOwner', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Plot.countDocuments(query);
    const pagination = {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    };

    return sendPaginated(res, 200, 'Plots fetched', { plots }, pagination);
  } catch (error) {
    console.error('Get plots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create plot
// @route   POST /api/v1/plots
// @access  Private (Admin, Manager)
router.post('/', 
  authorize('plot_create', 'all'), 
  sanitizeRequest,
  validations.plot.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if colony exists
      const colony = await Colony.findById(req.body.colony);
      if (!colony) {
        return res.status(400).json({
          success: false,
          message: 'Colony not found'
        });
      }

      // Check if plot number already exists in this colony
      const existingPlot = await Plot.findOne({
        plotNumber: req.body.plotNumber,
        colony: req.body.colony
      });

      if (existingPlot) {
        return res.status(400).json({
          success: false,
          message: 'Plot number already exists in this colony'
        });
      }

      const plotData = {
        ...req.body,
        createdBy: req.user._id
      };

    const plot = await Plot.create(plotData);
    await plot.populate({ path: 'colony', select: 'name city sellers' });
    return sendSuccess(res, 201, 'Plot created successfully', { plot });
    } catch (error) {
      console.error('Create plot error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Update plot
// @route   PUT /api/v1/plots/:id
// @access  Private (Admin, Manager)
router.put('/:id', 
  authorize('plot_update', 'all'), 
  validations.params.objectId,
  sanitizeRequest,
  validations.plot.update,
  handleValidationErrors,
  async (req, res) => {
    try {
      const plot = await Plot.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate({ path: 'colony', select: 'name city sellers' });

      if (!plot) {
        return res.status(404).json({
          success: false,
          message: 'Plot not found'
        });
      }

    return sendSuccess(res, 200, 'Plot updated successfully', { plot });
    } catch (error) {
      console.error('Update plot error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @desc    Delete plot
// @route   DELETE /api/v1/plots/:id
// @access  Private (Admin)
router.delete('/:id', 
  authorize('plot_delete', 'all'), 
  validations.params.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const plot = await Plot.findById(req.params.id);

      if (!plot) {
        return res.status(404).json({
          success: false,
          message: 'Plot not found'
        });
      }

      // Check if plot is sold or has bookings
      if (plot.status === 'sold') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete sold plot'
        });
      }

      await plot.deleteOne();

    return sendSuccess(res, 200, 'Plot deleted successfully');
    } catch (error) {
      console.error('Delete plot error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;
