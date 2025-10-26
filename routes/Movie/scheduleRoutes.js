// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../../controllers/Movie/scheduleController');

router.post('/Scheduleschema/add', scheduleController.scheduleProduct);
router.get('/scheduleschema', scheduleController.getscheduleProducts);
router.get('/getScheduleschema/:pid', scheduleController.getScheduleProductById);
router.get('/Scheduleschema/movie/:pid', scheduleController.getScheduleProductByMovieName);
router.patch('/Scheduleschema/update/:pid', scheduleController.updateScheduleProductById);
router.delete('/Scheduleschema/delete/:pid', scheduleController.deleteScheduleProducById);
router.get('/getShowsByMovieAndhall/movie/:movieName/hall/:hallName', scheduleController.getShowsByMovieAndHall);

module.exports = router;
