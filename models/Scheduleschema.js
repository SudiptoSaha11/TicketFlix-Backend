// import the mongoose
const mongoose = require('mongoose');

// Create the movie schedule schema
const scheduleSchema = new mongoose.Schema({
  MovieName: { type: String, required: true },
  hallName: { type: [String], required: true },
  // "showTime" is now an array of objects; each object corresponds to a hall's showtimes and its ticket prices.
  showTime: { 
    type: [{
      time: { type: [String], required: true },
      GoldTicketPrice: { type: Number, required: true },
      SilverTicketPrice: { type: Number, required: true },
      PlatinumTicketPrice: { type: Number, required: true }
    }],
    required: true 
  }
});

module.exports = mongoose.model('Scheduleschema', scheduleSchema);
