// models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userEmail:   { type: String, required: true, ref: 'User' },
  Name:        { type: String, required: true },
  Venue:       { type: String },
  Time:        { type: String },
  Language:    { type: String },
  Format:      { type: String },
  seats:       [{ type: String, required: true }],
  totalAmount: { type: Number, required: true },
  bookingDate: { type: Date,   required: true },
  status:      {
    type: String,
    enum: ['pending','confirmed','cancelled','used','rejected'],
    default: 'pending'
  }
});

// Strict unique—no sparse:
BookingSchema.index(
  { Name:1, Venue:1, bookingDate:1, Time:1, seats:1 },
  { unique: true }
);

module.exports = mongoose.model('Project1', BookingSchema);
