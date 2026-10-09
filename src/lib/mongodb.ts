import { MongoClient, Db } from 'mongodb';

// Bỏ khoảng trắng, nháy bao quanh và dấu "\" thừa (dán nhầm vào env làm thành w=majority\)
const uri = process.env.MONGODB_URI
  ? process.env.MONGODB_URI.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
  : '';
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
          maxPoolSize: 3,
          minPoolSize: 0,
          maxIdleTimeMS: 10000,
          serverSelectionTimeoutMS: 8000,
        });
        clientPromise = client.connect();
      }
      return await clientPromise;
    }
  } catch (err) {
    // Don't cache a failed connection: let the next request retry.
    const failed = client;
    clientPromise = null;
    client = null;
    global._mongoClientPromise = undefined;
    failed?.close().catch(() => undefined);
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
