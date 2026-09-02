const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return;
  }

  const configuredUri = process.env.MONGODB_URI;

  try {
    if (configuredUri) {
      try {
        await mongoose.connect(configuredUri);
        console.log('MongoDB connected');
        return;
      } catch (atlasError) {
        console.warn('Configured MongoDB unavailable, falling back to in-memory MongoDB:', atlasError.message);
      }
    }

    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.log('MongoDB connected via in-memory server');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
