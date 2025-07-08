import { neon } from '@neondatabase/serverless';

// For database queries
const sql = neon(process.env.DATABASE_URL!);

export { sql };
