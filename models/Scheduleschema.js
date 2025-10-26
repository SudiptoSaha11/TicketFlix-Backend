// models/Scheduleschema.js
const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  at: {
    type: String, // "HH:mm" 24h
    required: true,
    validate: { validator: v => /^\d{2}:\d{2}$/.test(v), message: 'Use HH:mm' }
  },
  RoyalTicketPrice: { type: Number, required: true, min: 0 },
  ClubTicketPrice: { type: Number, required: true, min: 0 },
  ExecutiveTicketPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const showSchema = new mongoose.Schema({
  hallName: { type: String, required: true, trim: true },
  // each time has its own prices
  time: { type: [timeSlotSchema], required: true, validate: v => v.length > 0 },
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  Movie: { type: mongoose.Schema.Types.ObjectId, ref: 'movieschema', required: true },
  shows: [showSchema],
}, { timestamps: true });


module.exports = mongoose.model('Scheduleschema', scheduleSchema);
