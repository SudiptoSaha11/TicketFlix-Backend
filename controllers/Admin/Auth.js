const { validationResult } = require('express-validator');
const Admin = require('../../models/Admin'); // adjust path if your model file name differs

// Admin signup
const adminsignup = async (req, res) => {
    const { name, email, password, usertype } = req.body;
  
    // basic validation inside controller
    if (!email || !password || password.length < 8) {
      return res.status(422).json({ message: 'Invalid inputs passed, please check your data.' });
    }
  
    let existingUser;
    try {
      existingUser = await Admin.findOne({ email: email }).exec();
    } catch (err) {
      return res.status(500).json({ message: 'Signing up failed, please try again later.' });
    }
  
    if (existingUser) {
      return res.status(422).json({ message: 'User exists already, please login instead.' });
    }
  
    const createdUser = new Admin({ name, email, password, usertype });
  
    try {
      await createdUser.save();
    } catch (err) {
      return res.status(500).json({ message: 'Signing up failed, please try again.' });
    }
  
    return res.status(201).json({ user: createdUser.toObject({ getters: true }) });
  };
  
  const adminlogin = async (req, res) => {
    const { email, password } = req.body;
  
    let existingAdmin;
    try {
      existingAdmin = await Admin.findOne({ email: email }).exec();
    } catch (err) {
      return res.status(500).json({ message: 'Logging in failed, please try again later.' });
    }
  
    if (!existingAdmin || existingAdmin.password !== password || existingAdmin.usertype !== "Admin") {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
  
    return res.status(200).json({ Admin: existingAdmin.toObject({ getters: true }) });
  };

module.exports = { adminsignup, adminlogin };
