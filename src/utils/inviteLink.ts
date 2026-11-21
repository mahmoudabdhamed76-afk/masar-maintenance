import { Technician } from '../types/maintenance';

/**
 * Generates a clean memorable password like MS-7392
 */
export function generatePassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MS-${num}`;
}

/**
 * Generates a clean Latin username slug from an Arabic or English name
 */
export function suggestUsername(name: string): string {
  const arabicMap: Record<string, string> = {
    أ: 'a',
    إ: 'e',
    آ: 'a',
    ا: 'a',
    ب: 'b',
    ت: 't',
    ث: 'th',
    ج: 'g',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'z',
    ر: 'r',
    ز: 'z',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'd',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ه: 'h',
    ة: 'a',
    و: 'w',
    ي: 'y',
    ى: 'a',
    ئ: 'e',
    ء: '',
  };

  const cleaned = name
    .replace(/^م\.\s*/g, '')
    .trim()
    .toLowerCase();

  let out = '';
  for (const ch of cleaned) {
    if (arabicMap[ch] !== undefined) out += arabicMap[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (ch === ' ' || ch === '-' || ch === '_') out += '.';
  }

  const slug = out.replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  const suffix = Math.floor(10 + Math.random() * 89);
  return slug ? `${slug.slice(0, 16)}.${suffix}` : `tech.${Math.floor(100 + Math.random() * 899)}`;
}

/**
 * Encode technician account safely into UTF-8 Base64URL so the link works across any phone/browser!
 */
export function encodeTechToken(tech: Technician): string {
  const payload = {
    id: tech.id,
    n: tech.name,
    r: tech.role,
    sp: tech.specialty,
    ph: tech.phone,
    ai: tech.avatarInitials,
    ac: tech.avatarColor,
    ss: tech.shiftStart,
    se: tech.shiftEnd,
    wd: tech.workDays,
    v: tech.vehicle,
    u: tech.username,
    p: tech.password,
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeTechToken(token: string): Technician | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const p = JSON.parse(json);
    if (!p.u || !p.p) return null;
    return {
      id: p.id || `tech-${Date.now()}`,
      name: p.n || 'موظف صيانة',
      role: p.r || 'فني صيانة ميداني',
      specialty: p.sp || 'صيانة عامة',
      phone: p.ph || '',
      avatarInitials: p.ai || 'ف',
      avatarColor: p.ac || '#E56B45',
      status: 'available',
      rating: 5.0,
      completedToday: 0,
      shiftStart: p.ss || '09:00 ص',
      shiftEnd: p.se || '06:00 م',
      workDays: Array.isArray(p.wd) ? p.wd : ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
      vehicle: p.v || 'وحدة صيانة متنقلة',
      username: p.u,
      password: p.p,
      currentCoords: { lat: 30.0444, lng: 31.2357, x: 48, y: 48 },
    };
  } catch {
    return null;
  }
}

export function buildEmployeePortalUrl(tech: Technician): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://masar-maintenance-production.up.railway.app';
  const token = encodeTechToken(tech);
  return `${origin}/?portal=employee&u=${encodeURIComponent(tech.username)}&acc=${token}`;
}

export function buildWhatsAppInviteText(tech: Technician): string {
  const url = buildEmployeePortalUrl(tech);
  return [
    `مرحباً ${tech.name} 👋`,
    `تم إنشاء حسابك الخاص على نظام «مسار الصيانة» لتتبع مهامك ومواعيدك:`,
    ``,
    `🔗 رابط صفحتك المباشر:`,
    url,
    ``,
    `👤 اسم المستخدم: ${tech.username}`,
    `🔑 كلمة المرور: ${tech.password}`,
    `🕒 مواعيد الوردية: ${tech.shiftStart} - ${tech.shiftEnd}`,
    `📅 أيام العمل: ${tech.workDays.join('، ')}`,
  ].join('\n');
}
