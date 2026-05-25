const express = require('express');
const Order = require('../models/Order');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Create order
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, notes } = req.body;

    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.price * item.quantity;
    });

    const order = new Order({
      user: req.user.id,
      items,
      shippingAddress,
      totalAmount,
      finalAmount: totalAmount,
      notes
    });

    await order.save();
    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user orders
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate('items.product');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user').populate('items.product');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status (Admin only)
router.put('/:id/status', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
