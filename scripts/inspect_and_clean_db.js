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

async function inspectAndFix() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL!');

    // 1. Inspect existing students
    const studentsRes = await client.query('SELECT id, code, name, status FROM public.students;');
    console.log(`\nFound ${studentsRes.rows.length} students in Supabase:`);
    studentsRes.rows.forEach((s) => console.log(` - #${s.code}: ${s.name} (${s.status}) [ID: ${s.id}]`));

    // 2. Inspect attendance, subscriptions, exams
    const attRes = await client.query('SELECT COUNT(*) FROM public.attendance;');
    const subRes = await client.query('SELECT COUNT(*) FROM public.subscriptions;');
    console.log(`Attendance records count: ${attRes.rows[0].count}`);
    console.log(`Subscriptions records count: ${subRes.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspectAndFix();
