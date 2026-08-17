const { Client } = require('pg');

const connectionString = 'postgresql://postgres.jjlgdihlwwhkxoymrhrw:whZnJICv14UFl7yU@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function updateFee() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase. Updating subscription default amounts to 250 EGP...');
    await client.query(`
      ALTER TABLE public.subscriptions ALTER COLUMN amount SET DEFAULT 250.00;
      UPDATE public.subscriptions SET amount = 250.00;
    `);
    console.log('Subscription amounts updated to 250 EGP successfully! ✅');
  } catch (err) {
    console.error('Error updating fee:', err);
  } finally {
    await client.end();
  }
}

updateFee();
