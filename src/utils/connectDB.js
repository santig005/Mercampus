import { logger } from '@/lib/logger';
import { connect } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

const connected = {
  isConnected: false,
};

export async function connectDB() {
  if (connected.isConnected) {
    logger.debug('Already connected to the database');
    return;
  }

  const db = await connect(MONGODB_URI);
  connected.isConnected = db.connections[0].readyState;
  logger.debug('Database connected to:', db.connection.db.databaseName);
}
