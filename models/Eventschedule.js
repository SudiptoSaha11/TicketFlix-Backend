// import the mongoose
const mongoose = require('mongoose');

// Create the movie schedule schema
const Eventschedule = new mongoose.Schema({
    eventName: { type: String, required: true },
    eventVenue: { type: [String], required: true },
  // "showTime" is now an array of objects; each object corresponds to a hall's showtimes and its ticket prices.
  EventshowTime: { 
    type: [{
      VIPPrice: { type: Number, required: true },
      MIPTicketPrice: { type: Number, required: true },
      PlatinumTicketPrice: { type: Number, required: true },
      DiamondTicketPrice: {type: Number, required: true},
      GoldTicketPrice: {type: Number, required: true},
      SilverTicketPrice: {type: Number, required: true},
      BronzeTicketPrice: {type: Number, required: true}
    }],
    required: true 
  }
});

module.exports = mongoose.model('Eventscheduleschema', Eventschedule);
