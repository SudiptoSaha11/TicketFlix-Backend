const mongoose = require('mongoose');

// Define the main booking schema
const projectSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, ref: 'User' }, // Connect using email
  movieName: { type: String, required: true },

  // Added hall and showTime fields
  hall: { type: String, required: false },
  showTime: { type: String, required: false },

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

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
