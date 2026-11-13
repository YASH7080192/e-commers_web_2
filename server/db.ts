import mongoose from 'mongoose';
let connection: Promise<typeof mongoose> | undefined;
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable required');
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connection) {
    connection = mongoose.connect(uri).then((connected) => {
      console.log('MongoDB connected');
      return connected;
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}
