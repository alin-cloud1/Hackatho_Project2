import { MongoClient } from "mongodb";
import { config } from "./config.js";

// MongoDB data layer. Every student input/update persists to the
// `anti_kuddus` database — local mongod by default, or set MONGODB_URI
// (e.g. an Atlas connection string) for a remote cluster.

const client = new MongoClient(config.db.uri);

const COLLECTION_NAMES = [
  "students",
  "complaints",
  "seatProfiles",
  "ledgerEntries",
  "sosAlerts",
  "rulebook",
  "curriculumTopics",
];

export const collections = {};
let db = null;

export async function connectDb() {
  if (db) return db;
  await client.connect();
  db = client.db(config.db.name);
  for (const name of COLLECTION_NAMES) collections[name] = db.collection(name);
  await Promise.all([
    collections.students.createIndex({ rollNumber: 1 }, { unique: true }),
    collections.complaints.createIndex({ submitterHash: 1 }),
    collections.complaints.createIndex({ createdAt: -1 }),
    collections.seatProfiles.createIndex({ rollNumber: 1 }, { unique: true }),
    collections.ledgerEntries.createIndex({ createdAt: 1 }),
    collections.sosAlerts.createIndex({ createdAt: -1 }),
    collections.rulebook.createIndex({ id: 1 }, { unique: true }),
  ]);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not connected — call connectDb() first.");
  return db;
}

export async function assertDbConnection() {
  await connectDb();
  await db.command({ ping: 1 });
}

export async function closeDb() {
  await client.close();
  db = null;
}
