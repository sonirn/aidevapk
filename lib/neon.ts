import { neon } from "@neondatabase/serverless"

// Direct database URL - no more environment variable confusion
const NEON_NEON_DATABASE_URL =
  "postgres://neondb_owner:npg_z0pMl7xBowTN@ep-lively-silence-adxk103r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

let sql: ReturnType<typeof neon> | null = null

export const initializeDatabase = () => {
  try {
    sql = neon(NEON_NEON_DATABASE_URL)
    console.log("Database connection initialized successfully with direct URL")
    return sql
  } catch (error) {
    console.error("Failed to initialize database connection:", error)
    return null
  }
}

export const getDatabase = () => {
  if (!sql) {
    sql = initializeDatabase()
  }
  return sql
}

export const executeQuery = async (query: string, params: any[] = []) => {
  const db = getDatabase()

  if (!db) {
    throw new Error("Database connection not available")
  }

  try {
    const result = await db(query, params)
    return result
  } catch (error) {
    console.error("Database query failed:", error)
    throw error
  }
}

export interface Conversion {
  id: string
  session_id: string
  original_filename: string
  file_size: number
  conversion_mode: "debug" | "sandbox" | "combined"
  status: "pending" | "processing" | "completed" | "failed"
  download_url?: string
  error_message?: string
  created_at: string
  updated_at: string
  expires_at: string
}

export interface SystemLog {
  id: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  source: string
  metadata?: Record<string, any>
  created_at: string
}

export class DatabaseService {
  // Conversion operations
  static async createConversion(data: {
    session_id: string
    original_filename: string
    file_size: number
    conversion_mode: "debug" | "sandbox" | "combined"
  }): Promise<Conversion> {
    const db = getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    const result = await db`
      INSERT INTO conversions (session_id, original_filename, file_size, conversion_mode)
      VALUES (${data.session_id}, ${data.original_filename}, ${data.file_size}, ${data.conversion_mode})
      RETURNING *
    `
    return result[0] as Conversion
  }

  static async updateConversion(id: string, updates: Partial<Conversion>): Promise<Conversion> {
    const db = getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    const result = await db`
      UPDATE conversions 
      SET status = ${updates.status}, 
          download_url = ${updates.download_url}, 
          error_message = ${updates.error_message},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0] as Conversion
  }

  static async getConversion(id: string): Promise<Conversion | null> {
    const db = getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    const result = await db`
      SELECT * FROM conversions WHERE id = ${id}
    `
    return (result[0] as Conversion) || null
  }

  static async getConversionsBySession(sessionId: string): Promise<Conversion[]> {
    const db = getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    const result = await db`
      SELECT * FROM conversions 
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
    `
    return result as Conversion[]
  }

  // System log operations (for APK conversion logging only)
  static async createSystemLog(data: {
    level: "info" | "warn" | "error" | "debug"
    message: string
    source: string
    metadata?: Record<string, any>
  }): Promise<SystemLog> {
    const db = getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    const result = await db`
      INSERT INTO system_logs (level, message, source, metadata)
      VALUES (${data.level}, ${data.message}, ${data.source}, ${JSON.stringify(data.metadata || {})})
      RETURNING *
    `
    return result[0] as SystemLog
  }

  // Cleanup operations
  static async cleanupExpiredRecords(): Promise<number> {
    const db = getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    const result = await db`
      DELETE FROM conversions 
      WHERE expires_at < NOW()
      RETURNING COUNT(*) as deleted_count
    `
    return result[0]?.deleted_count || 0
  }

  // Add executeQuery method to DatabaseService
  static async executeQuery(query: string, params: any[] = []) {
    return executeQuery(query, params)
  }
}

// Named exports for backward compatibility
export async function createConversion(data: {
  session_id: string
  original_filename: string
  file_size: number
  conversion_mode: "debug" | "sandbox" | "combined"
}): Promise<Conversion> {
  return DatabaseService.createConversion(data)
}

export async function updateConversion(id: string, updates: Partial<Conversion>): Promise<Conversion> {
  return DatabaseService.updateConversion(id, updates)
}

export async function logRuntimeEvent(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  metadata: Record<string, any> = {},
): Promise<SystemLog> {
  return DatabaseService.createSystemLog({
    level,
    message,
    source: "apk-conversion",
    metadata,
  })
}
