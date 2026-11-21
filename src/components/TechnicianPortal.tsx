import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Crosshair,
  ExternalLink,
  FileText,
  Home,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  Navigation,
  Package,
  Phone,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Star,
  Sun,
  Wrench,
} from 'lucide-react';
import { MISSION_STAGES, SITE_PRESETS } from '../data/initialData';
import {
  MaintenanceMission,
  MissionStageIndex,
  TechSection,
  Technician,
} from '../types/maintenance';
import { LiveFieldMap } from './LiveFieldMap';
import { MissionProgressTracker } from './MissionProgressTracker';

interface TechnicianPortalProps {
  section: TechSection;
  onChangeSection: (s: TechSection) => void;
  technicians: Technician[];
  activeTechId: string;
  onChangeTechId: (id: string) => void;
  missions: MaintenanceMission[];
  selectedMissionId: string;
  onSelectMission: (id: string) => void;
  onAdvanceStage: (missionId: string) => void;
  onSetStage: (missionId: string, stage: MissionStageIndex) => void;
  onToggleChecklist: (missionId: string, itemId: string) => void;
  onUpdateNotes: (missionId: string, notes: string) => void;
  onCreateQuickTask: (mission: MaintenanceMission) => void;
  onSendAdminPing: (techName: string, message: string) => void;
  onReportGpsLocation: (
    techId: string,
    lat: number,
    lng: number,
    accuracyMeters: number | undefined,
    eventLabel: string
  ) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lockedToEmployee?: boolean;
  onLogoutEmployee?: () => void;
  onSwitchToManager?: () => void;
}

const CLOCK_R = 88;
const CLOCK_CIRC = 2 * Math.PI * CLOCK_R;

export const TechnicianPortal: React.FC<TechnicianPortalProps> = ({
  section,
  onChangeSection,
  technicians,
  activeTechId,
  onChangeTechId,
  missions,
  selectedMissionId,
  onSelectMission,
  onAdvanceStage,
  onSetStage,
  onToggleChecklist,
  onUpdateNotes,
  onCreateQuickTask,
  onSendAdminPing,
  onReportGpsLocation,
  darkMode,
  onToggleDarkMode,
  lockedToEmployee = false,
  onLogoutEmployee,
  onSwitchToManager,
}) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const clockRingRef = useRef<SVGCircleElement>(null);
  const checkBtnRef = useRef<HTMLButtonElement>(null);

  const currentTech =
    technicians.find((t) => t.id === activeTechId) || technicians[0];
  const myMissions = missions.filter((m) => m.technicianId === currentTech.id);
  const activeMission =
    myMissions.find((m) => m.id === selectedMissionId) ||
    myMissions.find((m) => m.stage < 5) ||
    myMissions[0] ||
    null;

  // Live Attendance Clock State
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [isClockedIn, setIsClockedIn] = useState<boolean>(true);
  const [shiftSeconds, setShiftSeconds] = useState<number>(2 * 3600 + 24 * 60 + 18);
  const [lastCheckTime, setLastCheckTime] = useState<string>('08:32 ص');

  // Real Browser Geolocation (GPS) State
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle');
  const [gpsError, setGpsError] = useState<string>('');
  const watchIdRef = useRef<number | null>(null);
  const lastWatchLogAtRef = useRef<number>(0);

  const startLiveGpsWatch = (techId: string) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('active');
        setGpsError('');
        const nowMs = Date.now();
        // Throttle automatic watch updates to once every 20s to keep logs clean
        if (nowMs - lastWatchLogAtRef.current >= 20000) {
          lastWatchLogAtRef.current = nowMs;
          onReportGpsLocation(
            techId,
            pos.coords.latitude,
            pos.coords.longitude,
            Math.round(pos.coords.accuracy),
            'تحديث موقع تلقائي مباشر (GPS)'
          );
        }
      },
      () => {
        // ignore intermittent background watch hiccups if initial fix succeeded
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
    );
  };

  const requestRealGpsLocation = (eventLabel = 'تحديث موقع الموظف يدوياً (GPS)') => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unsupported');
      setGpsError('المتصفح الحالي لا يدعم خدمة تحديد الموقع GPS.');
      return;
    }

    setGpsStatus('requesting');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus('active');
        setGpsError('');
        lastWatchLogAtRef.current = Date.now();
        onReportGpsLocation(
          currentTech.id,
          pos.coords.latitude,
          pos.coords.longitude,
          Math.round(pos.coords.accuracy),
          eventLabel
        );
        startLiveGpsWatch(currentTech.id);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsError('تم رفض إذن الموقع. من فضلك اسمح بالوصول للموقع (Location) من إعدادات المتصفح ليتمكن المدير من رؤية مكانك.');
        } else {
          setGpsStatus('denied');
          setGpsError('تعذر التقاط إشارة GPS حالياً — تأكد من تفعيل الموقع في جهازك وحاول مرة أخرى.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Auto-check geolocation permission on mount; if already granted, capture immediately
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((res) => {
          if (res.state === 'granted') {
            requestRealGpsLocation('تسجيل الموقع التلقائي عند فتح الصفحة (GPS)');
          }
        })
        .catch(() => {
          // Permissions API not supported on some iOS Safari versions — prompt card remains visible
        });
    }
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [currentTech.id]);

  // Quick Task Creator State
  const [quickTaskOpen, setQuickTaskOpen] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickSiteId, setQuickSiteId] = useState<string>(SITE_PRESETS[0].id);

  // Admin Chat Message State
  const [adminMsg, setAdminMsg] = useState<string>('');
  const [sentMessages, setSentMessages] = useState<Array<{ id: string; text: string; time: string; from: 'tech' | 'admin' }>>([
    {
      id: 'm1',
      text: 'مرحباً! تم تفعيل التتبع المباشر لوردية اليوم. يرجى تحديث مراحل الرحلة أولاً بأول عند الوصول لكل مركز.',
      time: '08:30 ص',
      from: 'admin',
    },
  ]);

  // Live Real-Time Clock Tick
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowDate(new Date());
      if (isClockedIn) {
        setShiftSeconds((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isClockedIn]);

  // GSAP Entrance & Clock Ring Pulse Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.emp-fade',
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.48, stagger: 0.055, ease: 'power3.out', clearProps: 'transform' }
      );
    }, portalRef);
    return () => ctx.revert();
  }, [section, activeTechId]);

  useEffect(() => {
    if (!clockRingRef.current) return;
    const progressRatio = isClockedIn ? Math.min(0.95, 0.25 + (shiftSeconds % 3600) / 4800) : 0.08;
    gsap.to(clockRingRef.current, {
      strokeDashoffset: CLOCK_CIRC * (1 - progressRatio),
      duration: 0.9,
      ease: 'power3.out',
    });
  }, [isClockedIn, Math.floor(shiftSeconds / 30)]);

  const handleToggleAttendance = () => {
    const timeStr = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastCheckTime(timeStr);
    const nextState = !isClockedIn;
    setIsClockedIn(nextState);
    if (nextState) {
      setShiftSeconds(0);
    }

    if (checkBtnRef.current) {
      gsap.fromTo(
        checkBtnRef.current,
        { scale: 0.95 },
        { scale: 1, duration: 0.4, ease: 'back.out(2)' }
      );
    }

    onSendAdminPing(
      currentTech.name,
      nextState
        ? `سجّل حضور بالـ GPS الساعة ${timeStr}`
        : `سجّل انصراف بالـ GPS الساعة ${timeStr}`
    );

    // Also capture & record real GPS location on check-in / check-out!
    requestRealGpsLocation(
      nextState ? `تسجيل حضور بالموقع GPS (${timeStr})` : `تسجيل انصراف بالموقع GPS (${timeStr})`
    );
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const site = SITE_PRESETS.find((s) => s.id === quickSiteId) || SITE_PRESETS[0];
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newMission: MaintenanceMission = {
      id: `msn-q-${Date.now()}`,
      code: `MT-${Math.floor(2100 + Math.random() * 800)}`,
      title: quickTitle.trim(),
      category: currentTech.specialty,
      description: 'مهمة ميدانية مسجلة مباشرة من هاتف الفني.',
      priority: 'high',
      technicianId: currentTech.id,
      site,
      scheduledDate: 'اليوم',
      scheduledTime: nowTime,
      estimatedDuration: '40 دقيقة',
      distanceKm: 3.4,
      etaMinutes: 11,
      stage: 1,
      stageLogs: [
        { stage: 0, timestamp: nowTime, note: 'تم تسجيل المهمة من تطبيق الفني' },
        { stage: 1, timestamp: nowTime, note: 'جاهز للانطلاق للموقع' },
      ],
      checklist: [
        { id: 'qc1', label: 'فحص أولي وتوثيق العطل بالموقع', done: false },
        { id: 'qc2', label: 'تنفيذ الصيانة واختبار التشغيل', done: false },
      ],
      resolutionNotes: '',
      createdAt: nowTime,
    };
    onCreateQuickTask(newMission);
    setQuickTitle('');
    setQuickTaskOpen(false);
  };

  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend ?? adminMsg).trim();
    if (!content) return;
    const t = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    setSentMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, text: content, time: t, from: 'tech' },
    ]);
    onSendAdminPing(currentTech.name, content);
    if (!textToSend) setAdminMsg('');
  };

  // Format live time in Arabic style like "2:32 ص"
  const hours24 = nowDate.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutesStr = String(nowDate.getMinutes()).padStart(2, '0');
  const ampm = hours24 >= 12 ? 'م' : 'ص';
  const greeting = hours24 < 12 ? 'صباح الخير' : 'مساء الخير';

  const shiftH = Math.floor(shiftSeconds / 3600);
  const shiftM = Math.floor((shiftSeconds % 3600) / 60);

  const liveActivityText = !isClockedIn
    ? 'خارج الوردية — سجّل حضورك لتفعيل التتبع'
    : activeMission
    ? activeMission.stage === 5
      ? `تم إنهاء زيارة ${activeMission.site.district} بنجاح`
      : activeMission.stage >= 3
      ? `داخل ${activeMission.site.name}`
      : `في الطريق لـ ${activeMission.site.name}`
    : 'متاح ومستعد لاستلام بلاغ جديد';

  const quickVisitButtonLabel = () => {
    if (!activeMission) return 'جاهز — بانتظار إسناد زيارة من الإدارة';
    if (activeMission.stage === 0) return `قبول البلاغ والاستعداد لـ ${activeMission.site.district}`;
    if (activeMission.stage === 1) return `بدء التحرك للمركز — ${activeMission.site.district}`;
    if (activeMission.stage === 2) return `وصلت عند المركز — ابدأ زيارة`;
    if (activeMission.stage === 3) return `بدء الصيانة والإصلاح بالموقع`;
    if (activeMission.stage === 4) return `إنهاء الزيارة وتأكيد حل المشكلة`;
    return `تم إنجاز الزيارة بنجاح ✓`;
  };

  const checklistDoneCount = activeMission
    ? activeMission.checklist.filter((c) => c.done).length
    : 0;

  return (
    <div ref={portalRef} className="emp-shell">
      {/* Subtle Top Warm Glow */}
      <div className="emp-top-glow" aria-hidden="true" />

      {/* NATIVE MOBILE-APP TOP HEADER */}
      <header className="emp-header">
        <div className="emp-header-identity">
          <div
            className="emp-brand-badge"
            style={{ background: currentTech.avatarColor }}
          >
            {currentTech.avatarInitials}
          </div>
          <div>
            <div className="emp-greeting">{greeting}</div>
            <div className="emp-username-title">{currentTech.name}</div>
          </div>
        </div>

        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-icon-btn"
            onClick={onToggleDarkMode}
            title="الوضع الليلي"
            aria-label="تبديل الوضع الليلي"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {lockedToEmployee && onLogoutEmployee ? (
            <button
              type="button"
              className="emp-icon-btn danger"
              onClick={onLogoutEmployee}
              title="تسجيل خروج"
              aria-label="تسجيل خروج"
            >
              <LogOut size={18} />
            </button>
          ) : (
            onSwitchToManager && (
              <button
                type="button"
                className="emp-icon-btn"
                onClick={onSwitchToManager}
                title="العودة لصفحة المدير"
                aria-label="العودة لصفحة المدير"
              >
                <Shield size={18} />
              </button>
            )
          )}
        </div>
      </header>

      {/* Preview Account Switcher Bar (only visible to Manager when previewing) */}
      {!lockedToEmployee && (
        <div className="emp-preview-switcher">
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            معاينة حساب:
          </span>
          <select
            className="emp-tech-select"
            value={currentTech.id}
            onChange={(e) => {
              const nextId = e.target.value;
              onChangeTechId(nextId);
              const firstForTech = missions.find((m) => m.technicianId === nextId);
              if (firstForTech) onSelectMission(firstForTech.id);
            }}
            aria-label="تبديل الموظف"
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.specialty}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* LIVE STATUS STRIP (Exact inspiration from screenshot: ● شغّال | في الطريق لـ ...) */}
      <div className="emp-status-strip emp-fade">
        <div className={`emp-status-tag ${isClockedIn ? 'online' : 'offline'}`}>
          <span className="emp-status-dot" />
          <span>{isClockedIn ? 'شغّال' : 'متوقف'}</span>
        </div>
        <div className="emp-status-text">{liveActivityText}</div>
      </div>

      {/* REAL GPS LOCATION PERMISSION & LIVE TRACKER CARD */}
      <div
        className={`emp-gps-banner emp-fade ${
          gpsStatus === 'active' ? 'active' : gpsStatus === 'denied' ? 'warn' : ''
        }`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 200px' }}>
          <div className="emp-gps-icon-box">
            {gpsStatus === 'active' ? (
              <LocateFixed size={18} />
            ) : (
              <Crosshair size={18} className={gpsStatus === 'requesting' ? 'anim-gear' : ''} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>
              {gpsStatus === 'active'
                ? 'موقعك الحقيقي (GPS) مُفعَّل ويُحدَّث للمدير'
                : gpsStatus === 'requesting'
                ? 'جاري طلب إذن الموقع وتحديد إحداثياتك...'
                : 'مطلوب السماح بالموقع (GPS) لتسجيل مكانك للمدير'}
            </div>
            <div style={{ fontSize: '0.73rem', opacity: 0.85, marginTop: 2 }}>
              {gpsStatus === 'active' ? (
                <span dir="ltr" style={{ fontWeight: 700 }}>
                  {currentTech.currentCoords.lat.toFixed(5)}, {currentTech.currentCoords.lng.toFixed(5)}
                  {currentTech.locationAccuracy ? ` (±${currentTech.locationAccuracy}م)` : ''}
                  {currentTech.lastLocationUpdatedAt ? ` • ${currentTech.lastLocationUpdatedAt}` : ''}
                </span>
              ) : gpsError ? (
                gpsError
              ) : (
                'اضغط «السماح وتحديد موقعي» ليتم تسجيل إحداثياتك تلقائياً في لوحة المدير'
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`pill-btn ${gpsStatus === 'active' ? '' : 'coral'}`}
          style={{ height: 36, fontSize: '0.76rem', flexShrink: 0 }}
          onClick={() =>
            requestRealGpsLocation(
              gpsStatus === 'active'
                ? 'تحديث فوري لموقع الفني (GPS)'
                : 'تفعيل مشاركة الموقع الحقيقي (GPS)'
            )
          }
        >
          <LocateFixed size={14} />
          <span>{gpsStatus === 'active' ? 'تحديث موقعي' : 'السماح وتحديد موقعي'}</span>
        </button>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="emp-content">
        {/* ================= TAB 1: HOME (الرئيسية) ================= */}
        {section === 'home' && (
          <div className="emp-home-grid">
            {/* Column 1: Hero Clock Ring + Check-In/Out + Quick Visit CTA */}
            <div className="emp-col-stack">
              {/* HERO LIVE ATTENDANCE RING CARD */}
              <div className="emp-clock-card emp-fade">
                <div className="emp-clock-ring-wrap">
                  <svg viewBox="0 0 210 210" className="emp-clock-svg">
                    <defs>
                      <linearGradient id="empClockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={isClockedIn ? '#E5485B' : '#94A3B8'} />
                        <stop offset="55%" stopColor={isClockedIn ? '#E56A45' : '#64748B'} />
                        <stop offset="100%" stopColor={isClockedIn ? '#F0984B' : '#94A3B8'} />
                      </linearGradient>
                    </defs>
                    {/* Soft outer ring shadow */}
                    <circle
                      cx="105"
                      cy="105"
                      r={CLOCK_R}
                      fill="none"
                      stroke="var(--border-soft)"
                      strokeWidth="12"
                    />
                    {/* Animated live ring */}
                    <circle
                      ref={clockRingRef}
                      cx="105"
                      cy="105"
                      r={CLOCK_R}
                      fill="none"
                      stroke="url(#empClockGrad)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={CLOCK_CIRC}
                      strokeDashoffset={CLOCK_CIRC * 0.25}
                      transform="rotate(-90 105 105)"
                      style={{
                        filter: isClockedIn
                          ? 'drop-shadow(0 6px 14px rgba(229, 72, 91, 0.28))'
                          : 'none',
                      }}
                    />
                  </svg>

                  <div className="emp-clock-center">
                    <div className="emp-clock-time">
                      <span className="emp-clock-digits">
                        {hours12}:{minutesStr}
                      </span>
                      <span className="emp-clock-ampm">{ampm}</span>
                    </div>
                    <div className="emp-clock-sub">
                      {isClockedIn
                        ? `في الشغل من ${shiftH} س ${shiftM} د`
                        : `آخر تسجيل: ${lastCheckTime}`}
                    </div>
                  </div>
                </div>

                {/* Shift Status Pill */}
                <div className="emp-shift-badge">
                  {isClockedIn
                    ? `الوردية: ${currentTech.shiftStart} — ${currentTech.shiftEnd}`
                    : 'سجّل حضورك لبدء الوردية'}
                </div>

                {/* Big Dark Espresso Check-in / Check-out Button */}
                <button
                  ref={checkBtnRef}
                  type="button"
                  onClick={handleToggleAttendance}
                  className={`emp-attendance-btn ${isClockedIn ? 'clocked-in' : 'clocked-out'}`}
                >
                  {isClockedIn ? <LogOut size={19} /> : <LogIn size={19} />}
                  <span>{isClockedIn ? 'سجّل انصراف' : 'سجّل حضور الآن'}</span>
                </button>

                <div className="emp-gps-caption">
                  <MapPin size={13} />
                  <span>الحضور بيتسجل بموقعك GPS وبتوقيت السيرفر</span>
                </div>
              </div>

              {/* QUICK ONE-TAP FIELD VISIT CTA (Exact inspiration: وصلت عند عميل — ابدأ زيارة) */}
              <button
                type="button"
                disabled={!activeMission || activeMission.stage === 5}
                onClick={() => activeMission && onAdvanceStage(activeMission.id)}
                className={`emp-visit-pill-btn emp-fade ${
                  activeMission?.stage === 5 ? 'done' : ''
                }`}
              >
                <MapPin size={18} color="var(--accent-coral)" />
                <span>{quickVisitButtonLabel()}</span>
              </button>

              {/* Live Management Visibility Footer Note */}
              <div className="emp-live-reassure emp-fade">
                <span className="live-dot" style={{ width: 7, height: 7 }} />
                <span>
                  {activeMission && activeMission.stage < 5
                    ? `متبقي ${activeMission.etaMinutes || 12} د — الإدارة شايفة تحركك مباشر`
                    : 'حالتك متزامنة لحظياً مع لوحة الإدارة'}
                </span>
              </div>
            </div>

            {/* Column 2: Active Animated Journey Bar + My Missions List */}
            <div className="emp-col-stack">
              {/* Active Kinetic Journey Bar */}
              {activeMission && (
                <div className="emp-fade">
                  <MissionProgressTracker
                    mission={activeMission}
                    technician={currentTech}
                    onAdvanceStage={onAdvanceStage}
                    onSetStage={onSetStage}
                    compact
                  />
                </div>
              )}

              {/* «مهامك» Header + "+ سجّل مهمة" */}
              <div className="emp-section-bar emp-fade">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900 }}>مهامك</h2>
                  <span className="emp-count-pill">{myMissions.length}</span>
                </div>

                <button
                  type="button"
                  className="emp-add-task-btn"
                  onClick={() => setQuickTaskOpen((v) => !v)}
                >
                  <Plus size={15} />
                  <span>سجّل مهمة</span>
                </button>
              </div>

              {/* Inline Quick Task Form */}
              {quickTaskOpen && (
                <form onSubmit={handleAddQuickTask} className="card emp-fade" style={{ padding: 15 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, marginBottom: 10 }}>
                    تسجيل زيارة أو مهمة صيانة سريعة
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="اكتب وصف العطل أو الزيارة..."
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                    />
                    <select
                      className="form-select"
                      value={quickSiteId}
                      onChange={(e) => setQuickSiteId(e.target.value)}
                    >
                      {SITE_PRESETS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.district}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="pill-btn"
                        style={{ height: 36 }}
                        onClick={() => setQuickTaskOpen(false)}
                      >
                        إلغاء
                      </button>
                      <button type="submit" className="pill-btn coral" style={{ height: 36 }}>
                        حفظ وإضافة لمهامي
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* My Tasks Cards */}
              {myMissions.length === 0 ? (
                <div className="emp-task-card emp-fade" style={{ textAlign: 'center', padding: 28 }}>
                  <div style={{ fontSize: '0.96rem', fontWeight: 900, marginBottom: 4 }}>
                    لا توجد مهام مسجلة حالياً
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    اضغط «+ سجّل مهمة» أو انتظر إسناد مهمة جديدة من المدير
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {myMissions.map((m) => {
                    const st = MISSION_STAGES[m.stage];
                    const isSelected = m.id === activeMission?.id;
                    return (
                      <div
                        key={m.id}
                        className={`emp-task-card emp-fade ${isSelected ? 'active' : ''}`}
                        onClick={() => onSelectMission(m.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                              {m.site.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                marginTop: 3,
                              }}
                            >
                              <MapPin size={13} color="var(--accent-coral)" />
                              <span>{m.site.district}</span>
                              <span>•</span>
                              <Clock size={12} />
                              <span>{m.scheduledTime}</span>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: st.softBg,
                              color: st.color,
                              fontSize: '0.73rem',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {st.shortTitle}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: 8 }}>
                          {m.title}
                        </div>

                        <div className="mini-progress-track">
                          <div className="mini-progress-fill" style={{ width: `${st.percent}%` }} />
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${m.site.coords.lat},${m.site.coords.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="pill-btn"
                            style={{ height: 34, fontSize: '0.75rem', textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                          >
                            <Navigation size={13} color="var(--accent-coral)" />
                            اللوكيشن
                          </a>
                          <a
                            href={`tel:${m.site.contactPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="pill-btn"
                            style={{ height: 34, fontSize: '0.75rem', textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                          >
                            <Phone size={13} />
                            اتصال
                          </a>
                          <button
                            type="button"
                            className="pill-btn primary"
                            style={{ height: 34, fontSize: '0.75rem', flex: 1.2, justifyContent: 'center' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMission(m.id);
                              onChangeSection('missions');
                            }}
                          >
                            تفاصيل العطل
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MISSIONS & REPAIRS (الأعطال) ================= */}
        {section === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeMission ? (
              <>
                <div className="emp-fade">
                  <MissionProgressTracker
                    mission={activeMission}
                    technician={currentTech}
                    onAdvanceStage={onAdvanceStage}
                    onSetStage={onSetStage}
                  />
                </div>

                <div className="emp-home-grid">
                  {/* Checklist & Resolution Notes */}
                  <div className="card emp-fade">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">
                          <ClipboardList size={18} color="var(--accent-coral)" />
                          خطوات الإصلاح وتقرير الفني
                        </h3>
                        <p className="card-subtitle">
                          أُنجز {checklistDoneCount} من {activeMission.checklist.length} خطوات
                        </p>
                      </div>
                      <span className="badge resolved">
                        <ShieldCheck size={14} />
                        {Math.round((checklistDoneCount / Math.max(1, activeMission.checklist.length)) * 100)}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {activeMission.checklist.map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item ${item.done ? 'done' : ''}`}
                          onClick={() => onToggleChecklist(activeMission.id, item.id)}
                        >
                          {item.done ? (
                            <CheckCircle2 size={19} color="#2F8A5B" />
                          ) : (
                            <Circle size={19} color="var(--text-muted)" />
                          )}
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              textDecoration: item.done ? 'line-through' : 'none',
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {activeMission.partsNeeded && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '7px 12px',
                          borderRadius: 11,
                          background: 'var(--pastel-amber-bg)',
                          color: 'var(--pastel-amber-text)',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          marginBottom: 12,
                        }}
                      >
                        <Package size={14} />
                        قطع الغيار: {activeMission.partsNeeded}
                      </div>
                    )}

                    <div>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <FileText size={14} />
                        ملاحظات الحل (تظهر للمدير لحظياً)
                      </label>
                      <textarea
                        rows={3}
                        className="form-textarea"
                        placeholder="اكتب ما تم إصلاحه وتوصياتك..."
                        value={activeMission.resolutionNotes}
                        onChange={(e) => onUpdateNotes(activeMission.id, e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Map & Site Card */}
                  <div className="card emp-fade">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">
                          <MapPin size={18} color="var(--accent-coral)" />
                          خريطة اللوكيشن والمسار
                        </h3>
                        <p className="card-subtitle">{activeMission.site.address}</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${activeMission.site.coords.lat},${activeMission.site.coords.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="pill-btn primary"
                        style={{ height: 34, fontSize: '0.76rem', textDecoration: 'none' }}
                      >
                        <ExternalLink size={13} />
                        Google Maps
                      </a>
                    </div>
                    <LiveFieldMap
                      missions={myMissions}
                      technicians={technicians}
                      selectedMissionId={activeMission.id}
                      onSelectMission={onSelectMission}
                      height={290}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="card emp-fade" style={{ textAlign: 'center', padding: 36 }}>
                <h3 style={{ margin: '0 0 6px' }}>لا توجد أعطال مفتوحة حالياً</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  عند تعيين بلاغ جديد من الإدارة ستظهر تفاصيله وبار الرحلة هنا.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: MONTHLY SCHEDULE & ATTENDANCE (شهري) ================= */}
        {section === 'monthly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="kpi-grid emp-fade" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="kpi-card sage">
                <div className="kpi-label">أيام الحضور هذا الشهر</div>
                <div className="kpi-value">18</div>
                <div className="kpi-meta">التزام 98% بالمواعيد</div>
              </div>
              <div className="kpi-card peach">
                <div className="kpi-label">زيارات منجزة</div>
                <div className="kpi-value">{currentTech.completedToday + 26}</div>
                <div className="kpi-meta">اليوم: {currentTech.completedToday}</div>
              </div>
              <div className="kpi-card amber">
                <div className="kpi-label">التقييم الشهري</div>
                <div className="kpi-value">{currentTech.rating} ★</div>
                <div className="kpi-meta">أداء متميز</div>
              </div>
            </div>

            <div className="card emp-fade">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <CalendarDays size={18} color="var(--accent-coral)" />
                    مواعيد وأيام عملك الرسمية
                  </h3>
                  <p className="card-subtitle">
                    محددة من إدارة العمليات • الوردية: {currentTech.shiftStart} إلى {currentTech.shiftEnd}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {(currentTech.workDays || []).map((day) => (
                  <span key={day} className="day-chip active" style={{ cursor: 'default' }}>
                    {day}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                🚐 المركبة المخصصة: <strong>{currentTech.vehicle}</strong> • حساب الدخول:{' '}
                <code dir="ltr" style={{ fontWeight: 800 }}>@{currentTech.username}</code>
              </div>
            </div>

            <div className="card emp-fade">
              <div className="card-header">
                <h3 className="card-title">سجل الحضور والانصراف الأخير</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { day: 'اليوم — السبت', inTime: lastCheckTime, outTime: isClockedIn ? 'مستمر الآن' : lastCheckTime, status: 'حاضر GPS' },
                  { day: 'الخميس 19 نوفمبر', inTime: currentTech.shiftStart, outTime: currentTech.shiftEnd, status: 'مكتمل' },
                  { day: 'الأربعاء 18 نوفمبر', inTime: currentTech.shiftStart, outTime: currentTech.shiftEnd, status: 'مكتمل' },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderRadius: 14,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-soft)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: '0.86rem' }}>{row.day}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      حضور: {row.inTime} • انصراف: {row.outTime}
                    </span>
                    <span className="badge resolved">{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ADMIN / COMMUNICATIONS (الإدارة) ================= */}
        {section === 'admin' && (
          <div className="card emp-fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-header" style={{ marginBottom: 4 }}>
              <div>
                <h3 className="card-title">
                  <MessageCircle size={18} color="var(--accent-coral)" />
                  التواصل المباشر مع الإدارة
                </h3>
                <p className="card-subtitle">
                  أرسل تحديثاً فورياً لغرفة عمليات المدير — يصل كتنبيه مباشر
                </p>
              </div>
            </div>

            {/* Quick Status Replies */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {[
                'وصلت الموقع وجاري الفحص',
                'أحتاج قطعة غيار إضافية',
                'تأخير 10 دقائق بسبب الزحام',
                'تم الإصلاح وتسليم المركز بنجاح',
              ].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  className="pill-btn"
                  style={{ height: 34, fontSize: '0.76rem' }}
                  onClick={() => handleSendMessage(quick)}
                >
                  {quick}
                </button>
              ))}
            </div>

            {/* Message Thread */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
                padding: 12,
                borderRadius: 16,
                background: 'var(--bg-card-subtle)',
                minHeight: 190,
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {sentMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.from === 'tech' ? 'flex-start' : 'flex-end',
                    maxWidth: '84%',
                    padding: '10px 14px',
                    borderRadius: 16,
                    background:
                      msg.from === 'tech'
                        ? 'var(--accent-coral)'
                        : 'var(--bg-elevated)',
                    color: msg.from === 'tech' ? '#fff' : 'var(--text-primary)',
                    border: msg.from === 'admin' ? '1px solid var(--border-soft)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>{msg.text}</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.78, marginTop: 4 }}>
                    {msg.from === 'tech' ? 'أنت' : 'غرفة الإدارة'} • {msg.time}
                  </div>
                </div>
              ))}
            </div>

            {/* Send Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="اكتب رسالة للإدارة..."
                value={adminMsg}
                onChange={(e) => setAdminMsg(e.target.value)}
              />
              <button type="submit" className="pill-btn coral" style={{ flexShrink: 0 }}>
                <Send size={15} />
                إرسال
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FLOATING GLASSMORPHIC PILL BOTTOM NAVIGATION DOCK (Inspired by screenshot) */}
      <nav className="emp-floating-dock" aria-label="تنقل صفحة الموظف">
        <button
          type="button"
          className={`emp-dock-btn ${section === 'home' ? 'active' : ''}`}
          onClick={() => onChangeSection('home')}
        >
          <Home size={19} />
          <span>الرئيسية</span>
        </button>

        <button
          type="button"
          className={`emp-dock-btn ${section === 'missions' ? 'active' : ''}`}
          onClick={() => onChangeSection('missions')}
        >
          <Wrench size={19} />
          <span>الأعطال</span>
        </button>

        <button
          type="button"
          className={`emp-dock-btn ${section === 'monthly' ? 'active' : ''}`}
          onClick={() => onChangeSection('monthly')}
        >
          <Calendar size={19} />
          <span>شهري</span>
        </button>

        <button
          type="button"
          className={`emp-dock-btn ${section === 'admin' ? 'active' : ''}`}
          onClick={() => onChangeSection('admin')}
        >
          <MessageCircle size={19} />
          <span>الإدارة</span>
        </button>
      </nav>
    </div>
  );
};
