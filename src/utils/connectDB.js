import { connect, connection } from 'mongoose';
 
const connected = {
  isConnected: false,
};
 
export async function connectDB() {
  if (connected.isConnected) return;
  try {
    const db = await connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      serverSelectionTimeoutMS: 5000, // Aumenta el tiempo de espera de la conexión
    });
    connected.isConnected = db.connections[0].readyState;
    console.log(db.connection.db.databaseName);
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1); // Salir del proceso si no se puede conectar con la base de datos
  }
}
 
connection.on('connected', () => {
  console.log('Database connected');
});

connection.on('error', (err) => {
  console.error('Database connection error:', err);
});
