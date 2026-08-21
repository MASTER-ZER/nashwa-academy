const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
let databaseUrl = '';
for (const line of envFile.split('\n')) {
  if (line.trim().startsWith('DATABASE_URL=')) {
    databaseUrl = line.trim().substring('DATABASE_URL='.length).trim();
    if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
      databaseUrl = databaseUrl.slice(1, -1);
    }
  }
}

async function alterTables() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase DB!');

    console.log('🔄 Adding birth_date and photo_url to students, and require_student_photo to system_settings...');
    await client.query(`
      ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date TEXT DEFAULT '';
      ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
      ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS require_student_photo BOOLEAN DEFAULT FALSE;
    `);

    console.log('🎉 Columns added successfully to Supabase DB tables!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

alterTables();
