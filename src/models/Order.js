const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  instruction: {
    type: String,
    default: ''
  },
  orderPack: {
    type: String,
    default: ''
  },
  packagePrepared: {
    type: Boolean,
    default: false
  },
  serialNumber: {
    type: String
  },
  packageWeight: {
    type: String,
    default: 'UNKNOWN'
  },
  shipBy: {
    type: Date
  },
  paid: {
    type: Boolean,
    default: false
  },
  okToShip: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema); 