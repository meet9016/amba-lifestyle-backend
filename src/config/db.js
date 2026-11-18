const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 1500, // Quick timeout if MongoDB is not active locally
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`ℹ️ MongoDB not detected locally (${error.message}). Using high-speed In-Memory Data Store.`);
  }
};

module.exports = connectDB;
