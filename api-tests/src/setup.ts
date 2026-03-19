/**
 * Global setup — runs once before any test file is loaded.
 * Loads .env.test so that DATABASE_URL is available when PrismaClient is
 * instantiated in wasp-server-stub.ts.
 */
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.test') });
