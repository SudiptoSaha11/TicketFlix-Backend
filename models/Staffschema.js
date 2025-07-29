const mongoose = require('mongoose');
const StaffSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,              // store a bcrypt hash in prod
});
module.exports = mongoose.model('Staff', StaffSchema);
