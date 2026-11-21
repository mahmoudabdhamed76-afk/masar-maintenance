import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Plus,
  Shield,
  Sun,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AssignMissionModal } from './components/AssignMissionModal';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TechnicianPortal } from './components/TechnicianPortal';
import {
  INITIAL_MISSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TECHNICIANS,
  MISSION_STAGES,
} from './data/initialData';
import {
  ActivePortal,
  AppNotification,
  MaintenanceMission,
  ManagerSection,
  MissionStageIndex,
  TechSection,
  Technician,
} from './types/maintenance';

const STORAGE_KEY = 'masar_maintenance_state_v1';

interface ToastMessage {
  id: string;
  text: string;
}

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [portal, setPortal] = useState<ActivePortal>('manager');
  const [managerSection, setManagerSection] = useState<ManagerSection>('overview');
  const [techSection, setTechSection] = useState<TechSection>('active');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);

  const [missions, setMissions] = useState<MaintenanceMission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.missions) && parsed.missions.length > 0) {
          return parsed.missions;
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_MISSIONS;
  });

  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);
  const [activeTechId, setActiveTechId] = useState<string>(INITIAL_TECHNICIANS[0].id);
  const [selectedMissionId, setSelectedMissionId] = useState<string>(INITIAL_MISSIONS[0].id);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ missions }));
    } catch {
      // ignore storage errors
    }
  }, [missions]);

  // Keep technicians' live statuses synchronized with their missions
  useEffect(() => {
    setTechnicians((prev) =>
      prev.map((tech) => {
        const techMissions = missions.filter((m) => m.technicianId === tech.id);
        const enRoute = techMissions.some((m) => m.stage === 2);
        const working = techMissions.some((m) => m.stage === 3 || m.stage === 4);
        const completedCount = techMissions.filter((m) => m.stage === 5).length;
        return {
          ...tech,
          status: working ? 'working' : enRoute ? 'en_route' : 'available',
          completedToday: Math.max(tech.completedToday, completedCount),
        };
      })
    );
  }, [missions]);

  const pushToast = (text: string) => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  };

  const addNotification = (title: string, body: string, type: AppNotification['type'] = 'info') => {
    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    setNotifications((prev) => [
      { id: `n-${Date.now()}`, title, body, time: now, type, unread: true },
      ...prev,
    ]);
  };

  const handleSetStage = (missionId: string, newStage: MissionStageIndex) => {
    const existingMission = missions.find((m) => m.id === missionId);
    if (!existingMission || existingMission.stage === newStage) return;

    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const stageDef = MISSION_STAGES[newStage];

    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== missionId) return m;
        const existingLog = m.stageLogs.find((l) => l.stage === newStage);
        const updatedLogs = existingLog
          ? m.stageLogs.filter((l) => l.stage <= newStage)
          : [
              ...m.stageLogs.filter((l) => l.stage < newStage),
              { stage: newStage, timestamp: now, note: stageDef.subtitle },
            ];
        return {
          ...m,
          stage: newStage,
          stageLogs: updatedLogs,
          distanceKm: newStage >= 3 ? 0 : m.distanceKm || 4.8,
          etaMinutes: newStage >= 3 ? 0 : m.etaMinutes || 14,
        };
      })
    );

    const target = missions.find((m) => m.id === missionId);
    if (target) {
      const tech = technicians.find((t) => t.id === target.technicianId);
      pushToast(`${target.code}: ${stageDef.title}`);
      addNotification(
        `${tech?.name || 'الفني'} — ${stageDef.shortTitle}`,
        `${target.title} (${target.site.district})`,
        newStage === 5 ? 'success' : 'info'
      );
    }
  };

  const handleAdvanceStage = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission || mission.stage >= 5) return;
    handleSetStage(missionId, (mission.stage + 1) as MissionStageIndex);
  };

  const handleCreateMission = (newMission: MaintenanceMission) => {
    setMissions((prev) => [newMission, ...prev]);
    setSelectedMissionId(newMission.id);
    const tech = technicians.find((t) => t.id === newMission.technicianId);
    pushToast(`تم إرسال البلاغ ${newMission.code} إلى ${tech?.name || 'الفني'}`);
    addNotification(
      `مهمة صيانة جديدة (${newMission.code})`,
      `أُسندت إلى ${tech?.name} في ${newMission.site.name} الساعة ${newMission.scheduledTime}`,
      newMission.priority === 'urgent' ? 'urgent' : 'info'
    );
  };

  const handleToggleChecklist = (missionId: string, itemId: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== missionId) return m;
        return {
          ...m,
          checklist: m.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item
          ),
        };
      })
    );
  };

  const handleUpdateNotes = (missionId: string, notes: string) => {
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, resolutionNotes: notes } : m))
    );
  };

  const handleInspectAsTechnician = (techId: string, missionId: string) => {
    setActiveTechId(techId);
    setSelectedMissionId(missionId);
    setPortal('technician');
    setTechSection('active');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadNotifs = notifications.filter((n) => n.unread).length;
  const activeCount = missions.filter((m) => m.stage < 5).length;
  const urgentCount = missions.filter((m) => m.priority === 'urgent' && m.stage < 5).length;

  return (
    <div className="app-shell">
      {/* Mobile Sidebar Backdrop */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* RIGHT SIDEBAR (Matches reference visual structure) */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-box">
            <Wrench size={26} />
          </div>
          <h2 className="brand-title">مسار الصيانة</h2>
          <p className="brand-sub">إدارة الفنيين والمواقع الميدانية</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">لوحة الإدارة والعمليات</div>

          <button
            type="button"
            className={`nav-item ${portal === 'manager' && managerSection === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setPortal('manager');
              setManagerSection('overview');
              setSidebarOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>الرئيسية (المدير)</span>
          </button>

          <button
            type="button"
            className={`nav-item ${portal === 'manager' && managerSection === 'missions' ? 'active' : ''}`}
            onClick={() => {
              setPortal('manager');
              setManagerSection('missions');
              setSidebarOpen(false);
            }}
          >
            <CalendarClock size={18} />
            <span>مهام وأوقات الصيانة</span>
            {urgentCount > 0 && <span className="nav-badge">{urgentCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${portal === 'manager' && managerSection === 'map' ? 'active' : ''}`}
            onClick={() => {
              setPortal('manager');
              setManagerSection('map');
              setSidebarOpen(false);
            }}
          >
            <MapPin size={18} />
            <span>خريطة اللوكيشن GPS</span>
            <span className="nav-badge live">{activeCount}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${portal === 'manager' && managerSection === 'technicians' ? 'active' : ''}`}
            onClick={() => {
              setPortal('manager');
              setManagerSection('technicians');
              setSidebarOpen(false);
            }}
          >
            <Users size={18} />
            <span>فريق الفنيين</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: 10 }}>
            بوابة الموظف / الفني
          </div>

          <button
            type="button"
            className={`nav-item ${portal === 'technician' && techSection === 'active' ? 'active' : ''}`}
            onClick={() => {
              setPortal('technician');
              setTechSection('active');
              setSidebarOpen(false);
            }}
          >
            <Wrench size={18} />
            <span>صفحة الفني والبار المتحرك</span>
          </button>

          <button
            type="button"
            className={`nav-item ${portal === 'technician' && techSection === 'schedule' ? 'active' : ''}`}
            onClick={() => {
              setPortal('technician');
              setTechSection('schedule');
              setSidebarOpen(false);
            }}
          >
            <CalendarClock size={18} />
            <span>جدول مواعيدي</span>
          </button>

          <button
            type="button"
            className={`nav-item ${portal === 'technician' && techSection === 'map' ? 'active' : ''}`}
            onClick={() => {
              setPortal('technician');
              setTechSection('map');
              setSidebarOpen(false);
            }}
          >
            <Compass size={18} />
            <span>مسار الرحلة للمركز</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="connection-pill">
            <span className="live-dot" />
            <span>متصل بنظام GPS المباشر</span>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="main-area">
        {/* TOP HEADER BAR */}
        <header className="topbar">
          <div className="topbar-right">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="القائمة"
            >
              <Menu size={20} />
            </button>

            <div className="user-chip">
              <div
                className="user-avatar"
                style={{
                  background:
                    portal === 'manager'
                      ? 'var(--accent-espresso)'
                      : 'var(--accent-coral)',
                }}
              >
                {portal === 'manager' ? 'م' : 'ف'}
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, lineHeight: 1.2 }}>
                  مسار الصيانة
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  الفرع الرئيسي • القاهرة الكبرى
                </div>
              </div>
            </div>

            {/* Role Switcher (Manager <-> Employee) */}
            <div className="role-switcher" role="tablist">
              <button
                type="button"
                className={`role-tab ${portal === 'manager' ? 'active' : ''}`}
                onClick={() => setPortal('manager')}
              >
                <Shield size={15} />
                صفحة المدير
              </button>
              <button
                type="button"
                className={`role-tab ${portal === 'technician' ? 'active' : ''}`}
                onClick={() => setPortal('technician')}
              >
                <Wrench size={15} />
                صفحة الفني / الموظف
              </button>
            </div>
          </div>

          <div className="topbar-left" style={{ position: 'relative' }}>
            <button
              type="button"
              className="pill-btn"
              onClick={() => setDarkMode((d) => !d)}
              title="تبديل الوضع الليلي"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span>{darkMode ? 'نهاري' : 'ليلي'}</span>
            </button>

            <button
              type="button"
              className={`pill-btn ${unreadNotifs > 0 ? 'soft-alert' : ''}`}
              onClick={() => {
                setNotifOpen((o) => !o);
                setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
              }}
            >
              <Bell size={16} />
              <span>تنبيهات</span>
              {unreadNotifs > 0 && (
                <span className="pill-count danger">{unreadNotifs}</span>
              )}
            </button>

            {portal === 'manager' && (
              <button
                type="button"
                className="pill-btn coral"
                onClick={() => setAssignModalOpen(true)}
              >
                <Plus size={16} />
                <span>تعيين صيانة</span>
              </button>
            )}

            {/* Notifications Popover */}
            {notifOpen && (
              <div
                className="card"
                style={{
                  position: 'absolute',
                  top: '115%',
                  left: 0,
                  width: 320,
                  maxWidth: '90vw',
                  zIndex: 60,
                  padding: 14,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <strong style={{ fontSize: '0.88rem' }}>إشعارات الحركة المباشرة</strong>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '9px 11px',
                        borderRadius: 12,
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-soft)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <strong style={{ fontSize: '0.8rem' }}>{n.title}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {n.time}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                        {n.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ACTIVE PORTAL CONTENT */}
        {portal === 'manager' ? (
          <ManagerDashboard
            section={managerSection}
            onChangeSection={setManagerSection}
            missions={missions}
            technicians={technicians}
            selectedMissionId={selectedMissionId}
            onSelectMission={setSelectedMissionId}
            onOpenAssignModal={() => setAssignModalOpen(true)}
            onAdvanceStage={handleAdvanceStage}
            onSetStage={handleSetStage}
            onInspectAsTechnician={handleInspectAsTechnician}
          />
        ) : (
          <TechnicianPortal
            section={techSection}
            onChangeSection={setTechSection}
            technicians={technicians}
            activeTechId={activeTechId}
            onChangeTechId={setActiveTechId}
            missions={missions}
            selectedMissionId={selectedMissionId}
            onSelectMission={setSelectedMissionId}
            onAdvanceStage={handleAdvanceStage}
            onSetStage={handleSetStage}
            onToggleChecklist={handleToggleChecklist}
            onUpdateNotes={handleUpdateNotes}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع للموبايل">
        <button
          type="button"
          className={`mobile-nav-btn ${portal === 'manager' && managerSection !== 'map' ? 'active' : ''}`}
          onClick={() => {
            setPortal('manager');
            setManagerSection('overview');
          }}
        >
          <LayoutDashboard size={18} />
          <span>المدير</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${portal === 'technician' ? 'active' : ''}`}
          onClick={() => {
            setPortal('technician');
            setTechSection('active');
          }}
        >
          <Wrench size={18} />
          <span>الفني والبار</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${
            (portal === 'manager' && managerSection === 'map') ||
            (portal === 'technician' && techSection === 'map')
              ? 'active'
              : ''
          }`}
          onClick={() => {
            if (portal === 'manager') setManagerSection('map');
            else setTechSection('map');
          }}
        >
          <MapPin size={18} />
          <span>الخريطة</span>
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setAssignModalOpen(true)}
        >
          <Building2 size={18} />
          <span>+ صيانة</span>
        </button>
      </nav>

      {/* ASSIGN NEW MISSION MODAL */}
      <AssignMissionModal
        open={assignModalOpen}
        technicians={technicians}
        onClose={() => setAssignModalOpen(false)}
        onCreate={handleCreateMission}
      />

      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast-pill">
            <CheckCircle2 size={16} color="#34D399" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
