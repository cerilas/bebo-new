import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants';
import { Pool } from 'pg';

import * as schema from '@/models/Schema';

let drizzle;

// Need a database for production? Check out https://www.prisma.io/?via=saasboilerplatesrc
// Tested and compatible with Next.js Boilerplate
if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
  // During build time, don't connect to database at all
  // This prevents build-time database queries
  drizzle = null as any;
} else if (process.env.DATABASE_URL) {
  // Production/Development with real PostgreSQL
  // Use global singleton to prevent multiple pool instances during hot reload
  const globalWithPg = globalThis as unknown as { pgPool: Pool; pgDrizzle: any };

  if (!globalWithPg.pgPool) {
    console.log('🔌 Connecting to PostgreSQL database...');
    globalWithPg.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Max clients in the pool
      idleTimeoutMillis: 30000,
    });
    globalWithPg.pgDrizzle = drizzlePg(globalWithPg.pgPool, { schema });
    console.log('✅ Connected to PostgreSQL');
  }

  drizzle = globalWithPg.pgDrizzle;

  // Migrations should be run manually or during deployment, not at runtime
  // to avoid timeouts and "cold start" issues
  // await migratePg(drizzle, {
  //   migrationsFolder: path.join(process.cwd(), 'migrations'),
  // });
} else {
  // Local development with PGlite (in-memory database)

  console.log('⚠️  No DATABASE_URL found, using PGlite in-memory database');
  // Stores the db connection in the global scope to prevent multiple instances due to hot reloading with Next.js
  const global = globalThis as unknown as { client: PGlite; drizzle: PgliteDatabase<typeof schema>; migrated: boolean };

  if (!global.client) {
    global.client = new PGlite();
    await global.client.waitReady;

    global.drizzle = drizzlePglite(global.client, { schema });
    global.migrated = false;
  }

  drizzle = global.drizzle;

  // Skip migrations for PGlite as it doesn't support DO $$ blocks in migrations
  // If you need migrations with PGlite, you'll need to manually run them or use a PostgreSQL database
  if (!global.migrated) {
    console.log('⚠️  Skipping migrations for PGlite (not supported with DO $$ blocks)');

    console.log('💡 For full functionality, please set DATABASE_URL to use PostgreSQL');
    global.migrated = true;
  }
}

export const db = drizzle;
