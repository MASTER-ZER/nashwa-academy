import { Student, Group } from '@/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '6602868710';

export async function sendTelegramMessage(text: string, replyMarkup?: any): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    const result = await res.json();
    return result.ok;
  } catch (error) {
    console.error('Telegram notification error:', error);
    return false;
  }
}

export async function notifyNewStudentRegistration(student: Student, group?: Group | null) {
  const groupName = group ? group.name : 'غير محدد';
  const cleanParentPhone = student.parentPhone.replace(/\D/g, '').replace(/^0/, '20');

  const messageText = `
🌸 <b>طلب تسجيل طالب جديد في الأكاديمية!</b> 🌸

👤 <b>اسم الطالب:</b> ${student.name}
🔢 <b>الكود المقترح:</b> <code>#${student.code}</code>
📞 <b>هاتف الطالب:</b> <code>${student.phone}</code>
👨‍👦 <b>ولي الأمر:</b> ${student.parentName} (<code>${student.parentPhone}</code>)
📍 <b>العنوان:</b> ${student.address || 'غير مسجل'}
⏰ <b>المجموعة:</b> ${groupName}
📅 <b>تاريخ التقديم:</b> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}

💵 <b>الاشتراك الشهري:</b> 250 جنيه مصري
`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ قبول الطالب وتفعيل الكود',
          callback_data: `approve:${student.id}:${student.code}`,
        },
        {
          text: '❌ رفض الطلب',
          callback_data: `reject:${student.id}:${student.code}`,
        },
      ],
      [
        {
          text: '💬 واتساب ولي الأمر',
          url: `https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(
            `أهلاً بحضرتك يا فندم بخصوص تسجيل ابنك الطالب ${student.name} في درس العلوم المتكاملة مع مس نشوى.`
          )}`,
        },
      ],
    ],
  };

  return sendTelegramMessage(messageText, inlineKeyboard);
}
