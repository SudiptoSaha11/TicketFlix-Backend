// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/Movie/bookingController');

// Keep the exact same API endpoints — no frontend change required
router.post('/booking/add', bookingController.Booking);
router.get('/booking', bookingController.getBooking);
router.get('/booking/:pid', bookingController.getBookingById);
router.get('/booking/user/:userEmail', bookingController.getBookingByUserEmail);
router.patch('/booking/update/:pid', bookingController.updateBookingById);
router.patch('/booking/:id/cancel', bookingController.cancelBooking);
router.delete('/booking/delete/:pid', bookingController.deleteBookingById);
router.post('/booking/seats', bookingController.getBookedSeats);

module.exports = router;
