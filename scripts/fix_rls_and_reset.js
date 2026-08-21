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

async function fixRlsAndReset() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL!');

    console.log('🔄 Dropping old restrictive RLS policies...');
    const dropPoliciesSql = `
      DROP POLICY IF EXISTS "Anon can view groups" ON public.groups;
      DROP POLICY IF EXISTS "Anon can view system_settings" ON public.system_settings;
      DROP POLICY IF EXISTS "Anon can insert pending student" ON public.students;
      DROP POLICY IF EXISTS "Anon can view active students" ON public.students;
      DROP POLICY IF EXISTS "Anon can insert attendance" ON public.attendance;
      DROP POLICY IF EXISTS "Anon can view attendance" ON public.attendance;
      DROP POLICY IF EXISTS "Anon can insert sessions" ON public.sessions;
      DROP POLICY IF EXISTS "Anon can view sessions" ON public.sessions;
      DROP POLICY IF EXISTS "Anon can view subscriptions" ON public.subscriptions;
      DROP POLICY IF EXISTS "Anon can view exams" ON public.exams;
      DROP POLICY IF EXISTS "Anon can view exam_results" ON public.exam_results;

      DROP POLICY IF EXISTS "Allow anon all on students" ON public.students;
      DROP POLICY IF EXISTS "Allow anon all on groups" ON public.groups;
      DROP POLICY IF EXISTS "Allow anon all on sessions" ON public.sessions;
      DROP POLICY IF EXISTS "Allow anon all on attendance" ON public.attendance;
      DROP POLICY IF EXISTS "Allow anon all on subscriptions" ON public.subscriptions;
      DROP POLICY IF EXISTS "Allow anon all on exams" ON public.exams;
      DROP POLICY IF EXISTS "Allow anon all on exam_results" ON public.exam_results;
      DROP POLICY IF EXISTS "Allow anon all on system_settings" ON public.system_settings;
    `;
    await client.query(dropPoliciesSql);

    console.log('🔄 Creating full CRUD policies for application tables...');
    const createPoliciesSql = `
      CREATE POLICY "Allow anon all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on exam_results" ON public.exam_results FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Allow anon all on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
    `;
    await client.query(createPoliciesSql);
    console.log('✅ Full CRUD policies applied to Supabase tables!');

    console.log('🔄 Truncating all student and session data...');
    await client.query(`
      TRUNCATE TABLE public.exam_results CASCADE;
      TRUNCATE TABLE public.exams CASCADE;
      TRUNCATE TABLE public.attendance CASCADE;
      TRUNCATE TABLE public.sessions CASCADE;
      TRUNCATE TABLE public.subscriptions CASCADE;
      TRUNCATE TABLE public.students CASCADE;
      ALTER SEQUENCE IF EXISTS student_code_seq RESTART WITH 101;
    `);
    console.log('🧹 Cleaned all tables and restarted student_code_seq to 101!');

    // Re-verify
    const res = await client.query('SELECT COUNT(*) FROM public.students;');
    console.log(`Current student count in DB: ${res.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixRlsAndReset();
