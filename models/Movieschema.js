// Import the mongoose
const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

// Create the Movie schema
const movie = new mongoose.Schema({
  movieName: { type: String, required: true },
  image: { type: String },
  movieGenre: { type: String, required: true },
  movieLanguage: { type: String, required: true },
  movieDuration: { type: String, required: true },
  movieCast: [{
    name: { type: String, required: true },
    image: { type: String, required: true } // URL or Base64 image
  }],
  movieDescription: { type: String, required: true },
  movieReleasedate: { type: Date, required: true },
  trailerLink: { type: String }, // Field for YouTube trailer link
  movieFormat: { type: String, required: true },
  // New field for reviews and ratings
  reviews: [{
    user: {
      type: String,  // store as plain text
      required: false
    },
    rating: { 
      type: Number, 
      min: 0, 
      max: 10, 
      required: true 
    },
    review: { 
      type: String 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

movie.plugin(uniqueValidator);
module.exports = mongoose.models.movieschema || mongoose.model('movieschema', movie);