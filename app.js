// Import modules
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file
const { check } = require('express-validator');
const cors = require('cors');
const bodyparser = require('body-parser');
const multer = require('multer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const AuthRoutes=require('./routes/Auth.routes');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Use

// Connect to your database
const connectDB = require("./db"); // Adjust the path if needed
connectDB();

// Import your movieschema model (this file now reuses the model if already compiled)
const Movie = require('./models/Movieschema');

const Event = require('./models/Event')

// For other functions (e.g. login, signup, movieProduct, etc.) from your mongoose file
const mongoPractice = require('./mongoose');


const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://ticketflix-official.netlify.app'], // Allow your local frontend and deployed frontend
  credentials: true,
}));

app.use(bodyparser.json());
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.send("Welcome to the Movie Booking API");
});

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth',AuthRoutes);

// Stripe Checkout API
app.post('/api/create-checkout-session', async (req, res) => {
  const { Name, seats = [], food = [], totalAmount } = req.body;

  // Validate totalAmount
  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    return res.status(400).json({ error: 'Invalid total amount' });
  }

  // Seat line items
  const seatItems = seats.map(seat => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: `${Name} - ${seat.seatType} ${seat.seatNumber}`,
      },
      unit_amount: Math.round(seat.price * 100),
    },
    quantity: 1,
  }));

  // Food line items (using the quantity provided)
  const foodItems = food.map(item => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: item.beverageName || 'Food Item',
      },
      unit_amount: Math.round((item.price || 0) * 100),
    },
    quantity: item.quantity || 1,    // <-- use item.quantity here
  }));

  const lineItems = [...seatItems, ...foodItems];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://ticketflix-official.netlify.app/success',
      cancel_url:  'https://ticketflix-official.netlify.app/',
      metadata: {
        bookingDetails: JSON.stringify({
          movieName: Name,
          totalAmount: totalAmount.toString(),
          bookingDate: new Date().toISOString(),
          seatCount: seats.length.toString(),
          foodCount: food.reduce((sum, f) => sum + (f.quantity || 1), 0).toString(),
        }),
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook endpoint to handle Stripe events
app.post('/webhook', bodyparser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Use environment variable for security

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const bookingDetails = JSON.parse(session.metadata.bookingDetails);

      const screenProduct = new mongoPractice.Projectschema({
        MovieName: bookingDetails.Name,
        seatsBooked: bookingDetails.seats,
        totalAmount: bookingDetails.totalAmount,
        bookingDate: bookingDetails.bookingDate,
      });

      await screenProduct.save();
      console.log('Booking data saved successfully');
    } catch (error) {
      console.error('Error processing booking:', error);
    }
  }

  res.json({ received: true });
});

app.post('/api/event/create-checkout-session', async (req, res) => {
  try {
    console.log('REQUEST BODY ->', JSON.stringify(req.body));

    const { userEmail = '', eventName, seatsBooked = [], totalAmount } = req.body;

    // normalize totalAmount to Number
    const total = Number(totalAmount);
    if (!eventName) return res.status(400).json({ error: 'Missing eventName' });
    if (!Array.isArray(seatsBooked) || seatsBooked.length === 0) return res.status(400).json({ error: 'No seats selected' });
    if (Number.isNaN(total) || total <= 0) return res.status(400).json({ error: 'Invalid totalAmount' });

    if (!stripe) {
      console.error('Stripe client not initialized. Check STRIPE_SECRET_KEY.');
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
      success_url: process.env.SUCCESS_URL || 'https://ticketflix-official.netlify.app/eventsuccess',
      cancel_url: process.env.CANCEL_URL || 'https://ticketflix-official.netlify.app/',
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
});

// Stripe webhook (raw body). Note: use the exact path configured in Stripe dashboard/CLI.
app.post('/api/event/webhook', bodyparser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('WEBHOOK EVENT:', event.type);
    // ... handle checkout.session.completed here as in your code ...
  } catch (err) {
    console.error('Webhook signature verification failed:', err && err.message);
    return res.status(400).send(`Webhook Error: ${err && err.message}`);
  }
  res.json({ received: true });
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// User routes
app.post('/userlogin', mongoPractice.login);
app.post(
  '/userssignup',
  [
    check('name').not().isEmpty(),
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({ min: 8 })
  ],
  mongoPractice.signup
);

// Movie routes
app.post('/movieschema/add',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'castImage', maxCount: 10 },
    { name: 'crewImage', maxCount: 10 } 
  ]),
  mongoPractice.movieProduct
);
app.get('/movieview', mongoPractice.getMovieProduct);

// UPDATED GET route for movie details
app.get('/getmovieview/:pid', async (req, res, next) => {
  const id = req.params.pid;
  try {
    // Use the imported Movie model
    const product = await Movie.findById(id).exec();
    if (!product) {
      return res.status(404).send('Product not found');
    }
    // Construct the full poster URL. If product.image starts with "http", assume it's a full URL.
    const imageURL = product.image.startsWith("http")
      ? product.image
      : `http://localhost:5000/uploads/${product.image}`;

    res.json({
      movieName: product.movieName,
      movieGenre: product.movieGenre,
      movieLanguage: product.movieLanguage,
      movieDuration: product.movieDuration,
      movieCast: product.movieCast,
      movieCrew: product.movieCrew,
      movieDescription: product.movieDescription,
      movieReleasedate: product.movieReleasedate,
      trailerLink: product.trailerLink,
      movieFormat: product.movieFormat,
      imageURL, // Full poster URL
      reviews: product.reviews || [],
      movieCensor: product.movieCensor,
    });
  } catch (err) {
    next(err);
  }
});

app.patch('/movieview/update/:pid', mongoPractice.updateMovieProductById);
app.delete('/movieview/delete/:pid', mongoPractice.deleteMovieProductById);
app.post('/movieview/review/:pid', mongoPractice.addReviewToMovie);

// Other User routes
app.get('/users', mongoPractice.getUsers);
app.get('/AdmingetUsers', mongoPractice.AdmingetUsers);
app.post('/adminlogin', mongoPractice.adminlogin);
app.post(
  '/adminusers',
  [
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({ min: 8 })
  ],
  mongoPractice.adminsignup
);

// Schedule schema routes
app.post('/Scheduleschema/add', mongoPractice.scheduleProduct);
app.get('/scheduleschema', mongoPractice.getscheduleProducts);
app.get('/getScheduleschema/:pid', mongoPractice.getScheduleProductById);
app.get('/Scheduleschema/movie/:pid', mongoPractice.getScheduleProductByMovieName);
app.patch('/Scheduleschema/update/:pid', mongoPractice.updateScheduleProductById);
app.delete('/Scheduleschema/delete/:pid', mongoPractice.deleteScheduleProducById);

app.post('/event/add',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'castImage', maxCount: 10 }  // Allow up to 10 cast images
  ]),
  mongoPractice.EventProduct
);
app.get('/event', mongoPractice.getEventProduct);

// UPDATED GET route for movie details
app.get('/getevent/:pid', async (req, res, next) => {
  const id = req.params.pid;
  try {
    // Use the imported Movie model
    const product = await Event.findById(id).exec();
    if (!product) {
      return res.status(404).send('Product not found');
    }
    // Construct the full poster URL. If product.image starts with "http", assume it's a full URL.
    const imageURL = product.image.startsWith("http")
      ? product.image
      : `http://localhost:5000/uploads/${product.image}`;

    res.json({
      eventName: product.eventName,
      imageURL, // Full poster URL
      eventLanguage: product.eventLanguage,
      eventDuration: product.eventDuration,
      eventArtist: product.eventArtist,
      eventVenue: product.eventVenue,
      eventAbout: product.eventAbout,
      eventDate: product.eventDate,
      eventTime: product.eventTime,
      eventType: product.eventType,
      location: product.location,
    });
  } catch (err) {
    next(err);
  }
});

app.patch('/event/update/:pid', mongoPractice.updateEventProductById);
app.delete('/event/delete/:pid', mongoPractice.deleteEventProductById);

// Eventbooking routes
app.post('/booking/add', mongoPractice.Booking);
app.get('/booking', mongoPractice.getBooking);
app.get('/booking/:pid', mongoPractice.getBookingById);
app.get('/booking/user/:userEmail', mongoPractice.getBookingByUserEmail);
app.patch('/booking/update/:pid', mongoPractice.updateBookingById);
app.patch('/booking/:id/cancel', mongoPractice.cancelBooking);
app.delete('/booking/delete/:pid', mongoPractice.deleteBookingById);
app.post('/booking/seats', mongoPractice.getBookedSeats);

// Event schema routes
app.post('/eventschedule/add', mongoPractice.Eventschedule);
app.get('/eventschedule', mongoPractice.getEventschedule);
app.get('/geteventschedule/:pid', mongoPractice.getEventscheduleById);
app.get('/eventschedule/event/:pid', mongoPractice.getEventscheduleByeventName);
app.patch('/eventschedule/update/:pid', mongoPractice.updateEventscheduleById);
app.delete('/eventschedule/delete/:pid', mongoPractice.deleteEventscheduleById);


app.post('/beverages/add', mongoPractice.createBeverage);
app.get('/beverages', mongoPractice.getAllBeverages);
app.get('/beverages/:id', mongoPractice.getBeverageById);
app.put('/beverages/:id', mongoPractice.updateBeverage);
app.delete('/beverages/:id', mongoPractice.deleteBeverage);

// Example: server.js (Node/Express)
app.get('/api/autocomplete', async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const results = await Movie.find({
      movieName: { $regex: searchTerm, $options: 'i' },
    }).limit(10);

    // Return the whole movie object (or at least _id and movieName)
    res.json(results);
  } catch (error) {
    console.error('Error in autocomplete route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/eventcomplete', async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    const results = await Event.find({
      eventName: { $regex: searchTerm, $options: 'i' },
    }).limit(10);

    // Return the whole event object (or at least _id and eventName)
    res.json(results);
  } catch (error) {
    console.error('Error in autocomplete route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//--------------------------------------------------------------------------------------

app.get('/dashboard/stats', mongoPractice.getDashboardStats);

app.patch('/qrupdate/:pid', mongoPractice.updateBookingStatus);

app.post('/staff/login',mongoPractice.loginStaff);
app.post('/staff/signin',mongoPractice.createStaff);


app.listen(process.env.PORT, () => {
  console.log('Server is running on port 5000');
});