import { Student, Group } from '@/types';

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

/**
 * Generates an ultra-crisp, high-definition (800x1120px) PNG image of the Student 3D Apple Wallet ID Card
 * using native HTML5 Canvas 2D. This guarantees 100% Arabic text rendering without font overlapping or CSS glitches.
 */
export async function generateStudentCardCanvas(params: {
  student: Student;
  group: Group | null;
  qrDataUrl: string;
  isPaid: boolean;
  currentMonth: string;
}): Promise<string> {
  const { student, group, qrDataUrl, isPaid, currentMonth } = params;

  if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready !== 'undefined') {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const width = 800;
  const height = 1120;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Draw Card Background with Rounded Corners
  const radius = 42;
  ctx.beginPath();
  drawRoundedRect(ctx, 0, 0, width, height, radius);
  ctx.closePath();
  ctx.clip();

  // Background Dark Emerald Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#064e3b'); // emerald-900
  bgGrad.addColorStop(0.5, '#022c22'); // emerald-950
  bgGrad.addColorStop(1, '#0f172a'); // slate-900
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle Glowing Gradient Overlay
  const glowGrad = ctx.createRadialGradient(width * 0.8, 100, 10, width * 0.8, 100, 400);
  glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Card Border
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Set Arabic RTL Typography
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // 2. Draw Top Header: Logo + Academy Name + Code Badge
  // Try loading logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      logoImg.src = '/logo.png';
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      // Draw circular/rounded logo
      ctx.save();
      const logoX = width - 60 - 80;
      const logoY = 50;
      const logoSize = 80;
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }
  } catch {}

  // Academy Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Cairo, system-ui, -apple-system, sans-serif';
  ctx.fillText('أكاديمية مس نشوى', width - 160, 85);

  // Subject Subtitle
  ctx.fillStyle = '#a7f3d0'; // emerald-200
  ctx.font = 'bold 18px Cairo, system-ui, -apple-system, sans-serif';
  ctx.fillText('العلوم المتكاملة • الصف الأول الثانوي', width - 160, 118);

  // Student Code Badge on Top-Left
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  const badgeX = 50;
  const badgeY = 55;
  const badgeW = 140;
  const badgeH = 50;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#6ee7b7'; // emerald-300
  ctx.font = '900 24px monospace';
  ctx.fillText(`#${student.code}`, badgeX + 30, badgeY + 34);

  // 3. Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 160);
  ctx.lineTo(width - 50, 160);
  ctx.stroke();

  // 4. Student Information Section
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Label: Student Name
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 16px Cairo, system-ui, sans-serif';
  ctx.fillText('اسم الطالب:', width - 60, 200);

  // Value: Student Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px Cairo, system-ui, sans-serif';
  ctx.fillText(student.name, width - 60, 250);

  // Label: Group & Schedule
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 16px Cairo, system-ui, sans-serif';
  ctx.fillText('المجموعة ومواعيد الحصص:', width - 60, 305);

  // Value: Group Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Cairo, system-ui, sans-serif';
  const groupTitle = group ? group.name : 'العلوم المتكاملة • أولى ثانوي';
  ctx.fillText(groupTitle, width - 60, 345);

  // Subscription Status Pill Badge
  const subBadgeY = 380;
  const subText = isPaid ? `اشتراك مسدد (${currentMonth}) ✅` : `اشتراك مستحق (${currentMonth}) ⚠️`;
  
  ctx.fillStyle = isPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
  ctx.beginPath();
  drawRoundedRect(ctx, width - 340, subBadgeY, 280, 42, 12);
  ctx.fill();
  ctx.strokeStyle = isPaid ? 'rgba(52, 211, 153, 0.5)' : 'rgba(251, 113, 133, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = isPaid ? '#6ee7b7' : '#fda4af';
  ctx.font = 'bold 16px Cairo, system-ui, sans-serif';
  ctx.fillText(subText, width - 80, subBadgeY + 27);

  // 5. White Rounded Box for QR Code
  const qrBoxW = 540;
  const qrBoxH = 500;
  const qrBoxX = (width - qrBoxW) / 2;
  const qrBoxY = 460;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw High-Res QR Code Image inside White Box
  if (qrDataUrl) {
    try {
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = qrDataUrl;
      });

      const qrSize = 380;
      const qrX = qrBoxX + (qrBoxW - qrSize) / 2;
      const qrY = qrBoxY + 25;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {}
  }

  // Text below QR Code inside White Box
  ctx.fillStyle = '#334155'; // slate-700
  ctx.font = 'bold 18px Cairo, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('وجه هذا الرمز لكاميرا المس لتسجيل الحضور الذكي ⚡', width / 2, qrBoxY + 445);

  ctx.fillStyle = '#64748b'; // slate-500
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`كود الطالب: #${student.code}`, width / 2, qrBoxY + 475);

  // 6. Card Footer
  ctx.fillStyle = '#a7f3d0'; // emerald-200
  ctx.font = 'bold 15px Cairo, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ بطاقة هوية رسمية ومعتمدة • أكاديمية مس نشوى للعلوم المتكاملة ✨', width / 2, 1040);

  return canvas.toDataURL('image/png');
}
