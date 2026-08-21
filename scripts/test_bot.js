async function testTelegram() {
  const token = '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
  const chatId = '6602868710';
  const text = '🌸 <b>اختبار تشغيل بوت أكاديمية مس نشوى بنجاح!</b> 🌸\n\n✅ البوت يعمل 100% وجاهز لاستقبال طلبات الطلاب وإشعارات الحضور والامتحانات.';

  console.log('🔄 Sending test message to Telegram...');
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  const json = await res.json();
  console.log('Telegram Response:', json);
  if (json.ok) {
    console.log('🎉 Message delivered to Telegram successfully!');
  }
}

testTelegram();
