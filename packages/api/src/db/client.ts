import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()
import type { QueryResult, QueryResultRow } from 'pg'

let pool: Pool | undefined

export function getDbPool(): Pool {
  if (pool) return pool

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada. Define DATABASE_URL en el entorno del paquete @que-hacer-en/api')
  }

  pool = new Pool({ connectionString: databaseUrl })
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>>
{ return getDbPool().query<T>(sql, params) }


