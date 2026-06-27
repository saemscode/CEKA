import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.SUPABASE_DB_POOLED_URL;
if (!connectionString) {
  console.error('❌ SUPABASE_DB_POOLED_URL not found in .env');
  process.exit(1);
}

const migrationFilePath = path.resolve(__dirname, '../supabase/migrations/20260703000000_partners_infrastructure.sql');
if (!fs.existsSync(migrationFilePath)) {
  console.error(`❌ Migration file not found at: ${migrationFilePath}`);
  process.exit(1);
}

console.log(' Reading migration SQL...');
const sql = fs.readFileSync(migrationFilePath, 'utf8');

console.log(' Connecting to Supabase PostgreSQL database...');
const { Client } = pg;
const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    console.log('🚀 Running migration queries...');
    await client.query(sql);
    console.log('✅ Migration queries executed successfully!');
  } catch (err) {
    console.error('❌ Error executing migration:', err);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

main();
