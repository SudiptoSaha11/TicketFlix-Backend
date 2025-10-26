// controllers/eventController.js
const HttpError = require('../../models/http-error'); // adjust path if you use HttpError
const Product4 = require('../../models/Event');   // adjust to your actual event model path

const EventProduct = async (req, res, next) => {
  const { 
    eventName, 
    eventLanguage, 
    eventDuration, 
    eventArtist, 
    eventVenue,
    eventAbout, 
    eventDate,
    eventTime,
    eventType,
    location // 👈 New field
  } = req.body;

  // ✅ Parse eventTime
  const parsedEventTime = Array.isArray(eventTime) ? eventTime : JSON.parse(eventTime || "[]");

  // ✅ Parse eventArtist
  let parsedEventArtist = Array.isArray(eventArtist) 
    ? eventArtist 
    : JSON.parse(eventArtist || "[]"); 

  // ✅ Assign images to artists
  if (req.files && req.files.artistImage) {
    const artistImage = Array.isArray(req.files.artistImage)
      ? req.files.artistImage
      : [req.files.artistImage];

    parsedEventArtist = parsedEventArtist.map((member, index) => ({
      ...member,
      image: artistImage[index] ? artistImage[index].filename : member.image,
    }));
  }

  // ✅ Parse location
  let parsedLocation = location;
  if (typeof location === "string") {
    try {
      parsedLocation = JSON.parse(location);
    } catch (err) {
      return next(new HttpError("Invalid location format", 400));
    }
  }

  const event = new Product4({
    eventName, 
    image: req.body.image,
    backgroundImage: req.body.backgroundImage,
    eventLanguage, 
    eventDuration, 
    eventArtist: parsedEventArtist,
    eventVenue,
    eventAbout, 
    eventDate,
    eventTime: parsedEventTime,
    eventType,
    location: parsedLocation // ✅ New field
  });

  try {
    const result = await event.save();
  } catch (err) {
    console.error("Error saving event:", err);
    return next(new HttpError('Creating event failed, please try again.', 500));
  }

  return res.status(201).json({ product: event });
};

// ✅ Get all Event Products
const getEventProduct = async (req, res, next) => {
  try {
    const product = await Product4.find().exec();
    if (!product || product.length === 0) {
      return res.status(404).send('No events found');
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// ✅ Get Event Product by ID
const getEventProductById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product4.findById(id).exec();
    if (!product) {
      return res.status(404).send('Event not found');
    }

    res.json({
      eventName: product.eventName,
      eventLanguage: product.eventLanguage,
      eventDuration: product.eventDuration,
      eventArtist: product.eventArtist,
      eventVenue: product.eventVenue,
      eventAbout: product.eventAbout,
      eventDate: product.eventDate,
      eventTime: product.eventTime,
      eventType: product.eventType,
      location: product.location, // ✅ Include location
      imageURL: product.backgroundImage,
    });
    
  } catch (err) {
    next(err);
  }
};

// ✅ Update Event Product by ID
const updateEventProductById = async (req, res, next) => {
  const id = req.params.pid;

  const parsedEventTime = Array.isArray(req.body.eventTime) ? req.body.eventTime : JSON.parse(req.body.eventTime || "[]");

  let parsedEventArtist = req.body.eventArtist;
  if (typeof parsedEventArtist === "string") {
    parsedEventArtist = JSON.parse(parsedEventArtist);
  }

  let parsedLocation = req.body.location;
  if (typeof parsedLocation === "string") {
    try {
      parsedLocation = JSON.parse(parsedLocation);
    } catch (err) {
      return next(new HttpError("Invalid location format", 400));
    }
  }

  const updateData = {
    eventName: req.body.eventName,
    eventLanguage: req.body.eventLanguage,
    eventDuration: req.body.eventDuration,
    eventArtist: parsedEventArtist,
    eventVenue: req.body.eventVenue,
    eventAbout: req.body.eventAbout,
    eventDate: req.body.eventDate,
    eventTime: parsedEventTime,
    eventType: req.body.eventType,
    image: req.file ? req.file.filename : req.body.image,
    backgroundImage: req.body.backgroundImage,
    location: parsedLocation // ✅ Add location update
  };

  try {
    const product = await Product4.findByIdAndUpdate(id, updateData, { new: true });
    if (!product) {
      return res.status(404).send('Event not found');
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// ✅ Delete Event Product by ID
const deleteEventProductById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product4.findByIdAndDelete(id).exec();
    if (!product) {
      return res.status(404).send('Event not found');
    }
    res.send('Event deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {EventProduct, getEventProduct, getEventProductById, updateEventProductById, deleteEventProductById };
