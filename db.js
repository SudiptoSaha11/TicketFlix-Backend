const mongoose = require("mongoose");

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    console.log("Already connected to MongoDB.");
    return;
  }
  
  try {
    await mongoose.connect(
      "mongodb+srv://ghoshdebojit1999:gnKkhAnXzzeogwCO@backend.ut2nn.mongodb.net/?retryWrites=true&w=majority&appName=Backend",
    );
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
