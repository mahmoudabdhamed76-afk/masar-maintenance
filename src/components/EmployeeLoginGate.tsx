import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  User,
  Wrench,
} from 'lucide-react';
import { Technician } from '../types/maintenance';

interface EmployeeLoginGateProps {
  technicians: Technician[];
  prefilledUsername?: string;
  invitedTech?: Technician | null;
  onAuthenticated: (tech: Technician) => void;
  onExitToManager: () => void;
}

export const EmployeeLoginGate: React.FC<EmployeeLoginGateProps> = ({
  technicians,
  prefilledUsername = '',
  invitedTech = null,
  onAuthenticated,
  onExitToManager,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState(prefilledUsername || invitedTech?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledUsername) setUsername(prefilledUsername);
    else if (invitedTech?.username) setUsername(invitedTech.username);
  }, [prefilledUsername, invitedTech]);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 26, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const u = username.trim().toLowerCase();
    const p = password.trim();

    const pool: Technician[] = invitedTech
      ? [invitedTech, ...technicians.filter((t) => t.id !== invitedTech.id)]
      : technicians;

    const matched = pool.find(
      (t) => t.username.toLowerCase() === u && t.password === p
    );

    if (!matched) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة. راجع البيانات المرسلة من المدير.');
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { x: -10 },
          { x: 0, duration: 0.42, ease: 'elastic.out(1.4, 0.35)' }
        );
      }
      return;
    }

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        scale: 1.03,
        opacity: 0,
        duration: 0.28,
        ease: 'power2.in',
        onComplete: () => onAuthenticated(matched),
      });
    } else {
      onAuthenticated(matched);
    }
  };

  return (
    <div className="login-gate-shell">
      <div className="login-gate-orb login-orb-1" />
      <div className="login-gate-orb login-orb-2" />

      <div ref={cardRef} className="login-gate-card">
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="brand-logo-box" style={{ margin: '0 auto 12px' }}>
            <Wrench size={26} />
          </div>
          <span className="badge resolved" style={{ marginBottom: 8 }}>
            <Lock size={12} />
            بوابة دخول الفنيين الخاصة
          </span>
          <h1 style={{ margin: '6px 0 4px', fontSize: '1.45rem', fontWeight: 900 }}>
            {invitedTech ? `أهلاً ${invitedTech.name}` : 'تسجيل دخول الموظف'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            أدخل اسم المستخدم وكلمة المرور المرسلة من المدير لفتح جدول صياناتك وبار التتبع
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-field">
            <label className="form-label">
              <User size={13} style={{ marginLeft: 4 }} />
              اسم المستخدم (Username)
            </label>
            <input
              type="text"
              required
              dir="ltr"
              className="form-input"
              placeholder="مثال: ahmed.saeed"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <KeyRound size={13} style={{ marginLeft: 4 }} />
              كلمة المرور (Password)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                className="form-input"
                style={{ paddingLeft: 42 }}
                placeholder="MS-XXXX"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
                aria-label="إظهار أو إخفاء كلمة المرور"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#FDE2E2',
                color: '#B91C1C',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="primary-advance-btn"
            style={{ width: '100%', marginTop: 4 }}
          >
            <span>دخول لصفحتي الخاصة</span>
            <ArrowLeft size={18} />
          </button>
        </form>

        {/* Subtle quick demo hint if no specific invited user */}
        {!invitedTech && technicians.length > 0 && (
          <div
            style={{
              marginTop: 18,
              padding: '10px 12px',
              borderRadius: 13,
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-soft)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4 }}>حساب تجريبي سريع:</div>
            <div dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
              User: {technicians[0].username} &nbsp;|&nbsp; Pass: {technicians[0].password}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={onExitToManager}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Shield size={14} />
            العودة إلى لوحة المدير
          </button>
        </div>
      </div>
    </div>
  );
};
