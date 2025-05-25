const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const eventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  image: { type: String },
  eventLanguage: { type: String, required: true },
  eventDuration: { type: String, required: true },
  eventArtist: [{
    artist: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true }
  }],
  eventVenue: { type: String, required: true },
  eventAbout: { type: String, required: true },
  eventDate: { type: Date, required: true },
  eventTime: [{ type: String, required: true }],
  eventType: { type: String, required: true },

  // ✅ GeoJSON location format
  location: {
    type: {
      type: String,
      enum: ['Point'], // GeoJSON type
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  }

}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

eventSchema.plugin(uniqueValidator);

// ✅ Add 2dsphere index
eventSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.event || mongoose.model('event', eventSchema);
