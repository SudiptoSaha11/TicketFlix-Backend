const User = require('../../models/user');         // adjust paths to your models
const Product5 = require('../../models/Booking')// booking model
const Product1 = require('../../models/Movieschema') // movie model

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers    = await User.countDocuments();
    const totalBookings = await Product5.countDocuments();
    const totalMovies   = await Product1.countDocuments();

    return res.json({
      totalUsers,
      totalBookings,
      totalMovies,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return res.status(500).json({ message: "Fetching stats failed." });
  }
};

module.exports = { getDashboardStats };
