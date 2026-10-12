import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

let isConnected = false;

export async function connectDB(customUri = null) {
  if (isConnected) {
    logger.debug('Using existing MongoDB connection');
    return mongoose.connection;
  }

  const uri = customUri || env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error', err);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production',
    });
    isConnected = true;
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to establish initial MongoDB connection', error);
    // In production we throw to prevent running in a broken state
    if (env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

export async function disconnectDB() {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  } catch (error) {
    logger.error('Error during MongoDB disconnect', error);
  }
}
