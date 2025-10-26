const express = require('express');
const fs = require('fs');
require('dotenv').config(); 
const cors = require('cors');
const bodyparser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const AuthRoutes = require('./routes/Users/authRoutes')
const adminRoutes = require('./routes/Admin/authRoutes');
const promoRoutes = require('./routes/Promocode/PromoRoutes');
const summaryRoutes = require('./routes/Movie/Summery');
const movieRoutes = require('./routes/Movie/movieRoutes');
const scheduleRoutes = require('./routes/Movie/scheduleRoutes');
const eventscheduleRoutes = require('./routes/Event/eventscheduleRoutes');
const bookingRoutes = require('./routes/Movie/bookingRoutes'); 
const eventRoutes = require('./routes/Event/eventRoutes');
const paymentController = require('./controllers/Payment/paymentController');
const paymentRoutes = require('./routes/Payment/paymentRoutes');
const beverageRoutes = require('./routes/Movie/beverageRoutes');
const dashboardRoutes = require('./routes/Dashboard/dashboardRoutes');
const searchRoutes = require('./routes/Search/searchRoutes'); 
const razorpayCtrl = require('./controllers/Payment/razorpayController');
const razorpayRoutes = require('./routes/Payment/razorpayRoute');


const connectDB = require("./db"); // Adjust the path if needed
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(bodyparser.json());
app.use(express.static('public'));

app.use('/auth',AuthRoutes);
app.use('/', adminRoutes);
app.use('/api/promocode', promoRoutes);
app.use('/api', summaryRoutes); 
app.use('/', movieRoutes);
app.use('/', scheduleRoutes);
app.use('/', eventscheduleRoutes);
app.use('/', bookingRoutes);
app.use('/', eventRoutes);
app.use('/', paymentRoutes);
app.use('/', beverageRoutes);
app.use('/', dashboardRoutes);
app.use('/', searchRoutes); 
app.post('/api/razorpay/webhook', bodyparser.raw({ type: 'application/json' }), razorpayCtrl.webhookHandler);

app.use('/api/razorpay', razorpayRoutes);

app.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);


app.listen(process.env.PORT, () => {
  console.log('Server is running on port 5000');
});

