const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const envLines = envFile.split('\n');
let botToken = '';
let webhookSecret = '';

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('TELEGRAM_BOT_TOKEN=')) {
    botToken = trimmed.substring('TELEGRAM_BOT_TOKEN='.length).trim();
  }
  if (trimmed.startsWith('TELEGRAM_WEBHOOK_SECRET=')) {
    webhookSecret = trimmed.substring('TELEGRAM_WEBHOOK_SECRET='.length).trim();
  }
}

async function setWebhook() {
  const webhookUrl = 'https://nashwa-academy.vercel.app/api/telegram';
  const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(webhookSecret)}`;

  console.log('🔄 Registering Telegram Webhook with secret token...');
  const res = await fetch(url);
  const json = await res.json();
  console.log('Telegram API Response:', json);
  if (json.ok) {
    console.log('🎉 Webhook registered and verified successfully!');
  }
}

setWebhook();
