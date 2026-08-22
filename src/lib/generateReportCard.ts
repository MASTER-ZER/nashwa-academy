import { Student, Group, Exam, ExamResult, AttendanceRecord, Subscription } from '@/types';

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}

export async function generateStudentReportCardCanvas(params: {
  student: Student;
  group: Group | null;
  attendanceCount: number;
  totalSessionsCount: number;
  examResults: { exam: Exam; result: ExamResult }[];
  isPaid: boolean;
  monthName: string;
  teacherName?: string;
  customNote?: string;
}): Promise<string> {
  const {
    student,
    group,
    attendanceCount,
    totalSessionsCount,
    examResults,
    isPaid,
    monthName,
    teacherName = 'مس نشوى',
    customNote,
  } = params;

  if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready !== 'undefined') {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const width = 900;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Background with Luxury Glassmorphism & Gold/Emerald Gradients
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, 0, 0, width, height, 48);
  ctx.closePath();
  ctx.clip();

  // Rich Dark Slate Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#042f2e'); // teal-950
  bgGrad.addColorStop(0.4, '#0f172a'); // slate-900
  bgGrad.addColorStop(1, '#020617'); // slate-950
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Elegant Radial Glows
  const topGlow = ctx.createRadialGradient(width / 2, 80, 20, width / 2, 80, 450);
  topGlow.addColorStop(0, 'rgba(20, 184, 166, 0.25)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  // Outer Certificate Border
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner Gold Inset Frame
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 36);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Set Default Arabic Typography
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // 2. Certificate Header
  // Logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      logoImg.src = '/logo.png';
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.save();
      const lx = width - 60 - 90;
      const ly = 55;
      const lsize = 90;
      ctx.beginPath();
      ctx.arc(lx + lsize / 2, ly + lsize / 2, lsize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, lx, ly, lsize, lsize);
      ctx.restore();
    }
  } catch {}

  // Header Titles
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Cairo, sans-serif';
  ctx.fillText('أكاديمية مس نشوى للعلوم المتكاملة', width - 170, 95);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 18px Cairo, sans-serif';
  ctx.fillText(`تقرير المتابعة والتقييم الشهري • ${monthName}`, width - 170, 130);

  // Month Badge (Left Side)
  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  drawRoundedRect(ctx, 60, 65, 170, 60, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`تقرير ${monthName}`, 145, 102);
  ctx.restore();

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 170);
  ctx.lineTo(width - 60, 170);
  ctx.stroke();

  // 3. Student Profile Card Box
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, 60, 195, width - 120, 165, 28);
  ctx.fill();
  ctx.stroke();

  // Student Photo or Avatar
  let hasPhoto = false;
  if (student.photoUrl) {
    try {
      const stdImg = new Image();
      stdImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        stdImg.onload = () => resolve();
        stdImg.onerror = () => resolve();
        stdImg.src = student.photoUrl!;
      });
      if (stdImg.complete && stdImg.naturalWidth > 0) {
        ctx.save();
        const px = width - 85 - 120;
        const py = 215;
        const psize = 125;
        ctx.beginPath();
        drawRoundedRect(ctx, px, py, psize, psize, 24);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(stdImg, px, py, psize, psize);
        ctx.restore();

        // Border around photo
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        drawRoundedRect(ctx, px, py, psize, psize, 24);
        ctx.stroke();
        hasPhoto = true;
      }
    } catch {}
  }

  if (!hasPhoto) {
    // Default placeholder
    const px = width - 85 - 120;
    const py = 215;
    const psize = 125;
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    drawRoundedRect(ctx, px, py, psize, psize, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${student.code}`, px + psize / 2, py + 75);
  }

  // Student Text Details
  const textLeftX = hasPhoto ? width - 230 : width - 230;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Cairo, sans-serif';
  ctx.fillText(student.name, textLeftX, 248);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 17px Cairo, sans-serif';
  ctx.fillText(`كود الطالب: #${student.code}   •   المجموعة: ${group ? group.name : 'العلوم المتكاملة'}`, textLeftX, 285);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px Cairo, sans-serif';
  ctx.fillText(`هاتف الطالب: ${student.phone}   •   ولي الأمر: ${student.parentPhone}`, textLeftX, 320);
  ctx.restore();

  // 4. Statistics Ribbon (Attendance & Academic Performance & Subscription)
  const statsY = 385;
  const statBoxWidth = (width - 120 - 30) / 3;

  // Box 1: Attendance
  const effectiveTotal = Math.max(totalSessionsCount, attendanceCount, 1);
  const attendancePercent = Math.min(100, Math.round((attendanceCount / effectiveTotal) * 100));

  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.beginPath();
  drawRoundedRect(ctx, width - 60 - statBoxWidth, statsY, statBoxWidth, 120, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px Cairo, sans-serif';
  ctx.fillText('حضور الحصص الشهري', width - 85, statsY + 35);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 28px Cairo, sans-serif';
  ctx.fillText(`${attendanceCount} / ${effectiveTotal} حصص`, width - 85, statsY + 75);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 14px Cairo, sans-serif';
  ctx.fillText(`نسبة الالتزام: ${attendancePercent}%`, width - 85, statsY + 102);
  ctx.restore();

  // Box 2: Overall Exam Average
  let totalStudentScore = 0;
  let totalMaxScore = 0;
  examResults.forEach((er) => {
    totalStudentScore += er.result.score;
    totalMaxScore += er.exam.maxScore;
  });
  const avgPercent = totalMaxScore > 0 ? Math.round((totalStudentScore / totalMaxScore) * 100) : 0;
  const gradeLabel =
    avgPercent >= 90 ? 'ممتاز 🏆' : avgPercent >= 80 ? 'جيد جداً 🌟' : avgPercent >= 65 ? 'جيد 👍' : 'يحتاج متابعة ⚠️';

  ctx.save();
  const box2X = width - 60 - statBoxWidth * 2 - 15;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.beginPath();
  drawRoundedRect(ctx, box2X, statsY, statBoxWidth, 120, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px Cairo, sans-serif';
  ctx.fillText('المعدل الأكاديمي والامتحانات', box2X + statBoxWidth - 25, statsY + 35);

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 28px Cairo, sans-serif';
  ctx.fillText(`${avgPercent}% - ${gradeLabel}`, box2X + statBoxWidth - 25, statsY + 75);

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 14px Cairo, sans-serif';
  ctx.fillText(`مجموع الدرجات: ${totalStudentScore} / ${totalMaxScore}`, box2X + statBoxWidth - 25, statsY + 102);
  ctx.restore();

  // Box 3: Subscription Status
  ctx.save();
  const box3X = 60;
  ctx.fillStyle = isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)';
  ctx.strokeStyle = isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
  ctx.beginPath();
  drawRoundedRect(ctx, box3X, statsY, statBoxWidth, 120, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px Cairo, sans-serif';
  ctx.fillText('اشتراك شهر ' + monthName, box3X + statBoxWidth - 25, statsY + 35);

  ctx.fillStyle = isPaid ? '#34d399' : '#f87171';
  ctx.font = 'bold 26px Cairo, sans-serif';
  ctx.fillText(isPaid ? 'مسدد بالكامل ✅' : 'مستحق السداد ⚠️', box3X + statBoxWidth - 25, statsY + 75);

  ctx.fillStyle = isPaid ? '#6ee7b7' : '#fca5a5';
  ctx.font = 'bold 14px Cairo, sans-serif';
  ctx.fillText(isPaid ? 'تم تسجيل الإيصال' : 'يرجى مراجعة السنتر', box3X + statBoxWidth - 25, statsY + 102);
  ctx.restore();

  // 5. Exam Results Detailed Table
  const tableY = 535;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Cairo, sans-serif';
  ctx.fillText('📝 تفاصيل نتائج الاختبارات والواجبات:', width - 60, tableY);

  const tableHeaderY = tableY + 20;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  drawRoundedRect(ctx, 60, tableHeaderY, width - 120, 48, 16);
  ctx.fill();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 15px Cairo, sans-serif';
  ctx.fillText('عنوان الاختبار / التقييم', width - 85, tableHeaderY + 31);
  ctx.fillText('الدرجة المحققة', width - 380, tableHeaderY + 31);
  ctx.fillText('النسبة والتقدير', width - 560, tableHeaderY + 31);
  ctx.fillText('ملاحظة المعلمة', width - 720, tableHeaderY + 31);
  ctx.restore();

  let curRowY = tableHeaderY + 58;
  const displayedExams = examResults.slice(0, 5); // display up to 5 exams

  if (displayedExams.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('لا توجد نتائج امتحانات مرصودة لهذا الطالب في هذا الشهر بعد', width / 2, curRowY + 50);
    curRowY += 100;
  } else {
    displayedExams.forEach((er, i) => {
      ctx.save();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      drawRoundedRect(ctx, 60, curRowY, width - 120, 52, 14);
      ctx.fill();

      // Exam Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Cairo, sans-serif';
      const title = er.exam.title.length > 25 ? er.exam.title.slice(0, 25) + '...' : er.exam.title;
      ctx.fillText(title, width - 85, curRowY + 32);

      // Score
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 16px Cairo, sans-serif';
      ctx.fillText(`${er.result.score} / ${er.exam.maxScore}`, width - 380, curRowY + 32);

      // Percentage
      const p = Math.round((er.result.score / er.exam.maxScore) * 100);
      ctx.fillStyle = p >= 85 ? '#60a5fa' : p >= 65 ? '#fbbf24' : '#f87171';
      ctx.font = 'bold 15px Cairo, sans-serif';
      ctx.fillText(`${p}%`, width - 560, curRowY + 32);

      // Feedback
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px Cairo, sans-serif';
      const fb = er.result.feedback || 'أداء ممتاز، استمر!';
      const shortFb = fb.length > 20 ? fb.slice(0, 20) + '...' : fb;
      ctx.fillText(shortFb, width - 720, curRowY + 32);

      ctx.restore();
      curRowY += 60;
    });
  }

  // 6. Teacher Note & Signature Section (Bottom of Certificate)
  const footerY = 960;
  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, 60, footerY, width - 120, 220, 28);
  ctx.fill();
  ctx.stroke();

  // Teacher Endorsement Quote
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Cairo, sans-serif';
  ctx.fillText('💬 كلمة وتوجيه المعلمة لولي الأمر:', width - 90, footerY + 45);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px Cairo, sans-serif';
  const customComment = customNote?.trim() || (
    avgPercent >= 85
      ? `نبارك لولي الأمر على تفوق الطالب (${student.name}) والتزامه المتميز في الحصص والامتحانات، ونتمنى له دوام النجاح.`
      : `نرجو من ولي أمر الطالب (${student.name}) متابعة مراجعة دروس العلوم المتكاملة وحل الواجبات لرفع المستوى في الاختبار القادم.`
  );

  // Wrap note text into 2 lines if longer than 65 characters
  if (customComment.length > 70) {
    const words = customComment.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).length <= 65) {
        line1 += (line1 ? ' ' : '') + w;
      } else {
        line2 += (line2 ? ' ' : '') + w;
      }
    }
    ctx.fillText(line1, width - 90, footerY + 75);
    if (line2) {
      ctx.fillText(line2, width - 90, footerY + 100);
    }
  } else {
    ctx.fillText(customComment, width - 90, footerY + 80);
  }

  // Signatures & Official Stamp
  const signY = footerY + 140;

  // Teacher Name
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 18px Cairo, sans-serif';
  ctx.fillText(`معلمة المادة: ${teacherName}`, width - 90, signY);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px Cairo, sans-serif';
  ctx.fillText('توقيع واعتماد الأكاديمية ✍️', width - 90, signY + 30);

  // Official Gold Stamp Graphic (Left Side)
  const stampX = 140;
  const stampY = footerY + 110;
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stampX, stampY, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stampX, stampY, 46, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 12px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('أكاديمية مس نشوى', stampX, stampY - 12);
  ctx.fillText('★ معتمد رسمي ★', stampX, stampY + 8);
  ctx.fillText(new Date().getFullYear().toString(), stampX, stampY + 26);
  ctx.restore();

  ctx.restore();

  // 7. Footer Timestamp
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `صدر هذا التقرير إلكترونياً من منصة أكاديمية مس نشوى للعلوم المتكاملة • تاريخ الإصدار: ${new Date().toLocaleDateString(
      'ar-EG'
    )}`,
    width / 2,
    height - 50
  );

  return canvas.toDataURL('image/png', 0.95);
}
