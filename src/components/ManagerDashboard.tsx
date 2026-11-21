import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  AlertTriangle,
  ArrowUpLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Phone,
  Plus,
  ShieldAlert,
  Star,
  Truck,
  Users,
  Wrench,
  Activity,
} from 'lucide-react';
import { MISSION_STAGES } from '../data/initialData';
import {
  MaintenanceMission,
  ManagerSection,
  MissionStageIndex,
  Technician,
} from '../types/maintenance';
import { LiveFieldMap } from './LiveFieldMap';
import { MissionProgressTracker } from './MissionProgressTracker';

interface ManagerDashboardProps {
  section: ManagerSection;
  onChangeSection: (s: ManagerSection) => void;
  missions: MaintenanceMission[];
  technicians: Technician[];
  selectedMissionId: string;
  onSelectMission: (id: string) => void;
  onOpenAssignModal: () => void;
  onAdvanceStage: (missionId: string) => void;
  onSetStage: (missionId: string, stage: MissionStageIndex) => void;
  onInspectAsTechnician: (techId: string, missionId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  section,
  onChangeSection,
  missions,
  technicians,
  selectedMissionId,
  onSelectMission,
  onOpenAssignModal,
  onAdvanceStage,
  onSetStage,
  onInspectAsTechnician,
}) => {
  const dashRef = useRef<HTMLDivElement>(null);
  const [stageFilter, setStageFilter] = useState<'all' | 'urgent' | 'en_route' | 'working' | 'resolved'>('all');
  const [slaMinutes, setSlaMinutes] = useState<string>('30د');

  // GSAP entrance animations for KPIs & cards
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-stagger',
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.06,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );
    }, dashRef);
    return () => ctx.revert();
  }, [section]);

  const urgentCount = missions.filter((m) => m.priority === 'urgent' && m.stage < 5).length;
  const enRouteCount = missions.filter((m) => m.stage === 2).length;
  const workingCount = missions.filter((m) => m.stage === 3 || m.stage === 4).length;
  const pendingCount = missions.filter((m) => m.stage === 0 || m.stage === 1).length;
  const resolvedCount = missions.filter((m) => m.stage === 5).length;
  const activeFieldTechs = technicians.filter((t) => t.status !== 'break').length;

  const filteredMissions = missions.filter((m) => {
    if (stageFilter === 'urgent') return m.priority === 'urgent' && m.stage < 5;
    if (stageFilter === 'en_route') return m.stage === 2;
    if (stageFilter === 'working') return m.stage === 3 || m.stage === 4;
    if (stageFilter === 'resolved') return m.stage === 5;
    return true;
  });

  const selectedMission =
    missions.find((m) => m.id === selectedMissionId) || missions[0];
  const selectedTech = technicians.find(
    (t) => t.id === selectedMission?.technicianId
  );

  const getTechName = (id: string) =>
    technicians.find((t) => t.id === id)?.name || 'غير محدد';

  const getTechObj = (id: string) => technicians.find((t) => t.id === id);

  return (
    <div ref={dashRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-navigation Pill Strip (matching reference top inner bar) */}
      <div className="subnav-strip">
        <div className="subnav-tabs">
          <button
            type="button"
            className={`subnav-tab ${section === 'overview' ? 'active' : ''}`}
            onClick={() => onChangeSection('overview')}
          >
            لوحة التحكم
          </button>
          <button
            type="button"
            className={`subnav-tab ${section === 'missions' ? 'active' : ''}`}
            onClick={() => onChangeSection('missions')}
          >
            جدول الصيانات والمواعيد ({missions.length})
          </button>
          <button
            type="button"
            className={`subnav-tab ${section === 'map' ? 'active' : ''}`}
            onClick={() => onChangeSection('map')}
          >
            خريطة المواقع واللوكيشن
          </button>
          <button
            type="button"
            className={`subnav-tab ${section === 'technicians' ? 'active' : ''}`}
            onClick={() => onChangeSection('technicians')}
          >
            فريق الفنيين ({technicians.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            تحديث لحظي متزامن مع هواتف الفنيين
          </span>
          <span className="live-dot" />
        </div>
      </div>

      {/* Page Heading Row */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">غرفة عمليات المدير • نظرة عامة</div>
          <h1 className="page-title">
            {section === 'overview' && 'لوحة تحكم الصيانة الميدانية'}
            {section === 'missions' && 'جدول مهام الصيانة والأوقات'}
            {section === 'map' && 'خريطة التتبع والمواقع المباشرة (GPS)'}
            {section === 'technicians' && 'إدارة فريق الفنيين والورديات'}
          </h1>
          <p className="page-subtitle">
            السبت، 21 نوفمبر • كل حركة الفنيين والمواقع وأوقات الصيانة في مكان واحد
          </p>
        </div>

        <div className="page-actions">
          <button type="button" className="pill-btn" onClick={() => onChangeSection('map')}>
            <Compass size={16} color="var(--accent-coral)" />
            خريطة GPS
          </button>
          <button type="button" className="pill-btn primary" onClick={onOpenAssignModal}>
            <Plus size={17} />
            تعيين صيانة جديدة
          </button>
        </div>
      </div>

      {/* OVERVIEW SECTION */}
      {section === 'overview' && (
        <>
          {/* Department Alerts Strip (Matches reference "تنبيهات الأقسام") */}
          <div className="card gsap-stagger" style={{ padding: '14px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                تنبيهات الصيانة الحية
              </span>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                إشعارات عاجلة: {urgentCount} • اضغط للتصفية السريعة
              </span>
            </div>

            <div className="alerts-strip-grid">
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className={`dept-pill sage ${stageFilter === 'all' ? 'active-filter' : ''}`}
              >
                <Activity size={15} />
                الكل
                <span className="pill-count">{missions.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setStageFilter('urgent')}
                className={`dept-pill peach ${stageFilter === 'urgent' ? 'active-filter' : ''}`}
              >
                <ShieldAlert size={15} />
                بلاغات عاجلة
                <span className={`pill-count ${urgentCount > 0 ? 'danger' : ''}`}>
                  {urgentCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStageFilter('en_route')}
                className={`dept-pill sky ${stageFilter === 'en_route' ? 'active-filter' : ''}`}
              >
                <Truck size={15} />
                في الطريق للمركز
                <span className="pill-count">{enRouteCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setStageFilter('working')}
                className={`dept-pill amber ${stageFilter === 'working' ? 'active-filter' : ''}`}
              >
                <Wrench size={15} />
                جاري الفحص والإصلاح
                <span className="pill-count">{workingCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setStageFilter('resolved')}
                className={`dept-pill mint ${stageFilter === 'resolved' ? 'active-filter' : ''}`}
              >
                <CheckCircle2 size={15} />
                مكتمل اليوم
                <span className="pill-count">{resolvedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeSection('technicians')}
                className="dept-pill lavender"
              >
                <Users size={15} />
                فنيون متاحون
                <span className="pill-count">
                  {technicians.filter((t) => t.status === 'available').length}
                </span>
              </button>
            </div>
          </div>

          {/* 4 Pastel KPI Cards (Exact reference palette & layout) */}
          <div className="kpi-grid">
            <div className="kpi-card sage gsap-stagger">
              <div className="kpi-top">
                <span className="kpi-label">إجمالي صيانات اليوم</span>
                <div className="kpi-icon-bubble">
                  <CalendarClock size={18} />
                </div>
              </div>
              <div className="kpi-value">{missions.length}</div>
              <div className="kpi-meta">مكتمل {resolvedCount} • متبقي {missions.length - resolvedCount}</div>
            </div>

            <div className="kpi-card peach gsap-stagger">
              <div className="kpi-top">
                <span className="kpi-label">فنيون في الميدان الآن</span>
                <div className="kpi-icon-bubble">
                  <Truck size={18} />
                </div>
              </div>
              <div className="kpi-value">{activeFieldTechs}</div>
              <div className="kpi-meta">في الطريق {enRouteCount} • بالموقع {workingCount}</div>
            </div>

            <div className="kpi-card amber gsap-stagger">
              <div className="kpi-top">
                <span className="kpi-label">بلاغات بانتظار التحرك</span>
                <div className="kpi-icon-bubble">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="kpi-value">{pendingCount}</div>
              <div className="kpi-meta">عاجل {urgentCount} • هدف الاستجابة {slaMinutes}</div>
            </div>

            <div className="kpi-card sky gsap-stagger">
              <div className="kpi-top">
                <span className="kpi-label">متوسط الوصول والحل</span>
                <div className="kpi-icon-bubble">
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-value">24 د</div>
              <div className="kpi-meta">دقة المواعيد 96% • تقييم المراكز 4.9★</div>
            </div>
          </div>

          {/* Main Split Workspace: Right = Live Tracker + Map, Left = "محتاج متابعة" */}
          <div className="dashboard-split">
            <div className="dashboard-stack">
              {/* Live Synchronized GSAP Progress Tracker for Selected Mission */}
              {selectedMission && (
                <div className="gsap-stagger">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                      padding: '0 4px',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      متابعة البث المباشر لبار الفني ({selectedTech?.name})
                    </span>
                    <button
                      type="button"
                      className="pill-btn"
                      style={{ height: 34, fontSize: '0.78rem' }}
                      onClick={() =>
                        onInspectAsTechnician(selectedMission.technicianId, selectedMission.id)
                      }
                    >
                      فتح في صفحة الفني
                      <ArrowUpLeft size={14} />
                    </button>
                  </div>

                  <MissionProgressTracker
                    mission={selectedMission}
                    technician={selectedTech}
                    onAdvanceStage={onAdvanceStage}
                    onSetStage={onSetStage}
                    compact
                  />
                </div>
              )}

              {/* Live Field Map & Locations */}
              <div className="card gsap-stagger">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <MapPin size={18} color="var(--accent-coral)" />
                      خريطة توزيع الفنيين والمواقع المباشرة
                    </h3>
                    <p className="card-subtitle">
                      اضغط على أي مركز أو فني لمتابعة مساره المباشر وإحداثيات اللوكيشن
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ height: 34, fontSize: '0.78rem' }}
                    onClick={() => onChangeSection('map')}
                  >
                    تكبير الخريطة
                  </button>
                </div>

                <LiveFieldMap
                  missions={filteredMissions.length ? filteredMissions : missions}
                  technicians={technicians}
                  selectedMissionId={selectedMissionId}
                  onSelectMission={onSelectMission}
                  height={310}
                />
              </div>

              {/* Live Missions Queue Table/Cards */}
              <div className="card gsap-stagger">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">سجل البلاغات والرحلات النشطة</h3>
                    <p className="card-subtitle">
                      كل مهمة تعرض الموقع والوقت والفني ونسبة التقدم الفعلية
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ height: 34, fontSize: '0.78rem' }}
                    onClick={() => onChangeSection('missions')}
                  >
                    السجل كله ←
                  </button>
                </div>

                <div className="missions-list">
                  {filteredMissions.map((m) => {
                    const st = MISSION_STAGES[m.stage];
                    const tech = getTechObj(m.technicianId);
                    const isSelected = m.id === selectedMissionId;
                    return (
                      <div
                        key={m.id}
                        className={`mission-row-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelectMission(m.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              <span className={`badge ${m.stage === 5 ? 'resolved' : m.priority}`}>
                                {m.code}
                              </span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>{m.title}</span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                                marginTop: 6,
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={13} color="var(--accent-coral)" />
                                {m.site.name}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} />
                                {m.scheduledDate} • {m.scheduledTime}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5px 10px',
                                borderRadius: 11,
                                background: 'var(--bg-card-subtle)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                              }}
                            >
                              <span
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 7,
                                  background: tech?.avatarColor || '#555',
                                  color: '#fff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                }}
                              >
                                {tech?.avatarInitials}
                              </span>
                              {tech?.name}
                            </div>
                            <span
                              style={{
                                padding: '5px 10px',
                                borderRadius: 10,
                                background: st.softBg,
                                color: st.color,
                                fontSize: '0.75rem',
                                fontWeight: 800,
                              }}
                            >
                              {st.shortTitle} ({st.percent}%)
                            </span>
                          </div>
                        </div>

                        <div className="mini-progress-track">
                          <div className="mini-progress-fill" style={{ width: `${st.percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LEFT SIDEBAR CARD ("محتاج متابعة" — Faithful to Reference Left Column!) */}
            <div className="card gsap-stagger">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div>
                  <h3 className="card-title">محتاج متابعة</h3>
                  <p className="card-subtitle">الحالات والطلبات اللي محتاجة قرار سريع</p>
                </div>
              </div>

              <div className="followup-list">
                <div
                  className="followup-item crimson"
                  onClick={() => setStageFilter('urgent')}
                >
                  <div className="followup-info">
                    <div
                      className="followup-icon"
                      style={{ background: '#FDE2E2', color: '#DC2626' }}
                    >
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <p className="followup-title">بلاغات طوارئ مفتوحة</p>
                      <p className="followup-desc">أولوية قصوى للمراكز</p>
                    </div>
                  </div>
                  <span
                    className="count-chip"
                    style={{ background: '#DC2626', color: '#fff' }}
                  >
                    {urgentCount}
                  </span>
                </div>

                <div
                  className="followup-item purple"
                  onClick={() => setStageFilter('en_route')}
                >
                  <div className="followup-info">
                    <div
                      className="followup-icon"
                      style={{ background: 'var(--pastel-lavender-bg)', color: '#6D48B6' }}
                    >
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className="followup-title">فنيون في الطريق الآن</p>
                      <p className="followup-desc">متابعة زمن الوصول GPS</p>
                    </div>
                  </div>
                  <span
                    className="count-chip"
                    style={{
                      background: 'var(--pastel-lavender-bg)',
                      color: 'var(--pastel-lavender-text)',
                    }}
                  >
                    {enRouteCount}
                  </span>
                </div>

                <div
                  className="followup-item coral"
                  onClick={() => setStageFilter('working')}
                >
                  <div className="followup-info">
                    <div
                      className="followup-icon"
                      style={{ background: 'var(--pastel-peach-bg)', color: '#C8522E' }}
                    >
                      <Wrench size={18} />
                    </div>
                    <div>
                      <p className="followup-title">جاري الصيانة بالمراكز</p>
                      <p className="followup-desc">فنيون داخل مواقع العمل</p>
                    </div>
                  </div>
                  <span
                    className="count-chip"
                    style={{
                      background: 'var(--pastel-peach-bg)',
                      color: 'var(--pastel-peach-text)',
                    }}
                  >
                    {workingCount}
                  </span>
                </div>

                <div
                  className="followup-item amber"
                  onClick={() => setStageFilter('all')}
                >
                  <div className="followup-info">
                    <div
                      className="followup-icon"
                      style={{ background: 'var(--pastel-amber-bg)', color: '#A36F12' }}
                    >
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="followup-title">بانتظار قبول الفني</p>
                      <p className="followup-desc">مهام مجدولة لم تبدأ بعد</p>
                    </div>
                  </div>
                  <span
                    className="count-chip"
                    style={{
                      background: 'var(--pastel-amber-bg)',
                      color: 'var(--pastel-amber-text)',
                    }}
                  >
                    {pendingCount}
                  </span>
                </div>

                <div
                  className="followup-item emerald"
                  onClick={() => setStageFilter('resolved')}
                >
                  <div className="followup-info">
                    <div
                      className="followup-icon"
                      style={{ background: 'var(--pastel-mint-bg)', color: '#157A4B' }}
                    >
                      <Star size={18} />
                    </div>
                    <div>
                      <p className="followup-title">مهام مكتملة ومُعتمدة</p>
                      <p className="followup-desc">تم الحل وإغلاق التذكرة</p>
                    </div>
                  </div>
                  <span
                    className="count-chip"
                    style={{
                      background: 'var(--pastel-mint-bg)',
                      color: 'var(--pastel-mint-text)',
                    }}
                  >
                    {resolvedCount}
                  </span>
                </div>
              </div>

              {/* SLA Quick Selector Widget (Matches reference "الانتظار دلوقتي" bottom-left card!) */}
              <div className="sla-widget">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      هدف سرعة الوصول (SLA)
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      التنبيه التلقائي لو الفني اتأخر عن الموعد
                    </div>
                  </div>
                  <Clock size={16} color="var(--accent-coral)" />
                </div>

                <div className="sla-grid">
                  {['15د', '20د', '30د', '45د', '60د', 'طوارئ'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`sla-btn ${slaMinutes === val ? 'active' : ''}`}
                      onClick={() => setSlaMinutes(val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MISSIONS & SCHEDULE SECTION */}
      {section === 'missions' && (
        <div className="card gsap-stagger">
          <div className="card-header">
            <div>
              <h3 className="card-title">جميع مهام الصيانة المجدولة والنشطة</h3>
              <p className="card-subtitle">
                يمكنك اختيار أي مهمة لمعاينة بار التقدم أو تعيين صيانة جديدة
              </p>
            </div>
            <button type="button" className="pill-btn coral" onClick={onOpenAssignModal}>
              <Plus size={16} />
              إضافة صيانة وتحديد لوكيشن
            </button>
          </div>

          <div className="missions-list">
            {missions.map((m) => {
              const st = MISSION_STAGES[m.stage];
              return (
                <div key={m.id} className="mission-row-card">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`badge ${m.stage === 5 ? 'resolved' : m.priority}`}>
                          {m.code}
                        </span>
                        <strong style={{ fontSize: '0.96rem' }}>{m.title}</strong>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {m.description}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          flexWrap: 'wrap',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>📍 {m.site.name} ({m.site.district})</span>
                        <span>🕒 {m.scheduledDate} — {m.scheduledTime} ({m.estimatedDuration})</span>
                        <span>👷 {getTechName(m.technicianId)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          background: st.softBg,
                          color: st.color,
                          fontSize: '0.78rem',
                          fontWeight: 800,
                        }}
                      >
                        {st.title} • {st.percent}%
                      </span>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button
                          type="button"
                          className="pill-btn"
                          style={{ height: 34, fontSize: '0.77rem' }}
                          onClick={() => {
                            onSelectMission(m.id);
                            onChangeSection('overview');
                          }}
                        >
                          متابعة البار
                        </button>
                        <button
                          type="button"
                          className="pill-btn primary"
                          style={{ height: 34, fontSize: '0.77rem' }}
                          onClick={() => onInspectAsTechnician(m.technicianId, m.id)}
                        >
                          صفحة الفني
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mini-progress-track">
                    <div className="mini-progress-fill" style={{ width: `${st.percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FULL MAP SECTION */}
      {section === 'map' && (
        <div className="card gsap-stagger">
          <div className="card-header">
            <div>
              <h3 className="card-title">خريطة التتبع الميداني الشاملة</h3>
              <p className="card-subtitle">
                تتبع مباشر لإحداثيات الفنيين ومواقع مراكز الصيانة ومسارات الحركة
              </p>
            </div>
            <button type="button" className="pill-btn coral" onClick={onOpenAssignModal}>
              <Plus size={16} />
              إرسال فني لموقع جديد
            </button>
          </div>
          <LiveFieldMap
            missions={missions}
            technicians={technicians}
            selectedMissionId={selectedMissionId}
            onSelectMission={onSelectMission}
            height={440}
          />
        </div>
      )}

      {/* TECHNICIANS ROSTER SECTION */}
      {section === 'technicians' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 14,
          }}
        >
          {technicians.map((tech) => {
            const techMissions = missions.filter((m) => m.technicianId === tech.id);
            const activeMission = techMissions.find((m) => m.stage < 5) || techMissions[0];
            return (
              <div key={tech.id} className="card gsap-stagger">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    className="user-avatar"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 15,
                      background: tech.avatarColor,
                      fontSize: '1rem',
                    }}
                  >
                    {tech.avatarInitials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900 }}>{tech.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {tech.role} • {tech.specialty}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      tech.status === 'available'
                        ? 'resolved'
                        : tech.status === 'en_route'
                        ? 'normal'
                        : 'high'
                    }`}
                  >
                    {tech.status === 'available'
                      ? 'متاح الآن'
                      : tech.status === 'en_route'
                      ? 'في الطريق'
                      : 'في مهمة'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    padding: 11,
                    borderRadius: 14,
                    background: 'var(--bg-card-subtle)',
                    fontSize: '0.77rem',
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  <div>الوردية: {tech.shiftStart} - {tech.shiftEnd}</div>
                  <div>التقييم: ⭐ {tech.rating}</div>
                  <div>مهام اليوم: {techMissions.length}</div>
                  <div>أُنجزت: {tech.completedToday}</div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  🚐 {tech.vehicle}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={`tel:${tech.phone}`}
                    className="pill-btn"
                    style={{ flex: 1, justifyContent: 'center', height: 36, textDecoration: 'none' }}
                  >
                    <Phone size={14} />
                    اتصال
                  </a>
                  <button
                    type="button"
                    className="pill-btn primary"
                    style={{ flex: 1.4, justifyContent: 'center', height: 36 }}
                    onClick={() =>
                      onInspectAsTechnician(tech.id, activeMission?.id || missions[0].id)
                    }
                  >
                    فتح صفحة الفني
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
