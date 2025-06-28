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
app.use(cors());
app.use(bodyparser.json());
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.send("Welcome to the Movie Booking API");
});

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Stripe Checkout API
app.post('/api/create-checkout-session', async (req, res) => {
  const { Name, seats = [], food = [], totalAmount } = req.body;

  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    return res.status(400).json({ error: 'Invalid total amount' });
  }

  // Seat line items
  const seatItems = seats.map((seat) => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: `${Name} - ${seat.seatType} ${seat.seatNumber}`,
      },
      unit_amount: Math.round(seat.price * 100),
    },
    quantity: 1,
  }));

  // Food line items
  const foodItems = food.map((item) => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: item.beverageName || 'Food Item',
      },
      unit_amount: Math.round((item?.sizes?.[0]?.price || 0) * 100),
    },
    quantity: 1,
  }));

  const lineItems = [...seatItems, ...foodItems];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://ticketflix-official.netlify.app/success',
      cancel_url: 'https://ticketflix-official.netlify.app/',
      metadata: {
        bookingDetails: JSON.stringify({
          movieName: Name,
          totalAmount: totalAmount.toString(),
          bookingDate: new Date().toISOString(),
          seatCount: seats.length.toString(),
          foodCount: food.length.toString(),
        }),
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/event/create-checkout-session', async (req, res) => {
  const { eventName, seatsBooked = [], totalAmount } = req.body;

  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    return res.status(400).json({ error: 'Invalid total amount' });
  }

  // Seat line items
  const seatItems = seatsBooked.map((seat) => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: `${eventName} - ${seat.seatType} ${seat.seatNumber}`,
      },
      unit_amount: Math.round(seat.price * 100),
    },
    quantity: 1,
  }));

  // You can enable food items logic later if needed
  const lineItems = [...seatItems];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://ticketflix-official.netlify.app/eventsuccess',
      cancel_url: 'https://ticketflix-official.netlify.app/',
      metadata: {
        bookingDetails: JSON.stringify({
          movieName: eventName,
          totalAmount: totalAmount.toString(),
          bookingDate: new Date().toISOString(),
          seatCount: seatsBooked.length.toString(),
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
    { name: 'castImage', maxCount: 10 }  // Allow up to 10 cast images
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
      movieDescription: product.movieDescription,
      movieReleasedate: product.movieReleasedate,
      trailerLink: product.trailerLink,
      movieFormat: product.movieFormat,
      imageURL, // Full poster URL
      reviews: product.reviews || []
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


app.listen(process.env.PORT, () => {
  console.log('Server is running on port 5000');
});