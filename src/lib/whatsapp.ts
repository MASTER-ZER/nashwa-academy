// Helper to generate zero-cost official WhatsApp links with pre-filled customized Arabic messages

export function formatEgyptianPhone(phone: string): string {
  // Clean non-digits
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '2' + cleaned; // Add Egypt country code 20
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
}

export function generateParentExamWhatsAppUrl(params: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  examTitle: string;
  score: number;
  totalScore: number;
}): string {
  const percentage = Math.round((params.score / params.totalScore) * 100);
  let rating = 'ممتاز 🌟';
  if (percentage < 50) rating = 'يحتاج إلى مزيد من المتابعة والاجتهاد ⚠️';
  else if (percentage < 65) rating = 'مقبول 👍';
  else if (percentage < 80) rating = 'جيد جداً 👏';

  const message = `أهلاً بحضرتك أستاذ ${params.parentName || 'ولي الأمر'}،\n` +
    `نود إبلاغ سيادتكم بنتيجة ابنكم الطالب (${params.studentName}) في امتحان مادة العلوم المتكاملة (${params.examTitle}):\n\n` +
    `📊 الدرجة: ${params.score} من ${params.totalScore} (${percentage}%)\n` +
    `📝 التقدير: ${rating}\n\n` +
    `مع خالص تحياتنا لمستقبل باهر ومشرق لابنكم،\n` +
    `مس نشوى 🌸 - مادة العلوم المتكاملة`;

  const phone = formatEgyptianPhone(params.parentPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function generateStudentExamWhatsAppUrl(params: {
  studentPhone: string;
  studentName: string;
  examTitle: string;
  score: number;
  totalScore: number;
}): string {
  const percentage = Math.round((params.score / params.totalScore) * 100);
  let note = 'عاش يا بطل، استمر في التميز! 🚀';
  if (percentage < 60) note = 'ركز في الحصص القادمة ونراجع النقاط الصعبة مع بعض بإذن الله 💪';

  const message = `أهلاً يا ${params.studentName} ✨\n` +
    `درجتك في امتحان العلوم المتكاملة (${params.examTitle}) هي: ${params.score} من ${params.totalScore} (${percentage}%).\n\n` +
    `${note}\n\n` +
    `مع تحيات مس نشوى 🌸`;

  const phone = formatEgyptianPhone(params.studentPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function generateAbsenceWhatsAppUrl(params: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  groupName: string;
  sessionDate: string;
}): string {
  const message = `أهلاً بحضرتك أستاذ ${params.parentName || 'ولي الأمر'}،\n` +
    `نحيط سيادتكم علماً بغياب ابنكم الطالب (${params.studentName}) عن حضور حصة العلوم المتكاملة اليوم بتاريخ ${params.sessionDate} (${params.groupName}).\n\n` +
    `يرجى التواصل معنا للاطمئنان والتنسيق لموعد حصة التعويض حرصاً على عدم تراكم المنهج.\n\n` +
    `مع تحيات مس نشوى 🌸`;

  const phone = formatEgyptianPhone(params.parentPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function generateStudentAbsenceWhatsAppUrl(params: {
  studentPhone: string;
  studentName: string;
  groupName: string;
}): string {
  const message = `أهلاً يا ${params.studentName}،\n` +
    `لاحظنا غيابك اليوم عن حصة العلوم المتكاملة (${params.groupName}).\n` +
    `لعله خير إن شاء الله، تواصل مع السكرتارية لمعرفة الواجب وموعد الحصة القادمة 📚\n\n` +
    `مس نشوى 🌸`;

  const phone = formatEgyptianPhone(params.studentPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
