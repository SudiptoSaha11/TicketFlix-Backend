// controllers/Payment/razorpayController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Projectschema = require('../../models/Projectschema'); // if you still use this elsewhere
const BookingModel = require('../../models/Booking'); // ensure this path matches your project
const User = require('../../models/user');
const { sendBookingEmail } = require('../../middleware/Email'); // optional

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

let razorpay = null;
if (KEY_ID && KEY_SECRET) {
  razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  console.log('Razorpay client initialized.');
} else {
  console.warn('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set. Razorpay disabled.');
}

/**
 * Create a Razorpay order
 * Expects body: { Name, seats, food, totalAmount, bookingDate, ... }
 * Returns Razorpay order object.
 */
const createOrder = async (req, res) => {
  if (!razorpay) return res.status(500).json({ error: 'Razorpay not configured' });

  try {
    const { Name, seats = [], food = [], totalAmount, bookingDate, ...rest } = req.body;

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid totalAmount (expect number in rupees)' });
    }

    const amountPaise = Math.round(totalAmount * 100);
    const receipt = `rcpt_${Date.now()}`;

    const orderOptions = {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes: {
        metadata: JSON.stringify({ Name, seats, food, totalAmount, bookingDate, ...rest })
      }
    };

    const order = await razorpay.orders.create(orderOptions);
    return res.json(order);
  } catch (err) {
    console.error('Razorpay createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
};

/**
 * Verify the Razorpay payment after checkout (client posts razorpay_payment_id, razorpay_order_id, razorpay_signature)
 * Saves a booking (idempotent) and returns the saved booking and payment object.
 */
// inside controllers/Payment/razorpayController.js
const verifyPayment = async (req, res) => {
    if (!razorpay) return res.status(500).json({ error: 'Razorpay not configured' });
  
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing verification fields' });
    }
  
    try {
      // 1) verify signature
      const expected = crypto.createHmac('sha256', KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
  
      if (expected !== razorpay_signature) {
        console.warn('Razorpay signature mismatch', { expected, received: razorpay_signature });
        return res.status(400).json({ error: 'Invalid signature' });
      }
  
      // 2) fetch payment and order
      let payment = null;
      let order = null;
      try { payment = await razorpay.payments.fetch(razorpay_payment_id); }
      catch (e) { console.warn('Could not fetch payment:', e && e.message); }
  
      try { order = await razorpay.orders.fetch(razorpay_order_id); }
      catch (e) { console.warn('Could not fetch order:', e && e.message); }
  
      // 3) parse metadata (order.notes.metadata)
      let metadata = null;
      if (order && order.notes && order.notes.metadata) {
        try {
          metadata = JSON.parse(order.notes.metadata);
        } catch (e) {
          console.warn('Invalid JSON in order.notes.metadata', e && e.message);
          metadata = null;
        }
      }
  
      // LOG metadata for debugging if required fields missing
      const missingFieldsForDebug = [];
      const requiredKeys = ['userEmail', 'bookingDate', 'Time', 'seats', 'Name'];
      if (!metadata) {
        console.warn('verifyPayment: metadata missing on order.notes.metadata. order.notes:', order && order.notes);
      } else {
        for (const k of requiredKeys) if (!metadata[k]) missingFieldsForDebug.push(k);
        if (missingFieldsForDebug.length) {
          console.warn('verifyPayment: metadata lacks keys:', missingFieldsForDebug, 'metadata:', metadata);
        }
      }
  
      // 4) amount authoritative
      let amountRupees = null;
      let currency = (payment && payment.currency) || (order && order.currency) || 'INR';
  
      if (payment && typeof payment.amount === 'number') {
        amountRupees = Number(payment.amount) / 100;
      } else if (metadata && metadata.totalAmount != null) {
        const parsed = Number(metadata.totalAmount);
        amountRupees = Number.isFinite(parsed) ? parsed : null;
      }
      if (amountRupees == null) amountRupees = 0;
  
      // 5) userEmail resolution
      const userEmail = (metadata && (metadata.userEmail || metadata.email)) ||
                        (payment && (payment.email || payment.contact)) || '';
  
      // 6) normalize seats array
      const details = metadata || {};
      const seatsArray = Array.isArray(details.seats)
        ? details.seats.map(s => (typeof s === 'object' && s.seatNumber ? s.seatNumber : s))
        : (details.seats || []);
  
      // Provide safe fallbacks for required fields (schema requires Time & provider)
      const safeTime = details.Time || details.showTime || details.TimeSlot || '00:00';
      const safeBookingDate = details.bookingDate || details.date || (new Date()).toISOString().split('T')[0];
      const safeName = details.Name || details.movieName || details.title || 'Unknown';
      const safeVenue = details.Venue || details.venue || '';
      const safeLanguage = details.Language || details.language || '';
  
      const provider = 'razorpay';
  
      // 7) idempotency: avoid duplicate saves by payment id
      const existing = await BookingModel.findOne({ paymentId: razorpay_payment_id });
      if (existing) {
        console.log('Booking already exists for payment:', razorpay_payment_id);
        return res.status(200).json({ ok: true, message: 'Already saved', booking: existing });
      }
  
      // 8) build booking payload to match your Booking controller expectations
      const bookingPayload = {
        userEmail: userEmail || '',            // empty if unknown, validation will fail on required
        Name: safeName,
        seats: seatsArray.length ? seatsArray : [],
        totalAmount: amountRupees,
        bookingDate: safeBookingDate,
        Time: safeTime,
        Venue: safeVenue,
        Language: safeLanguage,
        status: 'confirmed',
        promo: details.promo || undefined,
        food: details.food || [],
        summary: {
          subtotal: Number(details.subtotal) || 0,
          foodTotal: Number(details.foodTotal) || 0,
          convenienceFee: details.convenienceFee || { baseFee: 0, tax: 0, total: 0 },
          finalPayable: amountRupees,
        },
        sessionId: razorpay_payment_id, // store as reference
        currency: currency,
        provider,
      };
  
      // 9) If required fields are missing (e.g. userEmail or Time) we should either:
      //    - return an error so caller can fix metadata creation, or
      //    - supply defaults and still save. We'll try to save but log missing required fields.
      const requiredMissing = [];
      if (!bookingPayload.userEmail) requiredMissing.push('userEmail');
      if (!bookingPayload.Time) requiredMissing.push('Time');
      if (!bookingPayload.seats || bookingPayload.seats.length === 0) requiredMissing.push('seats');
  
      if (requiredMissing.length) {
        // Important: you can change this to return 400 and force metadata fix.
        console.warn('verifyPayment: required booking fields missing, attempting save with fallbacks. Missing:', requiredMissing);
        // continue so we create a record; but you'll see validation error if the schema requires these.
      }
  
      // 10) save booking
      const newBooking = new BookingModel({
        userEmail: bookingPayload.userEmail,
        movieId: details.movieId || details.movie_id || undefined,
        Name: bookingPayload.Name,
        poster: details.poster || null,
        certification: details.certification || null,
        Venue: bookingPayload.Venue,
        Time: bookingPayload.Time,
        Language: bookingPayload.Language,
        seats: bookingPayload.seats,
        bookingDate: bookingPayload.bookingDate,
        day: (() => { const dt = new Date(bookingPayload.bookingDate + ' ' + (bookingPayload.Time || '00:00')); const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]; return isNaN(dt.getTime()) ? undefined : days[dt.getDay()]; })(),
        bookingCode: formatBookingId(new mongoose.Types.ObjectId().toString()),
        status: 'confirmed',
        provider: provider,
        currency,
        totals: {
          subtotal: bookingPayload.summary.subtotal,
          discount: bookingPayload.promo?.discount || 0,
          foodTotal: bookingPayload.summary.foodTotal,
          convenienceFee: bookingPayload.summary.convenienceFee,
          finalPayable: bookingPayload.summary.finalPayable,
        },
        items: {
          food: bookingPayload.food,
          promo: bookingPayload.promo ? { code: bookingPayload.promo.code || bookingPayload.promo, discount: Number(bookingPayload.promo?.discount || 0) } : undefined
        },
        paymentId: razorpay_payment_id,
      });
  
      try {
        const saved = await newBooking.save();
        const populated = await BookingModel.findById(saved._id).populate('movieId', 'movieName image movieCensor');
        if (typeof sendBookingEmail === 'function') {
          try { await sendBookingEmail(populated); } catch (emailErr) { console.warn('sendBookingEmail error', emailErr); }
        }
        console.log('Booking saved after Razorpay verifyPayment.');
        return res.status(200).json({ ok: true, payment, booking: populated });
      } catch (saveErr) {
        // Biggest improvement: log the validation error details so you can fix metadata
        console.error('DB save failed after verifyPayment:', saveErr);
        // don't return 500 that would break Razorpay flow — but return an explicit message
        return res.status(200).json({ ok: false, note: 'Payment verified but DB save failed', error: saveErr.message });
      }
  
    } catch (err) {
      console.error('verifyPayment error:', err);
      return res.status(500).json({ error: 'Server error during verification' });
    }
  };
  

/**
 * Webhook handler for Razorpay events (expects raw body and X-Razorpay-Signature header)
 * NOTE: You must mount this route with bodyParser.raw({ type: 'application/json' }) or equivalent.
 */
const webhookHandler = async (req, res) => {
  if (!WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET not set.');
    return res.status(500).send('Webhook secret not configured');
  }

  // req.body must be Buffer when using bodyParser.raw
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

  const signature = req.headers['x-razorpay-signature'] || '';
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  if (expected !== signature) {
    console.warn('Razorpay webhook signature mismatch.');
    return res.status(400).send('Invalid signature');
  }

  let payload;
  try { payload = JSON.parse(rawBody.toString()); }
  catch (e) {
    console.error('Invalid JSON in webhook body', e);
    return res.status(400).send('Invalid JSON');
  }

  try {
    const event = payload.event;
    if (event === 'payment.captured') {
      const payment = payload.payload?.payment?.entity;
      if (payment?.order_id) {
        try {
          const order = await razorpay.orders.fetch(payment.order_id);
          if (order?.notes?.metadata) {
            const details = JSON.parse(order.notes.metadata);
            const seats = Array.isArray(details.seats) ? details.seats.map(s => (typeof s === 'object' && s.seatNumber ? s.seatNumber : s)) : [];
            const screenProduct = new Projectschema({
              userEmail: details.userEmail || details.email || '',
              movieName: details.Name || details.movieName || '',
              hall: details.hall,
              showTime: details.Time || details.showTime,
              seatsBooked: seats,
              totalAmount: details.totalAmount || (payment.amount / 100),
              bookingDate: details.bookingDate ? new Date(details.bookingDate) : new Date(),
              status: 'confirmed'
            });
            await screenProduct.save();
            console.log('Booking saved via webhook (payment.captured).');
          }
        } catch (e) {
          console.error('Webhook: failed to fetch order or save booking:', e);
        }
      }
    } else {
      console.log('Unhandled Razorpay webhook event:', event);
    }
  } catch (err) {
    console.error('Error handling webhook payload:', err);
  }

  return res.status(200).json({ received: true });
};

/**
 * Get payment detail by id (used by SuccessPage to fetch authoritative amount)
 * route: GET /api/razorpay/payment/:id
 */
const getPayment = async (req, res) => {
  if (!razorpay) return res.status(500).json({ error: 'Razorpay not configured' });
  const id = req.params.id || req.params.paymentId || null;
  if (!id) return res.status(400).json({ error: 'Missing payment id' });

  try {
    const payment = await razorpay.payments.fetch(id);
    return res.json(payment);
  } catch (err) {
    console.error('getPayment error:', err && err.message ? err.message : err);
    // Map Razorpay 404 to 404
    if (err && err.statusCode === 404) return res.status(404).json({ error: 'Payment not found' });
    return res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

module.exports = { createOrder, verifyPayment, webhookHandler, getPayment };
