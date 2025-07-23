const mongoose = require('mongoose');
// import the Projectschema from models
const fs=require("fs");
const path=require("path");
// const Projectschema = require('./models/Projectschema');
const Product1 = require('./models/Movieschema')
const Product2 = require('./models/Scheduleschema')
const User = require('./models/user')
const Admin = require('./models/Admin')
const Product4 = require('./models/Event')
const Product5 = require('./models/Booking')
const Product6 = require('./models/Eventschedule')
const Beverage=require('./models/Beverageschema')
const { validationResult } = require('express-validator');
const HttpError = require('./models/http-error');


// -------------------------------------------------------------------------------------------------------
const movieProduct = async (req, res, next) => {
  const {
    movieName,
    movieGenre,
    movieLanguage,
    movieDuration,
    movieCast,
    movieCrew,
    movieDescription,
    movieReleasedate,
    trailerLink,
    movieFormat,
    movieCensor             
  } = req.body;

  // parse cast & crew arrays
  let parsedMovieCast = JSON.parse(movieCast).map(m => ({
    name:  m.name,
    image: m.image
  }));
  let parsedMovieCrew = JSON.parse(movieCrew).map(m => ({
    name:  m.name,
    role:  m.role,
    image: m.image
  }));

  // handle uploaded cast images
  if (req.files?.castImage) {
    const castImages = Array.isArray(req.files.castImage)
      ? req.files.castImage
      : [req.files.castImage];
    parsedMovieCast = parsedMovieCast.map((m, i) => ({
      ...m,
      image: castImages[i]?.filename || m.image
    }));
  }

  // handle uploaded crew images
  if (req.files?.crewImage) {
    const crewImages = Array.isArray(req.files.crewImage)
      ? req.files.crewImage
      : [req.files.crewImage];
    parsedMovieCrew = parsedMovieCrew.map((m, i) => ({
      ...m,
      image: crewImages[i]?.filename || m.image
    }));
  }

  const movie = new Product1({
    movieName,
    image:           req.body.image,
    movieGenre,
    movieLanguage,
    movieDuration,
    movieCast:       parsedMovieCast,
    movieCrew:       parsedMovieCrew,
    movieDescription,
    movieReleasedate,
    trailerLink,
    movieFormat,
    movieCensor      
  });

  try {
    const result = await movie.save();
    res.status(201).json({ product: result });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Creating product failed, please try again.', 500));
  }
};

// Get all movies
const getMovieProduct = async (req, res, next) => {
  try {
    const products = await Product1.find().exec();
    if (!products.length) {
      return res.status(404).json({ message: 'No products found.' });
    }
    res.json(products);
  } catch (err) {
    return next(new HttpError('Fetching products failed, please try again.', 500));
  }
};

// Get a single movie by ID
const getMovieProductById = async (req, res, next) => {
  const id = req.params.pid;
  let product;
  try {
    product = await Product1.findById(id).exec();
  } catch (err) {
    return next(new HttpError('Could not find product.', 500));
  }
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  // build URLs for stored images
  const urlBase   = 'http://localhost:5000/uploads/';
  const imageURL  = `${urlBase}${product.image}`;
  const castWithURLs = product.movieCast.map(c => ({
    name:  c.name,
    image: c.image.startsWith('http') ? c.image : `${urlBase}${c.image}`
  }));
  const crewWithURLs = product.movieCrew.map(c => ({
    name:  c.name,
    role:  c.role,
    image: c.image.startsWith('http') ? c.image : `${urlBase}${c.image}`
  }));

  res.json({
    movieName:       product.movieName,
    movieGenre:      product.movieGenre,
    movieLanguage:   product.movieLanguage,
    movieDuration:   product.movieDuration,
    movieCast:       castWithURLs,
    movieCrew:       crewWithURLs,
    movieDescription:product.movieDescription,
    movieReleasedate:product.movieReleasedate,
    trailerLink:     product.trailerLink,
    movieFormat:     product.movieFormat,
    movieCensor:     product.movieCensor,   
    imageURL
  });
};

// Update a movie by ID
const updateMovieProductById = async (req, res, next) => {
  const id = req.params.pid;
  const {
    movieName,
    movieGenre,
    movieLanguage,
    movieDuration,
    movieDescription,
    movieReleasedate,
    trailerLink,
    movieFormat,
    movieCensor           
  } = req.body;

  // parse cast & crew if strings
  let updatedCast = typeof req.body.movieCast === 'string'
    ? JSON.parse(req.body.movieCast)
    : req.body.movieCast;
  let updatedCrew = typeof req.body.movieCrew === 'string'
    ? JSON.parse(req.body.movieCrew)
    : req.body.movieCrew;

  // handle new cast images
  if (req.files?.castImage) {
    const castImgs = Array.isArray(req.files.castImage)
      ? req.files.castImage
      : [req.files.castImage];
    updatedCast = updatedCast.map((m, i) => ({
      ...m,
      image: castImgs[i]?.filename || m.image
    }));
  }

  // handle new crew images
  if (req.files?.crewImage) {
    const crewImgs = Array.isArray(req.files.crewImage)
      ? req.files.crewImage
      : [req.files.crewImage];
    updatedCrew = updatedCrew.map((m, i) => ({
      ...m,
      image: crewImgs[i]?.filename || m.image
    }));
  }

  const updateData = {
    movieName,
    movieGenre,
    movieLanguage,
    movieDuration,
    movieCast:       updatedCast,
    movieCrew:       updatedCrew,
    movieDescription,
    movieReleasedate,
    trailerLink,
    movieFormat,
    movieCensor,    
    image:           req.body.image
  };

  let product;
  try {
    product = await Product1.findByIdAndUpdate(id, updateData, { new: true }).exec();
  } catch (err) {
    return next(new HttpError('Updating product failed, please try again.', 500));
  }
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }
  res.json(product);
};

// Delete a movie by ID
const deleteMovieProductById = async (req, res, next) => {
  try {
    const product = await Product1.findByIdAndDelete(req.params.pid).exec();
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ message: 'Delete successful.' });
  } catch (err) {
    return next(new HttpError('Deleting product failed, please try again.', 500));
  }
};

// Add a review to a movie product
const addReviewToMovie = async (req, res, next) => {
  const movieId = req.params.pid;
  // Retrieve rating, review, and user (reviewer's name) from the request body
  const { rating, review, user } = req.body;
  // Use the provided user name, or default to "Anonymous" if none is provided
  const reviewer = user && user.trim() !== "" ? user.trim() : "Anonymous";

  try {
    const product = await Product1.findById(movieId);
    if (!product) {
      return res.status(404).json({ message: "Movie not found" });
    }

    if (rating < 0 || rating > 10) {
      return res.status(400).json({ message: "Rating must be between 0 and 10" });
    }

    product.reviews.push({
      user: reviewer,
      rating,
      review,
      createdAt: new Date(),
    });

    await product.save();
    return res.status(201).json({
      message: "Review added successfully",
      reviews: product.reviews,
    });
  } catch (err) {
    console.error("Error adding review:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------------------------------------

// mongodb we have to Create the post method to add movie schedule into the mongodb

const scheduleProduct = async (req, res, next) => {
  try {
    const scheduleProduct = new Product2({
      MovieName: req.body.MovieName,
      hallName: req.body.hallName,   // hallName as an array
      showTime: req.body.showTime    // showTime as an array of objects (each with time and ticket prices)
    });

    const result = await scheduleProduct.save();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Creating schedule failed' });
  }
};

// Get all schedule products
const getscheduleProducts = async (req, res, next) => {
  try {
    const products = await Product2.find().exec();
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No schedules found' });
    }
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedules failed' });
  }
};

// Get a single schedule product by ID
const getScheduleProductById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product2.findById(id).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

// Get a schedule product by MovieName
const getScheduleProductByMovieName = async (req, res, next) => {
  const movieName = req.params.pid;
  try {
    const product = await Product2.findOne({ MovieName: { $regex: new RegExp(movieName, 'i') } }).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

// Update a schedule product by ID
const updateScheduleProductById = async (req, res, next) => {
  const id = req.params.pid;
  const updateData = {
    MovieName: req.body.MovieName,
    hallName: req.body.hallName,   // hallName as an array
    showTime: req.body.showTime    // showTime as an array of objects (each with time and ticket prices)
  };

  try {
    const product = await Product2.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Updating schedule failed' });
  }
};

// Delete a schedule product by ID
const deleteScheduleProducById = async (req, res, next) => {
  const id = req.params.pid;
  try {
    const product = await Product2.findByIdAndDelete(id).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Deleting schedule failed' });
  }
};
 //-------------------------------------------------------------------------------------------------------------------------------------
 
 const getUsers = async (req, res) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    
      const errorMessage='Fetching users failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
  

  }
  res.json({users: users.map(user => user.toObject({ getters: true }))});
};

// ------------------------------------------------------------------------------------------------

const AdmingetUsers = async (req, res) => {
  let users;
  try {
    users = await Admin.find({}, '-password');
  } catch (err) {
    
      const errorMessage='Fetching users failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
  

  }
  res.json({users: users.map(Admin => Admin.toObject({ getters: true }))});
};
// ------------------------------------------------------------------------------------------
 const adminsignup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      
      const errorMessage='Invalid inputs passed, please check your data.';
      return res.status(422).json({ message: errorMessage });
    }
    const { name, email, password ,usertype} = req.body;
  
    let existingUser
    try {
      existingUser = await User.findOne({ email: email })
    } catch (err) {
      
      return res.status(500).json({ message: 'Signing up failed, please try again later.' });
    }
    
    if (existingUser) {
      
      const errorMessage='User exists already, please login instead.';
      return res.status(422).json({ message: errorMessage });
    }
    //let hashPassword;
    //hashPassword=await bycryptjs.hash(password,12);
    const createdUser = new Admin({
      name,
      email,
      password,
      usertype
    });
  
    try {
      await createdUser.save();
    } catch (err) {
      
      const errorMessage='Signing up failed, please try again.';
      return res.status(422).json({ message: errorMessage });
    }
  
   return res.status(201).json({user: createdUser.toObject({ getters: true })});
  };
  const signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      
      const errorMessage='Invalid inputs passed, please check your data.';
      return res.status(422).json({ message: errorMessage });
    }
    const { name, email, password, usertype } = req.body;
  
    let existingUser
    try {
      existingUser = await User.findOne({ email: email })
    } catch (err) {
      
      return res.status(500).json({ message: 'Signing up failed, please try again later.' });
    }
    
    if (existingUser) {
      
      const errorMessage='User exists already, please login instead.';
      return res.status(422).json({ message: errorMessage });
    }
    //let hashPassword;
    //hashPassword=await bycryptjs.hash(password,12);
    const createdUser = new User({
      name,
      email,
      //password:hashPassword,
      password,
      usertype
    });
  
    try {
      await createdUser.save();
    } catch (err) {
      
      const errorMessage='Signing up failed, please try again.';
      return res.status(422).json({ message: errorMessage });
    }
  
    return res.status(201).json({user: createdUser.toObject({ getters: true })});
  };
  
  const login = async (req, res) => {
    const { email, password } = req.body;
  
    let existingUser;
  
    try {
      existingUser = await User.findOne({ email: email });
    } catch (err) {
      const errorMessage = 'Logging in failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
    }
  
    // Ensure there's no usertype === 'admin' check for regular user login
    if (!existingUser || existingUser.password !== password) {
      const errorMessage = 'Invalid username or password, could not log you in.';
      return res.status(401).json({ message: errorMessage });
    }
  
    return res.status(201).json({ user: existingUser.toObject({ getters: true }) });
  };
  
  
 const adminlogin = async (req, res) => {
    //console.log("fired"+email);
    const { email, password } = req.body;
  
    let existingAdmin;
  
    try {
      existingAdmin = await Admin.findOne({ email: email })
    } catch (err) {
      const errorMessage='Logging in failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
    };
    
    if (!existingAdmin || existingAdmin.password !== password ||existingAdmin.usertype !=="Admin") {
      const errorMessage='Invalid User name & password, could not log you in.';
   
      return res.status(401).json({ message: errorMessage });
    }
  
    return res.status(200).json({ Admin: existingAdmin.toObject({ getters: true }) });
  };

// --------------------------------------------------------------------------------------------------------------------------

// ✅ Create Event Product
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
      imageURL: `http://localhost:5000/uploads/${product.image}`,
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

// -----------------------------------------------------------------------------------------------------------

// Create a new booking
const Booking = async (req, res) => {
  try {
    const { userEmail, Name, seats, totalAmount, bookingDate, Venue, Time,Language, status } = req.body;

    console.log('Received data:', { userEmail, Name, seats, totalAmount, bookingDate, Venue, Time, Language, status });

    // Validate user email
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Check if the user exists
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate incoming data
    if (!Name || !Array.isArray(seats) || seats.length === 0 || typeof totalAmount !== 'number' || !bookingDate) {
      console.log('Validation failed:', { Name, seats, totalAmount, bookingDate });
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Ensure all seat numbers are strings
    if (!seats.every(seat => typeof seat === 'string')) {
      return res.status(400).json({ error: 'Seats must be an array of seat numbers (strings)' });
    }

    // Convert bookingDate to Date object
    const bookingDateObject = new Date(bookingDate);
    if (isNaN(bookingDateObject.getTime())) {
      console.log('Invalid booking date:', bookingDate);
      return res.status(400).json({ error: 'Invalid booking date' });
    }

    // Validate status field
    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Create a new booking record
    const newBooking = new Product5({
      userEmail,
      Name,
      Venue,
      Time,
      Language,
      seats,  // Now just an array of seat numbers
      totalAmount,
      bookingDate: bookingDateObject,
      status: 'confirmed', // Set status to confirmed after successful booking
    });

    // Save to database
    const result = await newBooking.save();
    console.log('Booking saved successfully:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error saving screen product:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Get all bookings
const getBooking = async (req, res) => {
  try {
    const bookings = await Product5.find();
    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found' });
    }
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get bookings by user email
const getBookingByUserEmail = async (req, res) => {
  try {
    const { userEmail } = req.params;

    const bookings = await Product5.find({ userEmail });
    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found for this user' });
    }
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const id = req.params.pid;
    const booking = await Product5.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update booking by ID
const updateBookingById = async (req, res) => {
  try {
    const id = req.params.pid;
    const { userEmail, Name, seats, totalAmount, bookingDate, Venue, Time,Language, status } = req.body;

    // Ensure user exists
    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Validate status field
    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Ensure seatsBooked is an array of strings
    if (seatsBooked && (!Array.isArray(seats) || !seats.every(seat => typeof seat === 'string'))) {
      return res.status(400).json({ error: 'Seats must be an array of seat numbers (strings)' });
    }

    const updateData = {
      userEmail,
      Name,
      Venue,
      Time,
      Language, 
      seats,
      totalAmount,
      bookingDate,
      status, // Allow updating status
    };

    const booking = await Product5.findByIdAndUpdate(id, updateData, { new: true });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Update only the status field to 'cancelled'
    const updatedBooking = await Product5.findByIdAndUpdate(
      bookingId,
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!updatedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ message: 'Booking cancelled successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Delete booking by ID
const deleteBookingById = async (req, res) => {
  try {
    const id = req.params.pid;
    const booking = await Product5.findByIdAndDelete(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//----------------------------------------------------------------------------------------------------------------

const Eventschedule = async (req, res, next) => {
  try {
    const Eventschedule = new Product6({
      eventName: req.body.eventName,
      eventVenue: req.body.eventVenue,   // hallName as an array
      EventshowTime: req.body.EventshowTime    // showTime as an array of objects (each with time and ticket prices)
    });

    const result = await Eventschedule.save();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Creating schedule failed' });
  }
};

// Get all schedule products
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

// Get a single schedule product by ID
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

// Get a schedule product by MovieName
const getEventscheduleByeventName = async (req, res, next) => {
  const eventName = req.params.pid;
  try {
    const product = await Product6.findOne({ eventName: { $regex: new RegExp(eventName, 'i') } }).exec();
    if (!product) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fetching schedule failed' });
  }
};

// Update a schedule product by ID
const updateEventscheduleById = async (req, res, next) => {
  const id = req.params.pid;
  const updateData = {
    eventName: req.body.eventName,
    eventVenue: req.body.eventVenue,   // hallName as an array
    EventshowTime: req.body.EventshowTime    // showTime as an array of objects (each with time and ticket prices)
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

// Delete a schedule product by ID
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

//---------------------------------------------------------------------------------------------------------

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers    = await User.countDocuments();
    const totalBookings = await Product5.countDocuments();
    const totalMovies   = await Product1.countDocuments();  
    

    return res.json({
      totalUsers,
      totalBookings,
      totalMovies,                                         // <<— new line
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return res.status(500).json({ message: "Fetching stats failed." });
  }
};


//---------------------------------------------------------------------------------------------------------

// Create a new beverage
// Create a new beverage
exports.createBeverage = async (req, res) => {
  try {
    const { beverageName, image, category, sizes } = req.body;
    // sizes should be an array of { label, price, quantity }
    const beverage = new Beverage({ beverageName, image, category, sizes });
    const saved = await beverage.save();
    return res.status(201).json(saved);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ message: error.message, errors: error.errors });
    }
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: 'Beverage name must be unique.' });
    }
    console.error('Error creating beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Get all beverages (with optional filters)
exports.getAllBeverages = async (req, res) => {
  try {
    const { category, size } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (size) filter['sizes.label'] = size;

    const beverages = await Beverage.find(filter).sort({ beverageName: 1 });
    return res.status(200).json(beverages);
  } catch (error) {
    console.error('Error fetching beverages:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Get a single beverage by ID
exports.getBeverageById = async (req, res) => {
  try {
    const { id } = req.params;
    const beverage = await Beverage.findById(id);
    if (!beverage) {
      return res.status(404).json({ message: 'Beverage not found' });
    }
    return res.status(200).json(beverage);
  } catch (error) {
    console.error('Error fetching beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Update a beverage (including size quantities)
exports.updateBeverage = async (req, res) => {
  try {
    const { id } = req.params;
    // req.body can contain any of beverageName, image, category, sizes (with quantities)
    const updates = req.body;
    const options = { new: true, runValidators: true };
    const updated = await Beverage.findByIdAndUpdate(id, updates, options);
    if (!updated) {
      return res.status(404).json({ message: 'Beverage not found' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ message: error.message, errors: error.errors });
    }
    console.error('Error updating beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Delete a beverage
exports.deleteBeverage = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Beverage.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: 'Beverage not found' });
    }
    return res.status(200).json({ message: 'Beverage deleted successfully' });
  } catch (error) {
    console.error('Error deleting beverage:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};



// ---------------------------------------------------------------------------------------------------------

exports.EventProduct = EventProduct;
exports.getEventProduct = getEventProduct;
exports.getEventProductById = getEventProductById;
exports.updateEventProductById = updateEventProductById;
exports.deleteEventProductById = deleteEventProductById;

//--------------------------------------------------------------------------------------------------------------

exports.Booking = Booking;
exports.getBooking = getBooking;
exports.getBookingById = getBookingById;
exports.getBookingByUserEmail = getBookingByUserEmail;
exports.updateBookingById = updateBookingById;
exports.cancelBooking = cancelBooking;
exports.deleteBookingById = deleteBookingById;

//----------------------------------------------------------------------------------------------------------

exports.Eventschedule = Eventschedule;
exports.getEventschedule = getEventschedule;
exports.getEventscheduleById = getEventscheduleById;
exports.getEventscheduleByeventName = getEventscheduleByeventName;
exports.updateEventscheduleById = updateEventscheduleById;
exports.deleteEventscheduleById = deleteEventscheduleById;

//---------------------------------------------------------------------------------------------------

exports.getUsers = getUsers;
exports.AdmingetUsers = AdmingetUsers
exports.adminsignup = adminsignup;
exports.signup = signup;
exports.adminlogin = adminlogin;
exports.login = login;

//export one by one product
// Exporting all post, get, update, delete method for screen product

//export one by one product
// Exporting all post, get, update, delete method for moview product

exports.movieProduct = movieProduct;
exports.getMovieProduct = getMovieProduct;
exports.getMovieProductById = getMovieProductById;
exports.updateMovieProductById = updateMovieProductById;
exports.deleteMovieProductById = deleteMovieProductById;
exports.addReviewToMovie = addReviewToMovie;

// Exporting all post, get, update, delete method for schedule product

exports.scheduleProduct = scheduleProduct;
exports.getscheduleProducts = getscheduleProducts;
exports.getScheduleProductById = getScheduleProductById;
exports.updateScheduleProductById = updateScheduleProductById;
exports.getScheduleProductByMovieName = getScheduleProductByMovieName;
exports.deleteScheduleProducById = deleteScheduleProducById;

//---------------------------------------------------------------------------

exports.getDashboardStats = getDashboardStats;