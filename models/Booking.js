const mongoose = require('mongoose');

// Define the main booking schema
const Booking = new mongoose.Schema({
  userEmail: { type: String, required: true, ref: 'User' }, // Connect using email
  Name: { type: String, required: true },

  // Added Venue and showTime fields
  Venue: { type: String, required: false },
  Time: { type: String, required: false },
  Language: { type: String, required: false },
  Format: { type: String, required: false },

  seats: [{ type: String, required: true }], // Array of seat numbers as strings
  totalAmount: { type: Number, required: true },
  bookingDate: { type: Date, required: true },

  // New status field with default value
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'], 
    default: 'pending' 
  }
});

const Project1 = mongoose.model('Project1', Booking);
module.exports = Project1;
