const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userEmail: { type: String, index: true, required: true },

  // Reference to Movie schema
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: "movieschema" },

  // Snapshots (to avoid fetching from movie later)
  Name: String,
  poster: String,
  certification: String,

  Venue: String,
  Language: String,
  seats: [String],

  // Store date and time separately
  bookingDate: { type: String, required: true }, // e.g. "2025-09-03"
  Time: { type: String, required: true },        // e.g. "11:30 PM"
  day: String,                                   // derived: "Wednesday"

  // Custom booking ID
  bookingCode: { type: String, unique: true },

  // NEW: Payment tracking
  provider: { type: String, enum: ['stripe', 'razorpay'], required: true },
  paymentId: { type: String, required: false }, // Stripe sessionId OR Razorpay paymentId
  currency: { type: String, default: 'INR' },

  // Booking status
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },

  totals: {
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    foodTotal: { type: Number, default: 0 },
    convenienceFee: {
      baseFee: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    finalPayable: { type: Number, default: 0 }, // ✅ Verified paid amount
  },

  items: {
    food: [{
      name: String,
      quantity: Number,
      unitPrice: Number,
      lineTotal: Number,
    }],
    promo: {
      code: String,
      discount: Number,
    },
  },

}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
