import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AVATAR_COLORS, WEEK_DAYS } from '../data/initialData';
import { Technician } from '../types/maintenance';
import {
  buildEmployeePortalUrl,
  buildWhatsAppInviteText,
  generatePassword,
  suggestUsername,
} from '../utils/inviteLink';

interface AddTechnicianModalProps {
  open: boolean;
  editingTech: Technician | null;
  initialViewCredentials?: boolean;
  onClose: () => void;
  onSave: (tech: Technician, isNew: boolean) => void;
  onPreviewEmployeeLogin: (tech: Technician) => void;
}

export const AddTechnicianModal: React.FC<AddTechnicianModalProps> = ({
  open,
  editingTech,
  initialViewCredentials = false,
  onClose,
  onSave,
  onPreviewEmployeeLogin,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const credsCardRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('فني صيانة ميداني');
  const [specialty, setSpecialty] = useState('أجهزة طبية وتبريد');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('وحدة صيانة متنقلة');
  const [shiftStart, setShiftStart] = useState('09:00 ص');
  const [shiftEnd, setShiftEnd] = useState('06:00 م');
  const [workDays, setWorkDays] = useState<string[]>([
    'السبت',
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
  ]);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [usernameTouched, setUsernameTouched] = useState(false);

  const [savedTech, setSavedTech] = useState<Technician | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (editingTech) {
      setName(editingTech.name);
      setRole(editingTech.role);
      setSpecialty(editingTech.specialty);
      setPhone(editingTech.phone);
      setVehicle(editingTech.vehicle);
      setShiftStart(editingTech.shiftStart);
      setShiftEnd(editingTech.shiftEnd);
      setWorkDays(editingTech.workDays?.length ? editingTech.workDays : WEEK_DAYS.slice(0, 6));
      setAvatarColor(editingTech.avatarColor);
      setUsername(editingTech.username);
      setPassword(editingTech.password);
      setUsernameTouched(true);
      setSavedTech(initialViewCredentials ? editingTech : null);
    } else {
      setName('');
      setRole('فني صيانة ميداني');
      setSpecialty('أجهزة طبية وتبريد');
      setPhone('');
      setVehicle('فان صيانة ميداني');
      setShiftStart('09:00 ص');
      setShiftEnd('06:00 م');
      setWorkDays(['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);
      setAvatarColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
      setUsername('');
      setPassword(generatePassword());
      setUsernameTouched(false);
      setSavedTech(null);
    }
    setCopiedField(null);
  }, [open, editingTech, initialViewCredentials]);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 24, scale: 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' }
      );
    }
  }, [open]);

  useEffect(() => {
    if (savedTech && credsCardRef.current) {
      gsap.fromTo(
        credsCardRef.current,
        { scale: 0.94, opacity: 0, y: 14 },
        { scale: 1, opacity: 1, y: 0, duration: 0.42, ease: 'back.out(1.5)' }
      );
    }
  }, [savedTech]);

  if (!open) return null;

  const toggleDay = (day: string) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const computeInitials = (fullName: string) => {
    const clean = fullName.replace(/^م\.\s*/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return clean.slice(0, 2) || 'فم';
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!usernameTouched && !editingTech) {
      setUsername(suggestUsername(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalUsername = username.trim() || suggestUsername(name);
    const finalPassword = password.trim() || generatePassword();

    const techRecord: Technician = editingTech
      ? {
          ...editingTech,
          name: name.trim(),
          role: role.trim() || 'فني صيانة ميداني',
          specialty: specialty.trim() || 'صيانة عامة',
          phone: phone.trim(),
          vehicle: vehicle.trim() || 'وحدة صيانة متنقلة',
          shiftStart: shiftStart.trim() || '09:00 ص',
          shiftEnd: shiftEnd.trim() || '06:00 م',
          workDays: workDays.length ? workDays : ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
          avatarColor,
          avatarInitials: computeInitials(name),
          username: finalUsername,
          password: finalPassword,
        }
      : {
          id: `tech-${Date.now()}`,
          name: name.trim(),
          role: role.trim() || 'فني صيانة ميداني',
          specialty: specialty.trim() || 'صيانة عامة',
          phone: phone.trim() || '01000000000',
          avatarInitials: computeInitials(name),
          avatarColor,
          status: 'available',
          rating: 5.0,
          completedToday: 0,
          shiftStart: shiftStart.trim() || '09:00 ص',
          shiftEnd: shiftEnd.trim() || '06:00 م',
          workDays: workDays.length ? workDays : ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
          vehicle: vehicle.trim() || 'فان صيانة ميداني',
          username: finalUsername,
          password: finalPassword,
          currentCoords: {
            lat: Number((30.01 + Math.random() * 0.06).toFixed(4)),
            lng: Number((31.22 + Math.random() * 0.16).toFixed(4)),
            x: Math.round(28 + Math.random() * 44),
            y: Math.round(28 + Math.random() * 44),
          },
        };

    onSave(techRecord, !editingTech);
    setSavedTech(techRecord);
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(key);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const portalUrl = savedTech ? buildEmployeePortalUrl(savedTech) : '';
  const whatsappInvite = savedTech ? buildWhatsAppInviteText(savedTech) : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={savedTech ? 'بيانات دخول الموظف' : 'إضافة موظف وإنشاء حساب'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.22rem', fontWeight: 900 }}>
              {savedTech
                ? 'بطاقة حساب ورابط دخول الموظف'
                : editingTech
                ? `تعديل مواعيد وحساب ${editingTech.name}`
                : 'إضافة موظف جديد وإنشاء حساب خاص'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {savedTech
                ? 'انسخ الرابط واليوزر نيم والباسورد وأرسلهم للموظف ليفتح صفحته الخاصة مباشرة'
                : 'حدد بيانات الموظف ومواعيد وأيام عمله وسيتم إنشاء رابط دخول ويوزر نيم وباسورد فوراً'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: '1px solid var(--border-soft)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CREDENTIALS READY SCREEN */}
        {savedTech ? (
          <div ref={credsCardRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Success Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                padding: '15px 16px',
                borderRadius: 18,
                background: 'var(--pastel-mint-bg)',
                border: '1px solid var(--pastel-mint-border)',
                color: 'var(--pastel-mint-text)',
              }}
            >
              <div
                className="user-avatar"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  background: savedTech.avatarColor,
                  fontSize: '1rem',
                }}
              >
                {savedTech.avatarInitials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: '0.98rem' }}>
                  <ShieldCheck size={18} />
                  حساب {savedTech.name} جاهز للتسليم!
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: 2 }}>
                  الوردية: {savedTech.shiftStart} إلى {savedTech.shiftEnd} • أيام العمل: {savedTech.workDays.join('، ')}
                </div>
              </div>
            </div>

            {/* Direct Link Box */}
            <div className="cred-box">
              <div className="cred-box-label">
                <Link2 size={14} color="var(--accent-coral)" />
                رابط صفحة الموظف المباشر (Link)
              </div>
              <div className="cred-value-row">
                <code className="cred-code-url" dir="ltr">
                  {portalUrl}
                </code>
                <button
                  type="button"
                  className="pill-btn primary"
                  style={{ height: 36, fontSize: '0.78rem', flexShrink: 0 }}
                  onClick={() => handleCopy('url', portalUrl)}
                >
                  {copiedField === 'url' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedField === 'url' ? 'تم النسخ' : 'نسخ الرابط'}
                </button>
              </div>
            </div>

            {/* Username & Password Pair */}
            <div className="form-grid">
              <div className="cred-box">
                <div className="cred-box-label">اسم المستخدم (Username)</div>
                <div className="cred-value-row">
                  <code className="cred-code-big" dir="ltr">
                    {savedTech.username}
                  </code>
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ height: 34, padding: '0 11px', fontSize: '0.76rem' }}
                    onClick={() => handleCopy('user', savedTech.username)}
                  >
                    {copiedField === 'user' ? <Check size={14} color="#2F8A5B" /> : <Copy size={14} />}
                    {copiedField === 'user' ? 'نُسخ' : 'نسخ'}
                  </button>
                </div>
              </div>

              <div className="cred-box">
                <div className="cred-box-label">
                  <KeyRound size={14} color="var(--accent-coral)" />
                  كلمة المرور (Password)
                </div>
                <div className="cred-value-row">
                  <code className="cred-code-big" dir="ltr">
                    {savedTech.password}
                  </code>
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ height: 34, padding: '0 11px', fontSize: '0.76rem' }}
                    onClick={() => handleCopy('pass', savedTech.password)}
                  >
                    {copiedField === 'pass' ? <Check size={14} color="#2F8A5B" /> : <Copy size={14} />}
                    {copiedField === 'pass' ? 'نُسخ' : 'نسخ'}
                  </button>
                </div>
              </div>
            </div>

            {/* Share & Test Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                paddingTop: 10,
                borderTop: '1px dashed var(--border-strong)',
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="pill-btn coral"
                  onClick={() => handleCopy('whatsapp', whatsappInvite)}
                >
                  {copiedField === 'whatsapp' ? <Check size={15} /> : <Copy size={15} />}
                  {copiedField === 'whatsapp'
                    ? 'تم نسخ رسالة الدعوة الكاملة!'
                    : 'نسخ رسالة كاملة للواتساب'}
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(whatsappInvite)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pill-btn"
                  style={{
                    textDecoration: 'none',
                    background: '#DCF5E7',
                    borderColor: '#A9E2C4',
                    color: '#155D3A',
                  }}
                >
                  <MessageCircle size={15} />
                  إرسال عبر واتساب
                </a>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => setSavedTech(null)}
                >
                  تعديل البيانات
                </button>
                <button
                  type="button"
                  className="pill-btn primary"
                  onClick={() => {
                    const t = savedTech;
                    onClose();
                    onPreviewEmployeeLogin(t);
                  }}
                >
                  <ExternalLink size={15} />
                  تجربة شاشة دخول الموظف
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CREATE / EDIT EMPLOYEE FORM */
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-field">
              <label className="form-label">اسم الموظف الكامل *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="مثال: م. محمد حسان"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">رقم الموبايل</label>
              <input
                type="tel"
                className="form-input"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">المسمى الوظيفي</label>
              <input
                type="text"
                className="form-input"
                placeholder="مهندس صيانة ميداني"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">التخصص الفني</label>
              <select
                className="form-select"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                <option value="أجهزة طبية وتبريد">أجهزة طبية وتبريد</option>
                <option value="تبريد وتكييف مركزي">تبريد وتكييف مركزي</option>
                <option value="شبكات وسيرفرات">شبكات وسيرفرات</option>
                <option value="لوحات كهرباء و UPS">لوحات كهرباء و UPS</option>
                <option value="معايرة حساسات ومعدات">معايرة حساسات ومعدات</option>
                <option value="صيانة عامة وميكانيكا">صيانة عامة وميكانيكا</option>
              </select>
            </div>

            {/* Shift Times */}
            <div className="form-field">
              <label className="form-label">
                <Clock size={13} style={{ marginLeft: 4 }} />
                مواعيد الوردية (من — إلى)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  placeholder="09:00 ص"
                />
                <input
                  type="text"
                  className="form-input"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  placeholder="06:00 م"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">المركبة / وسيلة التحرك</label>
              <input
                type="text"
                className="form-input"
                placeholder="فان صيانة #18"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              />
            </div>

            {/* Work Days Multi-Select */}
            <div className="form-field full">
              <label className="form-label">
                <CalendarDays size={13} style={{ marginLeft: 4 }} />
                أيام العمل المحددة للموظف
              </label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {WEEK_DAYS.map((day) => {
                  const selected = workDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`day-chip ${selected ? 'active' : ''}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credentials Section */}
            <div
              className="form-field full"
              style={{
                padding: 14,
                borderRadius: 16,
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <KeyRound size={15} color="var(--accent-coral)" />
                بيانات حساب دخول الموظف (تُنشأ تلقائياً ويمكن تعديلها)
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">اسم المستخدم (Username)</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    className="form-input"
                    placeholder="mohamed.hassan"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameTouched(true);
                    }}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">كلمة المرور (Password)</label>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pill-btn"
                      style={{ height: 42, padding: '0 12px', flexShrink: 0 }}
                      onClick={() => setPassword(generatePassword())}
                      title="توليد كلمة مرور جديدة"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Avatar Color */}
            <div className="form-field full">
              <label className="form-label">لون تمييز الموظف على الخريطة</label>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: color,
                      border:
                        avatarColor === color
                          ? '3px solid var(--text-primary)'
                          : '2px solid transparent',
                      cursor: 'pointer',
                      transform: avatarColor === color ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                    }}
                    aria-label={`اختيار اللون ${color}`}
                  />
                ))}
              </div>
            </div>

            <div
              className="form-field full"
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 6,
              }}
            >
              <button type="button" className="pill-btn" onClick={onClose}>
                إلغاء
              </button>
              <button type="submit" className="pill-btn coral">
                <UserPlus size={16} />
                {editingTech ? 'حفظ التعديلات وعرض الرابط' : 'تسجيل الموظف وإنشاء الرابط والحساب'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
