import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return drizzle(neon(url), { schema });
  } catch {
    return null;
  }
}

let _db: ReturnType<typeof drizzle> | null = null;
let _tried = false;

function getDb() {
  if (!_tried) {
    _db = createDb() as any;
    _tried = true;
  }
  return _db;
}

// Proxy that lazily initializes and gives clear errors
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) {
      throw new Error('DB_NOT_CONFIGURED');
    }
    return (instance as any)[prop];
  },
});

export function isDbAvailable(): boolean {
  return !!getDb();
}

export { schema };