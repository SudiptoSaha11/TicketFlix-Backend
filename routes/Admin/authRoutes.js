// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/Admin/Auth');


router.post('/adminsignup', adminController.adminsignup);
router.post('/adminlogin', adminController.adminlogin);

module.exports = router;
