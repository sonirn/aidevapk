import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

const sql = neon(process.env.DATABASE_URL)

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

export interface ChatMessage {
  id: string
  session_id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, any>
  created_at: string
}

export interface DetectedIssue {
  id: string
  issue_type: string
  severity: "low" | "medium" | "high" | "critical"
  description: string
  suggested_fix?: string
  status: "detected" | "fixing" | "fixed" | "ignored"
  auto_fix_applied: boolean
  created_at: string
  resolved_at?: string
}

export class DatabaseService {
  // Conversion operations
  static async createConversion(data: {
    session_id: string
    original_filename: string
    file_size: number
    conversion_mode: "debug" | "sandbox" | "combined"
  }): Promise<Conversion> {
    const result = await sql`
      INSERT INTO conversions (session_id, original_filename, file_size, conversion_mode)
      VALUES (${data.session_id}, ${data.original_filename}, ${data.file_size}, ${data.conversion_mode})
      RETURNING *
    `
    return result[0] as Conversion
  }

  static async updateConversion(id: string, updates: Partial<Conversion>): Promise<Conversion> {
    const result = await sql`
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
    const result = await sql`
      SELECT * FROM conversions WHERE id = ${id}
    `
    return (result[0] as Conversion) || null
  }

  static async getConversionsBySession(sessionId: string): Promise<Conversion[]> {
    const result = await sql`
      SELECT * FROM conversions 
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
    `
    return result as Conversion[]
  }

  // System log operations
  static async createSystemLog(data: {
    level: "info" | "warn" | "error" | "debug"
    message: string
    source: string
    metadata?: Record<string, any>
  }): Promise<SystemLog> {
    const result = await sql`
      INSERT INTO system_logs (level, message, source, metadata)
      VALUES (${data.level}, ${data.message}, ${data.source}, ${JSON.stringify(data.metadata || {})})
      RETURNING *
    `
    return result[0] as SystemLog
  }

  static async getSystemLogs(
    options: {
      level?: string
      source?: string
      limit?: number
      offset?: number
    } = {},
  ): Promise<SystemLog[]> {
    const { level, source, limit = 100, offset = 0 } = options

    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (level) {
      whereClause += " AND level = $" + (params.length + 1)
      params.push(level)
    }

    if (source) {
      whereClause += " AND source = $" + (params.length + 1)
      params.push(source)
    }

    const query = `
      SELECT * FROM system_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} 
      OFFSET $${params.length + 2}
    `

    params.push(limit, offset)

    const result = await sql(query, ...params)
    return result as SystemLog[]
  }

  // Chat operations
  static async createChatMessage(data: {
    session_id: string
    role: "user" | "assistant"
    content: string
    metadata?: Record<string, any>
  }): Promise<ChatMessage> {
    const result = await sql`
      INSERT INTO chat_history (session_id, role, content, metadata)
      VALUES (${data.session_id}, ${data.role}, ${data.content}, ${JSON.stringify(data.metadata || {})})
      RETURNING *
    `
    return result[0] as ChatMessage
  }

  static async getChatHistory(sessionId: string, limit = 50): Promise<ChatMessage[]> {
    const result = await sql`
      SELECT * FROM chat_history 
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `
    return result as ChatMessage[]
  }

  // Issue detection operations
  static async createDetectedIssue(data: {
    issue_type: string
    severity: "low" | "medium" | "high" | "critical"
    description: string
    suggested_fix?: string
  }): Promise<DetectedIssue> {
    const result = await sql`
      INSERT INTO detected_issues (issue_type, severity, description, suggested_fix)
      VALUES (${data.issue_type}, ${data.severity}, ${data.description}, ${data.suggested_fix})
      RETURNING *
    `
    return result[0] as DetectedIssue
  }

  static async updateDetectedIssue(
    id: string,
    updates: {
      status?: "detected" | "fixing" | "fixed" | "ignored"
      auto_fix_applied?: boolean
      resolved_at?: string
    },
  ): Promise<DetectedIssue> {
    const result = await sql`
      UPDATE detected_issues 
      SET status = ${updates.status}, 
          auto_fix_applied = ${updates.auto_fix_applied},
          resolved_at = ${updates.resolved_at}
      WHERE id = ${id}
      RETURNING *
    `
    return result[0] as DetectedIssue
  }

  static async getActiveIssues(): Promise<DetectedIssue[]> {
    const result = await sql`
      SELECT * FROM detected_issues 
      WHERE status IN ('detected', 'fixing')
      ORDER BY severity DESC, created_at DESC
    `
    return result as DetectedIssue[]
  }

  // Cleanup operations
  static async cleanupExpiredRecords(): Promise<number> {
    const result = await sql`
      DELETE FROM conversions 
      WHERE expires_at < NOW()
      RETURNING COUNT(*) as deleted_count
    `
    return result[0]?.deleted_count || 0
  }

  // Health check
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const result = await sql`SELECT NOW() as timestamp`
      return {
        status: "healthy",
        timestamp: result[0].timestamp,
      }
    } catch (error) {
      throw new Error(`Database health check failed: ${error}`)
    }
  }
}

export { sql }

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
    source: "runtime",
    metadata,
  })
}
