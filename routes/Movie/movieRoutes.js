// routes/movieRoutes.js
const express = require('express');
const router = express.Router();
const movieController = require('../../controllers/Movie/movieController');

// keep the exact same endpoints so frontend doesn't change
router.post('/movieschema/add', movieController.movieProduct);
router.get('/movieview', movieController.getMovieProduct);
router.get('/getmovieview/:pid', movieController.getMovieProductById);
router.patch('/movieview/update/:pid', movieController.updateMovieProductById);
router.delete('/movieview/delete/:pid', movieController.deleteMovieProductById);
router.post('/movieview/review/:pid', movieController.addReviewToMovie);

module.exports = router;
