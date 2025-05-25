const mongoose = require('mongoose');

// Define the main booking schema
const Eventbooking = new mongoose.Schema({
  userEmail: { type: String, required: true, ref: 'User' }, // Connect using email
  eventName: { type: String, required: true },

  // Added Venue and showTime fields
  eventVenue: { type: String, required: false },
  eventTime: { type: String, required: false },

  seatsBooked: [{ type: String, required: true }], // Array of seat numbers as strings
  totalAmount: { type: Number, required: true },
  bookingDate: { type: Date, required: true },

  // New status field with default value
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'], 
    default: 'pending' 
  }
});

const Project1 = mongoose.model('Project1', Eventbooking);
module.exports = Project1;
