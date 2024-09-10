import { connect, connection } from 'mongoose';

const connected = {
  isConnected: false,
};

export async function connectDB() {
  if (connected.isConnected) return;
  const db = await connect(process.env.MONGO_URI);
  connected.isConnected = db.connections[0].readyState;
  console.log(db.connection.db.databaseName);
}

connection.on('connected', () => {
  console.log('Database connected');
});

connection.on('error', err => {
  console.log('Database connection error', err);
});
