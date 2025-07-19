// models/beverage.js
const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const BeverageSchema = new mongoose.Schema({
  beverageName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Soft Drink', 'Juice', 'Water', 'Coffee', 'Tea', 'Snack Combo', 'Other']
  },
  sizes: [
    {
      label: {
        type: String,
        required: true,
        enum: ['Small', 'Medium', 'Large', 'Regular', 'XL', 'Custom']
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      }
    }
  ]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Enforce unique beverageName
BeverageSchema.plugin(uniqueValidator, { message: '{PATH} must be unique.' });

module.exports = mongoose.models.Beverage || mongoose.model('Beverage', BeverageSchema);