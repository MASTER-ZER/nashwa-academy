const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read .env.local manually to get DATABASE_URL
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const envLines = envFile.split('\n');
let databaseUrl = '';

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.substring('DATABASE_URL='.length).trim();
    // remove quotes if present
    if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
      databaseUrl = databaseUrl.slice(1, -1);
    }
  }
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to Supabase DB!');

    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf-8');
    console.log('🔄 Executing schema.sql migration...');
    
    // Execute SQL script
    await client.query(schemaSql);
    console.log('🎉 Migration executed successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Verified Public Tables in Database:');
    res.rows.forEach((r) => console.log(` - ${r.table_name}`));

    // Test sequence & atomic RPC
    const seqRes = await client.query("SELECT get_next_student_code() AS next_code;");
    console.log(`\n🔢 Tested get_next_student_code() RPC output: #${seqRes.rows[0].next_code}`);

    // Verify system settings
    const settingsRes = await client.query("SELECT * FROM public.system_settings WHERE id = 'main_settings';");
    console.log('\n⚙️ System Settings record:');
    console.log(settingsRes.rows[0]);

  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
