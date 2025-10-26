const HttpError = require('../../models/http-error'); 
const Product1 = require('../../models/Movieschema')  

const movieProduct = async (req, res, next) => {
  try {
    const {
      movieName,
      movieGenre,
      movieLanguage,
      movieDuration,
      movieDescription,
      movieReleasedate,
      trailerLink,
      movieFormat,
      movieCensor,
      image,
      movieCast = [],   // assume arrays from frontend
      movieCrew = []
    } = req.body;

    // Map entries to expected DB shape (defensive but simple)
    const parsedMovieCast = (movieCast || []).map(m => ({
      name: m.name,
      image: m.image
    }));

    const parsedMovieCrew = (movieCrew || []).map(m => ({
      name: m.name,
      role: m.role,
      image: m.image
    }));

    const movie = new Product1({
      movieName,
      image,
      movieGenre,
      movieLanguage,
      movieDuration,
      movieCast: parsedMovieCast,
      movieCrew: parsedMovieCrew,
      movieDescription,
      movieReleasedate,
      trailerLink,
      movieFormat,
      movieCensor
    });

    const result = await movie.save();
    res.status(201).json({ product: result });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Creating product failed, please try again.', 500));
  }
};

/**
 * Get all movies
 */
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

  const urlBase = 'http://localhost:5000/uploads/';
  const imageURL = product.image && product.image.startsWith('http')
    ? product.image
    : (product.image ? `${urlBase}${product.image}` : null);

  const castWithURLs = (product.movieCast || []).map(c => ({
    name: c.name,
    image: c.image && c.image.startsWith('http') ? c.image : (c.image ? `${urlBase}${c.image}` : null)
  }));

  const crewWithURLs = (product.movieCrew || []).map(c => ({
    name: c.name,
    role: c.role,
    image: c.image && c.image.startsWith('http') ? c.image : (c.image ? `${urlBase}${c.image}` : null)
  }));

  res.json({
    movieName:        product.movieName,
    movieGenre:       product.movieGenre,
    movieLanguage:    product.movieLanguage,
    movieDuration:    product.movieDuration,
    movieCast:        castWithURLs,
    movieCrew:        crewWithURLs,
    movieDescription: product.movieDescription,
    movieReleasedate: product.movieReleasedate,
    trailerLink:      product.trailerLink,
    movieFormat:      product.movieFormat,
    movieCensor:      product.movieCensor,
    imageURL,
    reviews: product.reviews || []
  });
};

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
    movieCensor,
    image,
    movieCast = [],
    movieCrew = []
  } = req.body;

  const updateData = {
    movieName,
    movieGenre,
    movieLanguage,
    movieDuration,
    movieCast: movieCast.map(m => ({ name: m.name, image: m.image })),
    movieCrew: movieCrew.map(m => ({ name: m.name, role: m.role, image: m.image })),
    movieDescription,
    movieReleasedate,
    trailerLink,
    movieFormat,
    movieCensor,
    image
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

const addReviewToMovie = async (req, res, next) => {
  const movieId = req.params.pid;
  const { rating, review, user } = req.body;
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

module.exports = {movieProduct, getMovieProduct, getMovieProductById, updateMovieProductById, deleteMovieProductById, addReviewToMovie};
