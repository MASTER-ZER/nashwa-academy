const { Client } = require('pg');

const connectionString = 'postgresql://postgres.jjlgdihlwwhkxoymrhrw:whZnJICv14UFl7yU@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function fixAttendanceSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase. Updating constraints and tables...');

    // Drop restrictive checks if any
    await client.query(`
      ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
      ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('ATTENDED', 'MAKEUP', 'LATE', 'ABSENT'));
      
      -- Make sure default session exists
      INSERT INTO public.sessions (id, group_id, title, date, time)
      VALUES 
        ('sess-grp-1-today', 'grp-1', 'حصة اليوم', CURRENT_DATE, '01:00 PM'),
        ('sess-grp-2-today', 'grp-2', 'حصة اليوم', CURRENT_DATE, '03:00 PM'),
        ('sess-grp-3-today', 'grp-3', 'حصة اليوم', CURRENT_DATE, '02:00 PM')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Schema fixed successfully! ✅');
  } catch (err) {
    console.error('Error fixing schema:', err);
  } finally {
    await client.end();
  }
}

fixAttendanceSchema();
