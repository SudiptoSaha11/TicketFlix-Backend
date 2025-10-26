// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../../controllers/Event/eventController');

router.post('/event/add', eventController.EventProduct);
router.get('/event', eventController.getEventProduct);
router.get('/getevent/:pid', eventController.getEventProductById);
router.patch('/event/update/:pid', eventController.updateEventProductById);
router.delete('/event/delete/:pid', eventController.deleteEventProductById);

module.exports = router;

