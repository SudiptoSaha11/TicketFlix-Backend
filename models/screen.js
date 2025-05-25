// import the mongoose
const mongoose = require('mongoose');

// Create the screen schema
const screenSchema = new mongoose.Schema({
    ScreenNumber: { type: Number, required: true },
    MovieName : {type: String, required:true},
    GoldSeat: { type: Number, required: true },
    SilverSeat: { type: Number, required: true },
    PlatinumSeat: { type: Number, required: true },
}) 

module.exports = mongoose.model('Screen', screenSchema)

