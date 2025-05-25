//import mongoose
const mongoose = require('mongoose');
const uniqueValidator=require('mongoose-unique-validator');

//create the schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
    usertype:{type:String,required:true,default:'Admin'}
});
//we have to add the validator to the schema
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Admin', userSchema);
