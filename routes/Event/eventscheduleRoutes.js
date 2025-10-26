// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../../controllers/Event/eventscheduleController');

// Keep the exact same endpoints so frontend doesn't change
router.post('/eventschedule/add', eventController.Eventschedule);
router.get('/eventschedule', eventController.getEventschedule);
router.get('/geteventschedule/:pid', eventController.getEventscheduleById);
router.get('/eventschedule/event/:pid', eventController.getEventscheduleByeventName);
router.patch('/eventschedule/update/:pid', eventController.updateEventscheduleById);
router.delete('/eventschedule/delete/:pid', eventController.deleteEventscheduleById);

module.exports = router;
