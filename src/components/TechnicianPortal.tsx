import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Star,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { MISSION_STAGES } from '../data/initialData';
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
}

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
}) => {
  const portalRef = useRef<HTMLDivElement>(null);

  const currentTech =
    technicians.find((t) => t.id === activeTechId) || technicians[0];
  const myMissions = missions.filter((m) => m.technicianId === currentTech.id);
  const activeMission =
    myMissions.find((m) => m.id === selectedMissionId) ||
    myMissions.find((m) => m.stage < 5) ||
    myMissions[0] ||
    missions[0];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.tech-stagger',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' }
      );
    }, portalRef);
    return () => ctx.revert();
  }, [section, activeTechId]);

  const checklistDoneCount = activeMission
    ? activeMission.checklist.filter((c) => c.done).length
    : 0;

  return (
    <div ref={portalRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Technician Sub-nav & Account Selector */}
      <div className="subnav-strip">
        <div className="subnav-tabs">
          <button
            type="button"
            className={`subnav-tab ${section === 'active' ? 'active' : ''}`}
            onClick={() => onChangeSection('active')}
          >
            المهمة النشطة وبار التتبع
          </button>
          <button
            type="button"
            className={`subnav-tab ${section === 'schedule' ? 'active' : ''}`}
            onClick={() => onChangeSection('schedule')}
          >
            مواعيدي اليوم ({myMissions.length})
          </button>
          <button
            type="button"
            className={`subnav-tab ${section === 'map' ? 'active' : ''}`}
            onClick={() => onChangeSection('map')}
          >
            خريطة اللوكيشن والمسار
          </button>
        </div>

        {/* Switch Technician Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            حساب الفني:
          </span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            value={currentTech.id}
            onChange={(e) => {
              const nextId = e.target.value;
              onChangeTechId(nextId);
              const firstForTech = missions.find((m) => m.technicianId === nextId);
              if (firstForTech) onSelectMission(firstForTech.id);
            }}
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.specialty}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Technician Welcome & Shift Banner */}
      <div
        className="card tech-stagger"
        style={{
          background:
            'linear-gradient(125deg, var(--bg-card) 0%, var(--pastel-peach-bg) 160%)',
          padding: '18px 22px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="user-avatar"
              style={{
                width: 54,
                height: 54,
                borderRadius: 17,
                background: currentTech.avatarColor,
                fontSize: '1.1rem',
                boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
              }}
            >
              {currentTech.avatarInitials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
                  أهلاً، {currentTech.name}
                </h1>
                <span className="badge resolved">
                  <span className="live-dot" style={{ width: 7, height: 7 }} />
                  متصل بنظام GPS
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span>{currentTech.role}</span>
                <span>•</span>
                <span>الوردية: {currentTech.shiftStart} إلى {currentTech.shiftEnd}</span>
                <span>•</span>
                <span>🚐 {currentTech.vehicle}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '9px 14px',
                borderRadius: 14,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: '0.82rem',
                fontWeight: 800,
              }}
            >
              <CalendarClock size={16} color="var(--accent-coral)" />
              {myMissions.length} مهام اليوم
            </div>
            <div
              style={{
                padding: '9px 14px',
                borderRadius: 14,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: '0.82rem',
                fontWeight: 800,
              }}
            >
              <Star size={16} color="#D97706" />
              تقييم {currentTech.rating}
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE MISSION & GSAP PROGRESS TRACKER */}
      {section === 'active' && activeMission && (
        <>
          <div className="tech-stagger">
            <MissionProgressTracker
              mission={activeMission}
              technician={currentTech}
              onAdvanceStage={onAdvanceStage}
              onSetStage={onSetStage}
            />
          </div>

          <div className="tech-split">
            {/* Right Column: Site Details + Checklist + Report */}
            <div className="dashboard-stack">
              {/* Site & Problem Details Card */}
              <div className="card tech-stagger">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <MapPin size={18} color="var(--accent-coral)" />
                      تفاصيل اللوكيشن والبلاغ
                    </h3>
                    <p className="card-subtitle">بيانات المركز ومسؤول الاستلام والقطع المطلوبة</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activeMission.site.coords.lat},${activeMission.site.coords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pill-btn primary"
                    style={{ height: 36, fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} />
                    الاتجاهات بالخريطة
                  </a>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 15,
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-soft)',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: 4 }}>
                    {activeMission.site.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    📍 {activeMission.site.address} — ({activeMission.site.district})
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      flexWrap: 'wrap',
                      marginTop: 10,
                      fontSize: '0.79rem',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <UserCheck size={14} color="var(--accent-coral)" />
                      مسؤول المركز: {activeMission.site.contactName}
                    </span>
                    <a
                      href={`tel:${activeMission.site.contactPhone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: 'var(--accent-coral)',
                        textDecoration: 'none',
                      }}
                    >
                      <Phone size={14} />
                      {activeMission.site.contactPhone}
                    </a>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={14} />
                      المدة التقديرية: {activeMission.estimatedDuration}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 5 }}>
                    وصف المشكلة:
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {activeMission.description}
                  </p>
                </div>

                {activeMission.partsNeeded && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 12,
                      background: 'var(--pastel-amber-bg)',
                      color: 'var(--pastel-amber-text)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                    }}
                  >
                    <Package size={15} />
                    قطع الغيار المطلوبة: {activeMission.partsNeeded}
                  </div>
                )}
              </div>

              {/* Interactive Checklist & Technical Resolution Notes */}
              <div className="card tech-stagger">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <ClipboardList size={18} color="var(--accent-coral)" />
                      قائمة فحص الصيانة وتقرير الحل
                    </h3>
                    <p className="card-subtitle">
                      تم إنجاز {checklistDoneCount} من {activeMission.checklist.length} خطوات فحص
                    </p>
                  </div>
                  <span className="badge resolved">
                    <ShieldCheck size={14} />
                    {Math.round((checklistDoneCount / Math.max(1, activeMission.checklist.length)) * 100)}%
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                  {activeMission.checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`checklist-item ${item.done ? 'done' : ''}`}
                      onClick={() => onToggleChecklist(activeMission.id, item.id)}
                    >
                      {item.done ? (
                        <CheckCircle2 size={20} color="#2F8A5B" />
                      ) : (
                        <Circle size={20} color="var(--text-muted)" />
                      )}
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          textDecoration: item.done ? 'line-through' : 'none',
                          opacity: item.done ? 0.78 : 1,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
                  >
                    <FileText size={14} />
                    تقرير الفني وملاحظات الإصلاح (تظهر فوراً للمدير)
                  </label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="اكتب ما تم إصلاحه، قراءات القياس، أو أي توصيات للمركز..."
                    value={activeMission.resolutionNotes}
                    onChange={(e) => onUpdateNotes(activeMission.id, e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Left Column: Stage Log + Technician's Today Queue */}
            <div className="dashboard-stack">
              {/* Live Stage Timeline Log */}
              <div className="card tech-stagger">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <Clock size={18} color="var(--accent-coral)" />
                      السجل الزمني للرحلة
                    </h3>
                    <p className="card-subtitle">توثيق لحظي لكل مرحلة من استلام البلاغ للحل</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeMission.stageLogs.map((log, idx) => {
                    const st = MISSION_STAGES[log.stage];
                    return (
                      <div
                        key={`${log.stage}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 13,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-soft)',
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: st.color,
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                            <strong style={{ fontSize: '0.83rem' }}>{st.title}</strong>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: st.color }}>
                              {log.timestamp}
                            </span>
                          </div>
                          {log.note && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {log.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* My Missions Queue */}
              <div className="card tech-stagger">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <Wrench size={18} color="var(--accent-coral)" />
                      مهامي المجدولة اليوم ({myMissions.length})
                    </h3>
                    <p className="card-subtitle">اضغط على أي مهمة لتحميلها في بار التتبع</p>
                  </div>
                </div>

                {myMissions.length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                    لا توجد مهام مسندة حالياً لهذا الفني. يمكنك إسناد مهمة جديدة من لوحة المدير.
                  </p>
                ) : (
                  <div className="missions-list">
                    {myMissions.map((m) => {
                      const st = MISSION_STAGES[m.stage];
                      const isCurrent = m.id === activeMission.id;
                      return (
                        <div
                          key={m.id}
                          className={`mission-row-card ${isCurrent ? 'selected' : ''}`}
                          style={{ cursor: 'pointer', padding: '12px 14px' }}
                          onClick={() => onSelectMission(m.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span className={`badge ${m.stage === 5 ? 'resolved' : m.priority}`}>
                              {m.code}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: st.color }}>
                              {st.shortTitle} • {st.percent}%
                            </span>
                          </div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, marginTop: 6 }}>
                            {m.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            📍 {m.site.district} • 🕒 {m.scheduledTime}
                          </div>
                          <div className="mini-progress-track">
                            <div className="mini-progress-fill" style={{ width: `${st.percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* SCHEDULE TAB */}
      {section === 'schedule' && (
        <div className="card tech-stagger">
          <div className="card-header">
            <div>
              <h3 className="card-title">جدول مواعيد الصيانة — {currentTech.name}</h3>
              <p className="card-subtitle">مرتبة حسب أوقات الزيارة والمواقع</p>
            </div>
          </div>
          <div className="missions-list">
            {myMissions.map((m) => {
              const st = MISSION_STAGES[m.stage];
              return (
                <div
                  key={m.id}
                  className="mission-row-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    onSelectMission(m.id);
                    onChangeSection('active');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${m.stage === 5 ? 'resolved' : m.priority}`}>
                          {m.scheduledTime}
                        </span>
                        <strong>{m.title}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 5 }}>
                        📍 {m.site.name} — {m.site.address}
                      </div>
                    </div>
                    <button type="button" className="pill-btn primary" style={{ height: 34, fontSize: '0.77rem' }}>
                      فتح بار التتبع ({st.percent}%)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAP TAB */}
      {section === 'map' && (
        <div className="card tech-stagger">
          <div className="card-header">
            <div>
              <h3 className="card-title">خريطة مساري ومواقع المراكز</h3>
              <p className="card-subtitle">تحديد مسار الحركة المباشر ومواقع صيانات اليوم</p>
            </div>
          </div>
          <LiveFieldMap
            missions={myMissions.length ? myMissions : missions}
            technicians={technicians}
            selectedMissionId={activeMission?.id || selectedMissionId}
            onSelectMission={onSelectMission}
            height={420}
          />
        </div>
      )}
    </div>
  );
};
