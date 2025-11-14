import mongoose from "mongoose";

type MongooseGlobal = typeof globalThis & {
  _mongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

const globalWithMongoose = global as MongooseGlobal;

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? "content_studio";

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not set. Database operations will fail.");
}

export async function connectToDatabase() {
  if (globalWithMongoose._mongoose?.conn) {
    return globalWithMongoose._mongoose.conn;
  }

  if (!globalWithMongoose._mongoose) {
    globalWithMongoose._mongoose = { conn: null, promise: null };
  }

  if (!globalWithMongoose._mongoose.promise) {
    if (!MONGODB_URI) {
      throw new Error("Missing MONGODB_URI environment variable");
    }

    globalWithMongoose._mongoose.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB,
        autoIndex: true,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  globalWithMongoose._mongoose.conn =
    await globalWithMongoose._mongoose.promise;
  return globalWithMongoose._mongoose.conn;
}
