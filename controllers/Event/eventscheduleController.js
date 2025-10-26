// controllers/eventController.js
const Product6 = require('../../models/Eventschedule')// adjust path if needed

// Create event schedule
const Eventschedule = async (req, res, next) => {
  try {
    const Eventschedule = new Product6({
      eventName: req.body.eventName,
      eventVenue: req.body.eventVenue,     // hallName as an array
      EventshowTime: req.body.EventshowTime // showTime as an array of objects (time + prices)
    });

    const result = await Eventschedule.save();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Creating schedule failed' });
  }
};

// Get all schedules
const getEventschedule = async (req, res, next) => {
  try {
    const products = await Product6.find().exec();
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No schedules found' });
    }
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedules failed' });
  }
};

// Get a schedule by ID
const getEventscheduleById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product6.findById(id).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

// Get a schedule by event name (case-insensitive)
const getEventscheduleByeventName = async (req, res, next) => {
  const eventName = req.params.pid;
  try {
    const product = await Product6
      .findOne({ eventName: { $regex: new RegExp(eventName, 'i') } })
      .exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

// Update a schedule by ID
const updateEventscheduleById = async (req, res, next) => {
  const id = req.params.pid;
  const updateData = {
    eventName: req.body.eventName,
    eventVenue: req.body.eventVenue,
    EventshowTime: req.body.EventshowTime
  };

  try {
    const product = await Product6.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Updating schedule failed' });
  }
};

// Delete a schedule by ID
const deleteEventscheduleById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product6.findByIdAndDelete(id).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Deleting schedule failed' });
  }
};

module.exports = {Eventschedule, getEventschedule, getEventscheduleById, getEventscheduleByeventName, updateEventscheduleById,deleteEventscheduleById};
