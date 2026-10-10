import mongoose from 'mongoose';
import { env } from './env';

export interface DbStatus {
  isConnected: boolean;
  isReplicaSet: boolean;
  host: string;
  name: string;
}

let dbStatus: DbStatus = {
  isConnected: false,
  isReplicaSet: false,
  host: '',
  name: ''
};

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    const adminDb = conn.connection.db?.admin();
    let isReplicaSet = false;

    if (adminDb) {
      try {
        const serverStatus = await adminDb.serverStatus();
        isReplicaSet = Boolean(serverStatus.repl);
      } catch {
        // Fallback check if serverStatus is restricted by permissions
        const client = conn.connection.getClient();
        isReplicaSet = Boolean(client?.options?.replicaSet);
      }
    }

    dbStatus = {
      isConnected: true,
      isReplicaSet,
      host: conn.connection.host,
      name: conn.connection.name
    };

    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    if (isReplicaSet) {
      console.log('[DB] Topology: Replica Set active (Multi-document transactions supported).');
    } else {
      console.log('[DB] Topology: Standalone (Using single-document atomic operations for local environment).');
    }

    return conn;
  } catch (error) {
    console.error('[DB] MongoDB Connection Failure:', error);
    dbStatus.isConnected = false;
    throw error;
  }
};

export const getDbStatus = (): DbStatus => dbStatus;
