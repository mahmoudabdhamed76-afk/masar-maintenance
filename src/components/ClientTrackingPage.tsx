import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Link2,
  MapPin,
  Moon,
  Phone,
  Radio,
  Shield,
  Sparkles,
  Star,
  Sun,
  Truck,
  Wrench,
} from 'lucide-react';
import { MISSION_STAGES } from '../data/initialData';
import { MaintenanceMission, MissionStageIndex, Technician } from '../types/maintenance';
import { LiveFieldMap } from './LiveFieldMap';
import { MissionProgressTracker } from './MissionProgressTracker';

interface ClientTrackingPageProps {
  missions: MaintenanceMission[];
  technicians: Technician[];
  selectedMissionId: string;
  onSelectMission: (id: string) => void;
  onSetStageForPreview?: (missionId: string, stage: MissionStageIndex) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  standaloneClientLink?: boolean;
  onSwitchToManager?: () => void;
  onSwitchToTechnician?: () => void;
}

export const ClientTrackingPage: React.FC<ClientTrackingPageProps> = ({
  missions,
  technicians,
  selectedMissionId,
  onSelectMission,
  onSetStageForPreview,
  darkMode,
  onToggleDarkMode,
  standaloneClientLink = false,
  onSwitchToManager,
  onSwitchToTechnician,
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  const mission = missions.find((m) => m.id === selectedMissionId) || missions[0];
  const technician = technicians.find((t) => t.id === mission?.technicianId);
  const stageDef = mission ? MISSION_STAGES[mission.stage] : MISSION_STAGES[0];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.client-fade',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, [mission?.id]);

  // Animate spotlight headline smoothly every time technician updates the stage!
  useEffect(() => {
    if (spotlightRef.current) {
      gsap.fromTo(
        spotlightRef.current,
        { scale: 0.96, y: 8, opacity: 0.7 },
        { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }
      );
    }
  }, [mission?.stage]);

  if (!mission) {
    return null;
  }

  const getFriendlyHeadline = () => {
    const tName = technician?.name || 'الفني المختص';
    switch (mission.stage) {
      case 0:
        return `تم استلام طلبك بنجاح وبانتظار قبول ${tName}`;
      case 1:
        return `قبل ${tName} المهمة ويجهّز معداته للانطلاق إليك`;
      case 2:
        return `${tName} في الطريق إليك الآن! 🚐`;
      case 3:
        return `وصل ${tName} إلى الموقع وبدأ الفحص المبدئي 📍`;
      case 4:
        return `${tName} يقوم حالياً بتنفيذ الإصلاح والصيانة 🔧`;
      case 5:
        return `تم حل المشكلة وإغلاق الطلب بنجاح! ✨`;
    }
  };

  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?portal=client&track=${encodeURIComponent(mission.code)}`
      : `https://masar-maintenance-production.up.railway.app/?portal=client&track=${encodeURIComponent(mission.code)}`;

  const handleCopyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = trackingUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div ref={pageRef} className="emp-shell" style={{ paddingBottom: 42 }}>
      <div className="emp-top-glow" aria-hidden="true" />

      {/* Clean Header */}
      <header className="emp-header">
        <div className="emp-header-identity">
          <div className="brand-logo-box" style={{ width: 46, height: 46, marginBottom: 0 }}>
            <Radio size={22} />
          </div>
          <div>
            <div className="emp-greeting">صفحة المتابعة المباشرة (العميل / المريض)</div>
            <div className="emp-username-title">مسار الصيانة — تتبع رحلة الفني</div>
          </div>
        </div>

        <div className="emp-header-actions">
          <button
            type="button"
            className="pill-btn"
            style={{ height: 40, fontSize: '0.78rem' }}
            onClick={handleCopyTrackingLink}
            title="نسخ رابط المتابعة المباشر"
          >
            {copiedLink ? <Check size={15} color="#2F8A5B" /> : <Link2 size={15} color="var(--accent-coral)" />}
            <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط المتابعة'}</span>
          </button>

          <button
            type="button"
            className="emp-icon-btn"
            onClick={onToggleDarkMode}
            title="تبديل الوضع الليلي"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {!standaloneClientLink && onSwitchToTechnician && (
            <button
              type="button"
              className="emp-icon-btn"
              onClick={onSwitchToTechnician}
              title="فتح صفحة الفني لتحديث المرحلة"
            >
              <Wrench size={18} />
            </button>
          )}

          {!standaloneClientLink && onSwitchToManager && (
            <button
              type="button"
              className="emp-icon-btn"
              onClick={onSwitchToManager}
              title="العودة للوحة المدير"
            >
              <Shield size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Preview Mission Selector (hidden if opened via direct single-ticket link) */}
      {!standaloneClientLink && (
        <div className="emp-preview-switcher client-fade">
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            اختر الطلب للمتابعة الحية:
          </span>
          <select
            className="emp-tech-select"
            value={mission.id}
            onChange={(e) => onSelectMission(e.target.value)}
          >
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.site.name} ({MISSION_STAGES[m.stage].shortTitle})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* LIVE SPOTLIGHT BANNER */}
      <div
        ref={spotlightRef}
        className="card client-fade"
        style={{
          marginBottom: 16,
          background: `linear-gradient(125deg, var(--bg-elevated) 0%, ${stageDef.softBg} 160%)`,
          borderColor: `${stageDef.color}50`,
          padding: '18px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className="telemetry-live-pill">
                <span className="live-dot" style={{ width: 7, height: 7 }} />
                تحديث تلقائي مباشر مع مسار الفني
              </span>
              <span className="code-pill">رقم الطلب: {mission.code}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.28rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {getFriendlyHeadline()}
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
              📍 {mission.site.name} — {mission.site.address}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 16,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                الوقت المتوقع للوصول
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: stageDef.color }}>
                {mission.stage >= 3 ? 'وصل الموقع ✓' : `${mission.etaMinutes || 12} دقيقة`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXACT SAME GSAP KINETIC S-WAVE JOURNEY ANIMATION (LIVE SYNCED!) */}
      <div className="client-fade" style={{ marginBottom: 16 }}>
        <MissionProgressTracker
          mission={mission}
          technician={technician}
          onSetStage={onSetStageForPreview}
          readOnly
        />
      </div>

      {/* LOWER SPLIT: Technician Card + Timeline Feed + Live GPS Map */}
      <div className="emp-home-grid">
        <div className="emp-col-stack">
          {/* Assigned Technician Card */}
          {technician && (
            <div className="card client-fade">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div>
                  <h3 className="card-title">
                    <Truck size={18} color="var(--accent-coral)" />
                    الفني المتوجه إليك
                  </h3>
                  <p className="card-subtitle">بيانات الفني المعتمد والمركبة</p>
                </div>
                <span className="badge resolved">
                  <Star size={13} />
                  {technician.rating}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                <div
                  className="user-avatar"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: technician.avatarColor,
                    fontSize: '1.05rem',
                  }}
                >
                  {technician.avatarInitials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900 }}>{technician.name}</div>
                  <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)' }}>
                    {technician.role} • {technician.specialty}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                    🚐 {technician.vehicle}
                  </div>
                </div>
              </div>

              <a
                href={`tel:${technician.phone}`}
                className="emp-attendance-btn"
                style={{ height: 46, fontSize: '0.9rem', textDecoration: 'none' }}
              >
                <Phone size={17} />
                <span>اتصال مباشر بالفني ({technician.phone})</span>
              </a>
            </div>
          )}

          {/* Live Timestamped Journey Updates Feed */}
          <div className="card client-fade">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Clock size={18} color="var(--accent-coral)" />
                  سجل تحديثات المسار لحظة بلحظة
                </h3>
                <p className="card-subtitle">كل خطوة ينفذها الفني تظهر هنا فوراً</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[...mission.stageLogs].reverse().map((log, idx) => {
                const st = MISSION_STAGES[log.stage];
                return (
                  <div
                    key={`${log.stage}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 13px',
                      borderRadius: 14,
                      background: idx === 0 ? st.softBg : 'var(--bg-elevated)',
                      border: `1px solid ${idx === 0 ? `${st.color}45` : 'var(--border-soft)'}`,
                    }}
                  >
                    <CheckCircle2 size={17} color={st.color} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: '0.84rem' }}>{st.title}</strong>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: st.color }}>
                          {log.timestamp}
                        </span>
                      </div>
                      {log.note && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {log.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Post-Completion Rating Card */}
          {mission.stage === 5 && (
            <div
              className="card client-fade"
              style={{
                background: 'var(--pastel-mint-bg)',
                borderColor: 'var(--pastel-mint-border)',
                textAlign: 'center',
              }}
            >
              <Sparkles size={24} color="#155D3A" style={{ marginBottom: 6 }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 900, color: 'var(--pastel-mint-text)' }}>
                {ratingSubmitted ? 'شكراً لتقييمك!' : 'قيّم تجربتك مع الفني'}
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'var(--pastel-mint-text)', opacity: 0.85 }}>
                {ratingSubmitted
                  ? `تم تسجيل تقييمك (${rating} نجوم) وإرساله لإدارة الجودة.`
                  : 'ساعدنا في تحسين سرعة وجودة الخدمة الميدانية'}
              </p>
              {!ratingSubmitted && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        setRatingSubmitted(true);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: '1px solid var(--pastel-mint-border)',
                        background: 'var(--bg-elevated)',
                        color: star <= rating ? '#D97706' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Star size={20} fill={star <= rating ? '#D97706' : 'none'} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live GPS Route Map Column */}
        <div className="emp-col-stack">
          <div className="card client-fade">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <MapPin size={18} color="var(--accent-coral)" />
                  موقع الفني المباشر على الخريطة
                </h3>
                <p className="card-subtitle">
                  يتحرك دبوس الفني تلقائياً نحو موقعك حتى الوصول
                </p>
              </div>
              <button
                type="button"
                className="pill-btn"
                style={{ height: 34, fontSize: '0.76rem' }}
                onClick={handleCopyTrackingLink}
              >
                {copiedLink ? <Check size={13} color="#2F8A5B" /> : <Copy size={13} />}
                {copiedLink ? 'نُسخ الرابط' : 'مشاركة الرابط'}
              </button>
            </div>

            <LiveFieldMap
              missions={[mission]}
              technicians={technicians}
              selectedMissionId={mission.id}
              onSelectMission={onSelectMission}
              height={340}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
