import { Student, Group, ProfileEditRequest } from '@/types';
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

function getTelegramCredentials() {
  let botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID || DEFAULT_ADMIN_CHAT_ID;

  if (typeof window !== 'undefined') {
    try {
      const currentSettings = db.getSettings();
      if (currentSettings.telegramBotToken) botToken = currentSettings.telegramBotToken;
      if (currentSettings.telegramAdminChatId) chatId = currentSettings.telegramAdminChatId;
    } catch {}
  }
  return { botToken, chatId };
}

export async function sendTelegramMessage(
  text: string,
  replyMarkup?: any
): Promise<{ ok: boolean; messageId?: number }> {
  const { botToken, chatId } = getTelegramCredentials();

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
    return { ok: !!result.ok, messageId: result.result?.message_id };
  } catch (error) {
    console.error('Telegram notification error:', error);
    return { ok: false };
  }
}

export async function sendTelegramPhoto(
  photoBase64: string,
  caption: string,
  replyMarkup?: any
): Promise<{ ok: boolean; messageId?: number }> {
  const { botToken, chatId } = getTelegramCredentials();

  try {
    // If it's a data URL, convert to Blob
    if (photoBase64.startsWith('data:image/')) {
      const parts = photoBase64.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, 'student_photo.jpg');
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
      if (replyMarkup) {
        formData.append('reply_markup', JSON.stringify(replyMarkup));
      }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.ok) return { ok: true, messageId: result.result?.message_id };
    }
  } catch (err) {
    console.warn('sendPhoto failed, falling back to message:', err);
  }

  // Fallback to regular text message
  return sendTelegramMessage(caption, replyMarkup);
}

export async function editTelegramMessageText(
  messageId: number,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials();
  try {
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup || { inline_keyboard: [] },
      }),
    });
    const result = await res.json();
    return !!result.ok;
  } catch (error) {
    console.error('editMessageText failed:', error);
    return false;
  }
}

export async function editTelegramMessageCaption(
  messageId: number,
  caption: string,
  replyMarkup?: any
): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials();
  try {
    const url = `https://api.telegram.org/bot${botToken}/editMessageCaption`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup || { inline_keyboard: [] },
      }),
    });
    const result = await res.json();
    return !!result.ok;
  } catch (error) {
    console.error('editMessageCaption failed:', error);
    return false;
  }
}

export async function notifyDashboardActionToTelegram(params: {
  action: 'APPROVE_STUDENT_PAID' | 'APPROVE_STUDENT_UNPAID' | 'REJECT_STUDENT' | 'APPROVE_EDIT' | 'REJECT_EDIT';
  studentName?: string;
  studentCode?: string;
  telegramMessageId?: number;
  details?: string;
}) {
  const { action, studentName, studentCode, telegramMessageId, details } = params;
  const timeStr = new Date().toLocaleTimeString('ar-EG');
  const safeName = escapeHtml(studentName || '');
  const safeCode = escapeHtml(studentCode || '');

  let updateNote = '';

  if (action === 'APPROVE_STUDENT_PAID') {
    updateNote = `✅ <b>تم قبول واعتماد تسجيل الطالب (#${safeCode} - ${safeName}) مع تفعيل اشتراك الشهر (مدفوع) بواسطة مس نشوى من لوحة التحكم 💻</b> (${timeStr})`;
  } else if (action === 'APPROVE_STUDENT_UNPAID') {
    updateNote = `✅ <b>تم قبول واعتماد تسجيل الطالب (#${safeCode} - ${safeName}) [الاشتراك معلق لحين الحضور] بواسطة مس نشوى من لوحة التحكم 💻</b> (${timeStr})`;
  } else if (action === 'REJECT_STUDENT') {
    updateNote = `❌ <b>تم رفض وحذف طلب تسجيل الطالب (#${safeCode} - ${safeName}) بواسطة مس نشوى من لوحة التحكم 💻</b> (${timeStr})`;
  } else if (action === 'APPROVE_EDIT') {
    updateNote = `✅ <b>تم قبول واعتماد طلب تعديل بيانات الطالب (#${safeCode} - ${safeName}) وتحديث الكارت والملف فوراً بواسطة مس نشوى من لوحة التحكم 💻🌸</b> (${timeStr})`;
  } else if (action === 'REJECT_EDIT') {
    updateNote = `❌ <b>تم رفض طلب تعديل بيانات الطالب (#${safeCode} - ${safeName}) بواسطة مس نشوى من لوحة التحكم 💻</b> (${timeStr})`;
  }

  // 1. If we have the original Telegram message ID, edit it directly so buttons vanish and status appears
  if (telegramMessageId) {
    const editPayload = `${updateNote}${details ? `\n\n${details}` : ''}`;
    const textUpdated = await editTelegramMessageText(telegramMessageId, editPayload);
    if (!textUpdated) {
      // Might be a photo message, so edit caption
      await editTelegramMessageCaption(telegramMessageId, editPayload);
    }
  }

  // 2. Also send a brief real-time status message to the Telegram admin chat so Miss Nashwa sees the live event
  await sendTelegramMessage(updateNote);
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
  const safeBirthDate = escapeHtml(student.birthDate || 'غير مسجل');
  const safeGroupName = escapeHtml(groupName);

  const messageText = `
🌸 <b>طلب تسجيل طالب جديد في الأكاديمية!</b> 🌸

👤 <b>اسم الطالب:</b> ${safeStudentName}
🔢 <b>الكود المقترح:</b> <code>#${safeStudentCode}</code>
🎂 <b>تاريخ الميلاد:</b> <code>${safeBirthDate}</code>
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
          text: '✅ قبول + تفعيل الاشتراك (مدفوع)',
          callback_data: `approve_paid:${student.id}:${student.code}`,
        },
      ],
      [
        {
          text: '⏳ قبول فقط (الاشتراك معلق)',
          callback_data: `approve_unpaid:${student.id}:${student.code}`,
        },
        {
          text: '❌ رفض الطلب',
          callback_data: `reject:${student.id}:${student.code}`,
        },
      ],
      [
        {
          text: '💬 واتساب ولي الأمر (صورة الكارت)',
          url: `https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(
            `أهلاً بحضرتك أستاذ ${student.parentName}، بخصوص طلب تسجيل الطالب (${student.name}) في أكاديمية مس نشوى للعلوم المتكاملة 🌸`
          )}`,
        },
      ],
    ],
  };

  if (student.photoUrl) {
    return sendTelegramPhoto(student.photoUrl, messageText, inlineKeyboard);
  }

  return sendTelegramMessage(messageText, inlineKeyboard);
}

export async function notifyStudentProfileUpdate(
  student: Student,
  group?: Group | null
) {
  const groupName = group ? group.name : 'غير محدد';
  const cleanParentPhone = student.parentPhone.replace(/\D/g, '').replace(/^0/, '20');

  const safeStudentName = escapeHtml(student.name);
  const safeStudentCode = escapeHtml(student.code);
  const safeStudentPhone = escapeHtml(student.phone);
  const safeParentName = escapeHtml(student.parentName);
  const safeParentPhone = escapeHtml(student.parentPhone);
  const safeAddress = escapeHtml(student.address || 'غير مسجل');
  const safeBirthDate = escapeHtml(student.birthDate || 'غير مسجل');
  const safeGroupName = escapeHtml(groupName);

  const messageText = `
✏️ <b>إشعار تحديث بيانات طالب (#${safeStudentCode})</b> 🌸

👤 <b>اسم الطالب:</b> ${safeStudentName}
🔢 <b>كود الطالب:</b> <code>#${safeStudentCode}</code>
🎂 <b>تاريخ الميلاد:</b> <code>${safeBirthDate}</code>
📞 <b>هاتف الطالب:</b> <code>${safeStudentPhone}</code>
👨‍👦 <b>ولي الأمر:</b> ${safeParentName} (<code>${safeParentPhone}</code>)
📍 <b>العنوان:</b> ${safeAddress}
⏰ <b>المجموعة:</b> ${safeGroupName}
🕒 <b>وقت التعديل:</b> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '📂 فتح لوحة تحكم الطلاب',
          url: 'https://nashwa-academy.vercel.app/dashboard/students',
        },
        {
          text: '💬 واتساب ولي الأمر',
          url: `https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(
            `أهلاً بحضرتك أستاذ ${student.parentName}، تم استلام تحديث بيانات الطالب (${student.name}) في أكاديمية مس نشوى 🌸`
          )}`,
        },
      ],
    ],
  };

  if (student.photoUrl) {
    return sendTelegramPhoto(student.photoUrl, messageText, inlineKeyboard);
  }

  return sendTelegramMessage(messageText, inlineKeyboard);
}

export async function notifyProfileEditRequest(
  reqId: string,
  student: Student,
  proposed: {
    name: string;
    phone: string;
    parentName: string;
    parentPhone: string;
    address: string;
    birthDate: string;
    photoUrl?: string;
    groupId: string;
  },
  groupName?: string,
  originalGroupName?: string
) {
  const cleanParentPhone = proposed.parentPhone.replace(/\D/g, '').replace(/^0/, '20');

  // Compute exact list of changed fields
  const changedList: string[] = [];

  if (proposed.name && proposed.name.trim() !== student.name.trim()) {
    changedList.push(`• 👤 <b>اسم الطالب:</b> تم تعديله من <i>"${escapeHtml(student.name)}"</i> ⬅️ إلى <b>"${escapeHtml(proposed.name)}"</b>`);
  }
  if (proposed.phone && proposed.phone.trim() !== student.phone.trim()) {
    changedList.push(`• 📞 <b>هاتف الطالب:</b> تم تعديله من <code>${escapeHtml(student.phone)}</code> ⬅️ إلى <code>${escapeHtml(proposed.phone)}</code>`);
  }
  if (proposed.parentName && proposed.parentName.trim() !== student.parentName.trim()) {
    changedList.push(`• 👨‍👦 <b>اسم ولي الأمر:</b> تم تعديله من <i>"${escapeHtml(student.parentName)}"</i> ⬅️ إلى <b>"${escapeHtml(proposed.parentName)}"</b>`);
  }
  if (proposed.parentPhone && proposed.parentPhone.trim() !== student.parentPhone.trim()) {
    changedList.push(`• 📱 <b>هاتف ولي الأمر:</b> تم تعديله من <code>${escapeHtml(student.parentPhone)}</code> ⬅️ إلى <code>${escapeHtml(proposed.parentPhone)}</code>`);
  }
  if (proposed.groupId && proposed.groupId !== student.groupId) {
    changedList.push(`• ⏰ <b>المجموعة:</b> تم تغييرها من <i>"${escapeHtml(originalGroupName || 'المجموعة الحالية')}"</i> ⬅️ إلى <b>"${escapeHtml(groupName || 'المجموعة الجديدة')}"</b>`);
  }
  if (proposed.address && proposed.address.trim() !== (student.address || '').trim()) {
    changedList.push(`• 📍 <b>العنوان:</b> تم تعديله من <i>"${escapeHtml(student.address || 'غير مسجل')}"</i> ⬅️ إلى <b>"${escapeHtml(proposed.address)}"</b>`);
  }
  if (proposed.birthDate && proposed.birthDate.trim() !== (student.birthDate || '').trim()) {
    changedList.push(`• 🎂 <b>تاريخ الميلاد:</b> من <code>${escapeHtml(student.birthDate || 'غير مسجل')}</code> ⬅️ إلى <code>${escapeHtml(proposed.birthDate)}</code>`);
  }
  if (proposed.photoUrl && proposed.photoUrl !== student.photoUrl) {
    changedList.push(`• 📸 <b>الصورة الشخصية:</b> قام الطالب برفع صورة شخصية جديدة لحسابه`);
  }

  if (changedList.length === 0) {
    changedList.push(`• 📝 تم إرسال طلب تأكيد البيانات الحالية.`);
  }

  const messageText = `
✏️ <b>طلب تعديل بيانات طالب (#${escapeHtml(student.code)})</b> 🌸

📋 <b>التعديلات المطلوبة تحديداً (${changedList.length}):</b>
${changedList.join('\n')}

━━━━━━━━━━━━━━━━━
👤 <b>البيانات الكاملة بعد التعديل المقترح:</b>
• <b>اسم الطالب:</b> ${escapeHtml(proposed.name)}
• <b>كود الطالب:</b> <code>#${escapeHtml(student.code)}</code>
• <b>هاتف الطالب:</b> <code>${escapeHtml(proposed.phone)}</code>
• <b>ولي الأمر:</b> ${escapeHtml(proposed.parentName)} (<code>${escapeHtml(proposed.parentPhone)}</code>)
• <b>المجموعة:</b> ${escapeHtml(groupName || 'غير محدد')}
• <b>العنوان:</b> ${escapeHtml(proposed.address || 'غير مسجل')}
• <b>تاريخ الميلاد:</b> <code>${escapeHtml(proposed.birthDate || 'غير مسجل')}</code>
• <b>وقت تقديم الطلب:</b> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}

⚠️ <i>لن يتم تطبيق أي تعديل على كارت وحساب الطالب إلا بعد موافقتكِ.</i>
`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ قبول التعديل واعتماده',
          callback_data: `approve_edit:${reqId}`,
        },
        {
          text: '❌ رفض التعديل',
          callback_data: `reject_edit:${reqId}`,
        },
      ],
      [
        {
          text: '📂 لوحة تحكم الطلاب',
          url: 'https://nashwa-academy.vercel.app/dashboard/students',
        },
        {
          text: '💬 واتساب ولي الأمر',
          url: `https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(
            `أهلاً بحضرتك أستاذ ${proposed.parentName}، بخصوص طلب تعديل بيانات الطالب (${proposed.name}) في أكاديمية مس نشوى 🌸`
          )}`,
        },
      ],
    ],
  };

  if (proposed.photoUrl) {
    return sendTelegramPhoto(proposed.photoUrl, messageText, inlineKeyboard);
  }

  return sendTelegramMessage(messageText, inlineKeyboard);
}


