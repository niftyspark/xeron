import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Concrete typed handle carrying the schema generic. Without this, `db.query.*`
 * collapses to `{}` and every table access fails typechecking under strict mode.
 */
export type XeronDatabase = NeonHttpDatabase<typeof schema>;

function createDb(): XeronDatabase | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return drizzle(neon(url), { schema });
  } catch {
    return null;
  }
}

let _db: XeronDatabase | null = null;
let _tried = false;

function getDb(): XeronDatabase | null {
  if (!_tried) {
    _db = createDb();
    _tried = true;
  }
  return _db;
}

// Proxy that lazily initialises the connection and surfaces a clear error when
// DATABASE_URL is unset. Typed as XeronDatabase so consumers get full schema
// inference on db.query.*, db.insert(), etc.
export const db = new Proxy({} as XeronDatabase, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) throw new Error('DB_NOT_CONFIGURED');
    return (instance as unknown as Record<string | symbol, unknown>)[prop as string];
  },
});

export function isDbAvailable(): boolean {
  return !!getDb();
}

export { schema };
