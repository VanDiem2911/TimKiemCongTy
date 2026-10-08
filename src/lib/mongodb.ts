import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';
const dbName = process.env.MONGODB_DB_NAME || 'timkiemcongty';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
   
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')));
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
        global._mongoClientPromise = client.connect();
      }
      return await global._mongoClientPromise;
    } else {
      if (!clientPromise) {
        client = new MongoClient(uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
        clientPromise = client.connect();
      }
      return await clientPromise;
    }
  } catch (err) {
    console.warn('MongoDB connection warning (falling back to local/in-memory):', err);
    return null;
  }
}

export async function getDb(): Promise<Db | null> {
  try {
    const mongoClient = await getMongoClient();
    if (!mongoClient) return null;
    return mongoClient.db(dbName);
  } catch (err) {
    console.warn('Failed to get MongoDB database instance:', err);
    return null;
  }
}
