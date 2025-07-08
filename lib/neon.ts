import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, integer, boolean, varchar, json } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Database Schema
export const statusChecks = pgTable('status_checks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  clientName: text('client_name').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const conversions = pgTable('conversions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sessionId: varchar('session_id', { length: 36 }).notNull().unique(),
  originalFilename: text('original_filename').notNull(),
  convertedFilename: text('converted_filename').notNull(),
  conversionMode: varchar('conversion_mode', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  errorMessage: text('error_message'),
  filePath: text('file_path'), // Store file path instead of using external storage
});

// Database interface types
export interface StatusCheck {
  id: string;
  clientName: string;
  timestamp: Date;
}

export interface Conversion {
  id: string;
  sessionId: string;
  originalFilename: string;
  convertedFilename: string;
  conversionMode: 'debug' | 'sandbox' | 'combined';
  status: 'processing' | 'completed' | 'failed';
  fileSize: number;
  createdAt: Date;
  expiresAt: Date;
  errorMessage?: string;
  filePath?: string;
}

// Helper functions for database operations
export async function createStatusCheck(data: { clientName: string }) {
  const id = crypto.randomUUID();
  const result = await db.insert(statusChecks).values({
    id,
    clientName: data.clientName,
  }).returning();
  
  return result[0];
}

export async function getStatusChecks() {
  return await db.select().from(statusChecks).orderBy(statusChecks.timestamp);
}

export async function createConversion(data: Omit<Conversion, 'id' | 'createdAt'>) {
  const id = crypto.randomUUID();
  const result = await db.insert(conversions).values({
    id,
    sessionId: data.sessionId,
    originalFilename: data.originalFilename,
    convertedFilename: data.convertedFilename,
    conversionMode: data.conversionMode,
    status: data.status,
    fileSize: data.fileSize,
    expiresAt: data.expiresAt,
    errorMessage: data.errorMessage,
    filePath: data.filePath,
  }).returning();
  
  return result[0];
}

export async function updateConversion(sessionId: string, updates: Partial<Conversion>) {
  const result = await db
    .update(conversions)
    .set(updates)
    .where(eq(conversions.sessionId, sessionId))
    .returning();
  
  return result[0];
}

export async function getConversion(sessionId: string) {
  const result = await db
    .select()
    .from(conversions)
    .where(eq(conversions.sessionId, sessionId));
  
  return result[0];
}

export async function deleteConversion(sessionId: string) {
  await db.delete(conversions).where(eq(conversions.sessionId, sessionId));
}

// Initialize database tables
export async function initializeTables() {
  try {
    // Create status_checks table
    await sql`
      CREATE TABLE IF NOT EXISTS status_checks (
        id VARCHAR(36) PRIMARY KEY,
        client_name TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Create conversions table
    await sql`
      CREATE TABLE IF NOT EXISTS conversions (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) UNIQUE NOT NULL,
        original_filename TEXT NOT NULL,
        converted_filename TEXT NOT NULL,
        conversion_mode VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        file_size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        error_message TEXT,
        file_path TEXT
      );
    `;

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
}

export { sql, db };
