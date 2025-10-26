// controllers/bookingController.js
const mongoose = require('mongoose');
require('dotenv').config();
const Stripe = require('stripe');
const Razorpay = require('razorpay');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const Product1 = require('../../models/Movieschema'); // movie model
const Product5 = require('../../models/Booking'); // booking model
const User = require('../../models/user'); // user model
const { sendBookingEmail } = require('../../middleware/Email'); // adjust path

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  console.log('Razorpay client initialized in Booking controller.');
} else {
  console.warn('Razorpay keys not provided in env; razorpay flow disabled on server.');
}

const formatBookingId = (id) => {
  if (!id) return "";
  const chars = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return chars.length < 7
    ? chars
    : `${chars.substring(0, 5)}${chars.substring(5, 6)}/${chars.slice(-2)}`;
};

// Create booking
const Booking = async (req, res) => {
  try {
    const {
      userEmail,
      Name,
      seats,
      totalAmount,
      bookingDate, // "2025-09-03" (string) or date-like
      Time,        // "11:30 PM"
      Venue,
      Language,
      status,
      promo,
      food = [],
      summary = {},
      sessionId,   // used for Stripe session or may contain razorpay id if frontend sets so
      movieId,
      provider,    // expected: 'stripe' or 'razorpay' (frontend should send when available)
      paymentId,   // optional explicit razorpay payment id
    } = req.body;

    // Basic validation
    if (!userEmail) return res.status(400).json({ error: "User email is required" });

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ error: "User not found" });

    if ((!Name && !movieId) || !Array.isArray(seats) || seats.length === 0 || !bookingDate) {
      return res.status(400).json({ error: "Invalid data format (missing Name/movieId, seats or bookingDate)" });
    }
    // Accept seats array of strings or objects with seatNumber
    const normalizedSeats = seats.map(s => (typeof s === 'object' && s.seatNumber ? String(s.seatNumber) : String(s)));

    if (!normalizedSeats.every((s) => typeof s === "string")) {
      return res.status(400).json({ error: "Seats must be an array of strings" });
    }

    // derive booking date/time validity
    const bookingDateTimeString = `${bookingDate} ${Time || ''}`.trim();
    const bookingDateObject = new Date(bookingDateTimeString);
    // allow bookingDate to be stored as provided (string) even if parsing fails, but compute day if possible
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = !isNaN(bookingDateObject.getTime()) ? days[bookingDateObject.getDay()] : undefined;

    // infer provider if not provided:
    const inferredProvider =
      provider ||
      (sessionId && String(sessionId).startsWith('cs_') ? 'stripe' :
        (String(paymentId || sessionId || '').startsWith('pay_') ? 'razorpay' : undefined));

    // Determine authoritative paid amount & provider-specific info
    let paidAmountRupees = Number(totalAmount) || 0;
    let currency = 'INR';
    let stripeSession = null;
    let razorpayPayment = null;
    let paymentIdSaved = null;

    // Prefer server-verified Stripe amount
    if (inferredProvider === 'stripe' && sessionId) {
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["total_details.breakdown", "line_items"],
        });
        if (stripeSession && stripeSession.payment_status !== 'paid') {
          return res.status(400).json({ error: "Payment not verified by Stripe" });
        }
        paidAmountRupees = (stripeSession.amount_total || 0) / 100;
        currency = (stripeSession.currency || 'inr').toUpperCase();
        paymentIdSaved = sessionId; // store Stripe session id
      } catch (err) {
        console.warn('Error fetching stripe session:', err && err.message);
        // fall back to client-provided amount
      }
    } else if (inferredProvider === 'razorpay' && (paymentId || sessionId)) {
      const razorPaymentId = paymentId || sessionId;
      if (!razorpay) {
        console.warn('Razorpay client not configured on server — cannot verify. Falling back to client-provided amount.');
      } else {
        try {
          razorpayPayment = await razorpay.payments.fetch(razorPaymentId);
          if (razorpayPayment && typeof razorpayPayment.amount === 'number') {
            paidAmountRupees = Number(razorpayPayment.amount) / 100;
          }
          if (razorpayPayment && razorpayPayment.currency) {
            currency = (razorpayPayment.currency || 'INR').toUpperCase();
          }
          paymentIdSaved = razorPaymentId;
        } catch (err) {
          console.warn('Could not fetch Razorpay payment:', err && err.message);
          // fall back to client-sent totalAmount
        }
      }
    } else {
      console.warn('Booking: no verified provider detected; using client-supplied totalAmount (not ideal).');
    }

    // Build food snapshot
    const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const foodSnapshot = (food || []).map((f) => ({
      name: f.beverageName || f.name || "Food Item",
      quantity: toNum(f.quantity || 1),
      unitPrice: toNum(f.price || f.unitPrice || 0),
      lineTotal: toNum(f.price || f.unitPrice || 0) * toNum(f.quantity || 1),
    }));
    const foodTotal = foodSnapshot.reduce((s, x) => s + x.lineTotal, 0);

    const subtotal = toNum(summary?.subtotal);
    const cfBase = toNum(summary?.convenienceFee?.baseFee);
    const cfTax = toNum(summary?.convenienceFee?.tax);
    const cfTot = toNum(summary?.convenienceFee?.total || cfBase + cfTax);
    const discount = toNum(promo?.discount);

    // If movieId is provided, populate details
    let movie = null;
    if (movieId) {
      movie = await Product1.findById(movieId).select("movieName image movieCensor");
      if (!movie) {
        // not fatal: we can still allow booking with Name snapshot
        console.warn('Movie not found for movieId:', movieId);
      }
    }

    // Ensure Time is present (schema requires it). Try multiple fallbacks.
    const finalTimeCandidate = (Time || summary?.Time || summary?.showTime || (bookingDateObject ? (bookingDateObject.toTimeString().split(' ')[0]) : '') || '').toString();
    const safeTime = finalTimeCandidate && finalTimeCandidate.trim() ? finalTimeCandidate : '00:00';

    // Create booking document
    const newBooking = new Product5({
      userEmail,
      movieId: movie ? movie._id : undefined,
      Name: movie ? movie.movieName : (Name || ''),
      poster: movie ? movie.image : (summary?.poster || null),
      certification: movie ? movie.movieCensor : (summary?.certification || null),

      Venue: Venue || (summary?.Venue || ''),
      Time: safeTime,
      Language: Language || (summary?.Language || ''),
      seats: normalizedSeats,
      bookingDate: bookingDate,
      day: day,
      bookingCode: formatBookingId(new mongoose.Types.ObjectId().toString()),

      status: status && ["pending", "confirmed", "cancelled"].includes(status) ? status : "confirmed",

      // make sure provider field exists (your schema apparently requires it)
      provider: inferredProvider || 'unknown',
      currency,
      totals: {
        subtotal,
        discount,
        foodTotal,
        convenienceFee: { baseFee: cfBase, tax: cfTax, total: cfTot },
        finalPayable: paidAmountRupees,
      },
      items: {
        food: foodSnapshot,
        promo: promo?.code ? { code: String(promo.code), discount } : undefined,
      },
      stripe: (inferredProvider === 'stripe' && sessionId) ? {
        sessionId,
        payment_status: stripeSession ? stripeSession.payment_status : undefined,
        amount_total: stripeSession ? stripeSession.amount_total : undefined,
        amount_subtotal: stripeSession ? stripeSession.amount_subtotal : undefined,
      } : undefined,

      // provider-agnostic payment id for reference
      paymentId: paymentIdSaved || undefined,
    });

    try {
      const result = await newBooking.save();

      // Populate movieId with correct fields
      const populatedBooking = await Product5.findById(result._id)
        .populate("movieId", "movieName image movieCensor");

      // Send confirmation email (if function exists)
      if (typeof sendBookingEmail === 'function') {
        try { await sendBookingEmail(populatedBooking); } catch (emailErr) { console.warn('sendBookingEmail error', emailErr); }
      }

      return res.status(201).json(populatedBooking);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Sorry, one or more of those seats were just taken. Please re-select." });
      }
      console.error("Error saving booking:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

  } catch (error) {
    console.error("Unexpected error in Booking controller:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// other endpoints below (unchanged but included for completeness)

const getBooking = async (req, res) => {
  try {
    const bookings = await Product5.find();
    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found' });
    }
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBookingByUserEmail = async (req, res) => {
  try {
    const { userEmail } = req.params;
    const bookings = await Product5.find({ userEmail });
    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found for this user' });
    }
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBookingById = async (req, res) => {
  try {
    const id = req.params.pid;
    const booking = await Product5.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateBookingById = async (req, res) => {
  try {
    const id = req.params.pid;
    const { userEmail, Name, seats, totalAmount, bookingDate, Venue, Time, Language, status } = req.body;

    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (!user) return res.status(404).json({ error: 'User not found' });
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (seats && (!Array.isArray(seats) || !seats.every(seat => typeof seat === 'string'))) {
      return res.status(400).json({ error: 'Seats must be an array of seat numbers (strings)' });
    }

    const updateData = {
      ...(userEmail !== undefined && { userEmail }),
      ...(Name !== undefined && { Name }),
      ...(Venue !== undefined && { Venue }),
      ...(Time !== undefined && { Time }),
      ...(Language !== undefined && { Language }),
      ...(seats !== undefined && { seats }),
      ...(totalAmount !== undefined && { totalAmount }),
      ...(bookingDate !== undefined && { bookingDate }),
      ...(status !== undefined && { status }),
    };

    const booking = await Product5.findByIdAndUpdate(id, updateData, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const updatedBooking = await Product5.findByIdAndUpdate(bookingId, { status: 'cancelled' }, { new: true });
    if (!updatedBooking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking cancelled successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteBookingById = async (req, res) => {
  try {
    const id = req.params.pid;
    const booking = await Product5.findByIdAndDelete(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/bookings/seats (unchanged)
const getBookedSeats = async (req, res) => {
  try {
    const { movieId, Venue, bookingDate, Time } = req.body;
    if (!movieId || !Venue || !bookingDate || !Time) {
      return res.status(400).json({ error: 'movieId, Venue, bookingDate, and Time are all required.' });
    }
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let docs;
    if (isoDateRegex.test(String(bookingDate))) {
      docs = await Product5.find({
        movieId,
        Venue,
        bookingDate: String(bookingDate),
        Time: { $regex: new RegExp(`^${Time}`, 'i') },
        status: 'confirmed',
      }).select('seats -_id');
    } else {
      const dateObj = new Date(bookingDate);
      if (isNaN(dateObj.getTime())) return res.status(400).json({ error: 'bookingDate must be a valid date string (YYYY-MM-DD) or valid Date.' });
      const startOfDay = new Date(dateObj); startOfDay.setUTCHours(0,0,0,0);
      const endOfDay = new Date(dateObj); endOfDay.setUTCHours(23,59,59,999);
      docs = await Product5.find({
        movieId,
        Venue,
        bookingDate: { $gte: startOfDay, $lte: endOfDay },
        Time: { $regex: new RegExp(`^${Time}`, 'i') },
        status: 'confirmed',
      }).select('seats -_id');
    }
    if (!docs.length) return res.status(200).json({ bookedSeats: [] });
    const bookedSeats = docs.flatMap(doc => doc.seats);
    return res.status(200).json({ bookedSeats });
  } catch (err) {
    console.error('Error fetching booked seats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  Booking,
  getBooking,
  getBookingByUserEmail,
  getBookingById,
  updateBookingById,
  cancelBooking,
  deleteBookingById,
  getBookedSeats,
};
