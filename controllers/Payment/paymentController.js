// controllers/Payment/paymentController.js
const stripeLib = require('stripe');
const dotenv = require('dotenv');
dotenv.config(); // safe but ideally this runs once at top of app.js
const Projectschema = require('../../models/Projectschema');

// Accept either STRIPE_SECRET_KEY or STRIPE_KEY (backwards compatible)
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY 

let stripe = null;
if (STRIPE_KEY) {
  try {
    stripe = stripeLib(STRIPE_KEY);
    console.log('Stripe initialized (key present).');
  } catch (err) {
    console.error('Stripe initialization failed:', err);
    stripe = null;
  }
} else {
  console.warn('⚠️ STRIPE_KEY / STRIPE_SECRET_KEY not set. Stripe operations disabled.');
}

// helper to return friendly 500 when stripe missing
function ensureStripe(res) {
  const msg = 'Stripe not configured on server (STRIPE_SECRET_KEY / STRIPE_KEY missing).';
  console.error(msg);
  return res.status(500).json({ error: msg });
}

const getCheckoutSession = async (req, res) => {
  if (!stripe) return ensureStripe(res);

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['line_items', 'total_details.breakdown'],
    });

    return res.json({
      id: session.id,
      currency: session.currency,
      amount_total: session.amount_total,
      amount_subtotal: session.amount_subtotal,
      total_details: session.total_details || null,
      metadata: session.metadata || {},
      line_items: session.line_items || null,
    });
  } catch (err) {
    console.error('Fetch session failed:', err);
    return res.status(502).json({ error: 'Failed to fetch checkout session' });
  }
};

const createCheckoutSession = async (req, res) => {
  if (!stripe) return ensureStripe(res);

  const { Name, seats = [], food = [], totalAmount, bookingDate, ...rest } = req.body;

  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    return res.status(400).json({ error: 'Invalid total amount' });
  }
  const amountPaise = Math.round(totalAmount * 100);

  try {
    const bookingDetails = { Name, seats, food, totalAmount, bookingDate, ...rest };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'inr',
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: `${Name} (${seats.length} ticket${seats.length !== 1 ? 's' : ''}${
              food.length ? ` + ${food.reduce((s,f)=>s+(f.quantity||1),0)} add-on(s)` : ''
            })`
          },
          unit_amount: amountPaise,
        },
        quantity: 1,
      }],
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  'http://localhost:3000/',
      metadata: {
        bookingDetails: JSON.stringify(bookingDetails),
        totalAmount: String(totalAmount)
      },
    });

    return res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe session error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

const handleWebhook = async (req, res) => {
  if (!stripe) {
    console.error('Stripe not configured; cannot process webhook.');
    return res.status(500).send('Stripe not configured');
  }
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set.');
    return res.status(500).send('Webhook secret not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    // req.body must be the raw buffer/string — see app.js wiring
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.metadata && session.metadata.bookingDetails) {
        try {
          const bookingDetails = JSON.parse(session.metadata.bookingDetails);

          // save booking (adjust model path/name)
          const screenProduct = new Projectschema({
            MovieName: bookingDetails.Name,
            seatsBooked: bookingDetails.seats,
            totalAmount: bookingDetails.totalAmount,
            bookingDate: bookingDetails.bookingDate,
          });
          await screenProduct.save();
          console.log('Booking data saved successfully (webhook).');
        } catch (err) {
          console.error('Failed to parse/save bookingDetails from webhook metadata:', err);
        }
      } else {
        console.log('checkout.session.completed without bookingDetails metadata; skipping DB save.');
      }
    } else {
      console.log('Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
  }

  return res.json({ received: true });
};

// controllers/eventController.js
const createventCheckoutSession = async (req, res) => {
  try {
    console.log('REQUEST BODY ->', JSON.stringify(req.body));

    const { userEmail = '', eventName, seatsBooked = [], totalAmount } = req.body;

    // normalize totalAmount to Number
    const total = Number(totalAmount);
    if (!eventName) return res.status(400).json({ error: 'Missing eventName' });
    if (!Array.isArray(seatsBooked) || seatsBooked.length === 0) return res.status(400).json({ error: 'No seats selected' });
    if (Number.isNaN(total) || total <= 0) return res.status(400).json({ error: 'Invalid totalAmount' });

    if (!stripe) {
      console.error('Stripe client not initialized. Check STRIPE_SECRET_KEY or attach stripe to app.');
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    // Build seat objects
    const targetTotalCents = Math.round(total * 100);
    const seatObjs = seatsBooked.map(s => {
      if (typeof s === 'string') return { name: s, unit_amount_cents: 0 };
      const name = `${s.seatType || ''}${s.seatNumber || s.name || ''}`.trim() || 'Seat';
      const price = Number(s.price) || 0;
      return { name, unit_amount_cents: price > 0 ? Math.round(price * 100) : 0 };
    });

    // Distribute remaining cents among seats with 0 price (if any)
    let remaining = targetTotalCents - seatObjs.reduce((acc, s) => acc + (s.unit_amount_cents || 0), 0);
    const zeroSeats = seatObjs.filter(s => !s.unit_amount_cents);
    if (zeroSeats.length > 0 && remaining > 0) {
      const per = Math.floor(remaining / zeroSeats.length);
      zeroSeats.forEach((s, i) => s.unit_amount_cents = per + (i === zeroSeats.length - 1 ? (remaining - per * zeroSeats.length) : 0));
    }

    const line_items = seatObjs.map(s => ({
      price_data: {
        currency: 'inr',
        product_data: { name: s.name },
        unit_amount: s.unit_amount_cents || 0
      },
      quantity: 1
    }));

    // Fix rounding diffs by adding adjustment item
    const computed = line_items.reduce((a, b) => a + (b.price_data.unit_amount || 0), 0);
    if (computed !== targetTotalCents) {
      const diff = targetTotalCents - computed;
      line_items.push({
        price_data: {
          currency: 'inr',
          product_data: { name: 'Booking adjustment' },
          unit_amount: Math.abs(diff) || 1
        },
        quantity: 1
      });
      if (diff < 0) console.warn('client seat prices exceed totalAmount by', Math.abs(diff) / 100);
    }

    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'http://localhost:3000/eventsuccess',
      cancel_url: 'http://localhost:3000/',
      metadata: {
        bookingDetails: JSON.stringify({
          type: 'event',
          userEmail,
          eventName,
          seatsBooked,
          totalAmount: total.toString(),
          bookingDate: new Date().toISOString()
        })
      }
    });

    console.log('STRIPE SESSION CREATED ->', session && session.id);
    return res.json({ id: session && session.id });
  } catch (err) {
    console.error('CREATE SESSION ERROR ->', err && err.stack || err);
    return res.status(500).json({ error: err.message || 'Failed to create session' });
  }
};


module.exports = { createCheckoutSession, getCheckoutSession, handleWebhook, createventCheckoutSession };
