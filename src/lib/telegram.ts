import { Student, Group } from '@/types';
import { db } from './storage';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEFAULT_BOT_TOKEN = '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const DEFAULT_ADMIN_CHAT_ID = '6602868710';

export async function sendTelegramMessage(text: string, replyMarkup?: any): Promise<boolean> {
  let botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID || DEFAULT_ADMIN_CHAT_ID;

  if (typeof window !== 'undefined') {
    try {
      const currentSettings = db.getSettings();
      if (currentSettings.telegramBotToken) botToken = currentSettings.telegramBotToken;
      if (currentSettings.telegramAdminChatId) chatId = currentSettings.telegramAdminChatId;
    } catch {}
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
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

  const safeStudentName = escapeHtml(student.name);
  const safeStudentCode = escapeHtml(student.code);
  const safeStudentPhone = escapeHtml(student.phone);
  const safeParentName = escapeHtml(student.parentName);
  const safeParentPhone = escapeHtml(student.parentPhone);
  const safeAddress = escapeHtml(student.address || 'غير مسجل');
  const safeGroupName = escapeHtml(groupName);

  const messageText = `
🌸 <b>طلب تسجيل طالب جديد في الأكاديمية!</b> 🌸

👤 <b>اسم الطالب:</b> ${safeStudentName}
🔢 <b>الكود المقترح:</b> <code>#${safeStudentCode}</code>
📞 <b>هاتف الطالب:</b> <code>${safeStudentPhone}</code>
👨‍👦 <b>ولي الأمر:</b> ${safeParentName} (<code>${safeParentPhone}</code>)
📍 <b>العنوان:</b> ${safeAddress}
⏰ <b>المجموعة:</b> ${safeGroupName}
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
            `أهلاً بحضرتك أستاذ ${student.parentName}، بخصوص طلب تسجيل الطالب (${student.name}) في أكاديمية مس نشوى للعلوم المتكاملة 🌸`
          )}`,
        },
      ],
    ],
  };

  return sendTelegramMessage(messageText, inlineKeyboard);
}
