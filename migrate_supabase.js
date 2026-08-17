const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.jjlgdihlwwhkxoymrhrw:whZnJICv14UFl7yU@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully! 🚀');

    const sqlPath = path.resolve(__dirname, 'supabase', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing schema.sql...');
    await client.query(sql);
    console.log('Migration executed successfully! All tables and seed data created in Supabase! ✅');

    // Verify groups and students table counts
    const resGroups = await client.query('SELECT count(*) FROM public.groups');
    const resStudents = await client.query('SELECT count(*) FROM public.students');
    console.log(`Verified: ${resGroups.rows[0].count} groups, ${resStudents.rows[0].count} students in Supabase.`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

runMigration();
