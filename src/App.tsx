import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Plus,
  Radio,
  Shield,
  Sun,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AddTechnicianModal } from './components/AddTechnicianModal';
import { AssignMissionModal } from './components/AssignMissionModal';
import { ClientTrackingPage } from './components/ClientTrackingPage';
import { EmployeeLoginGate } from './components/EmployeeLoginGate';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TechnicianPortal } from './components/TechnicianPortal';
import {
  INITIAL_LOCATION_LOGS,
  INITIAL_MISSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TECHNICIANS,
  MISSION_STAGES,
} from './data/initialData';
import {
  ActivePortal,
  AppNotification,
  LocationLogEntry,
  MaintenanceMission,
  ManagerSection,
  MissionStageIndex,
  TechSection,
  Technician,
} from './types/maintenance';
import { decodeTechToken } from './utils/inviteLink';

const STORAGE_KEY = 'masar_maintenance_state_v2';
const SYNC_CHANNEL = 'masar_live_sync_v2';

interface ToastMessage {
  id: string;
  text: string;
}

function readInitialInviteFromUrl(): {
  isEmployeeLink: boolean;
  isClientLink: boolean;
  trackCode: string;
  prefillUsername: string;
  invitedTech: Technician | null;
} {
  if (typeof window === 'undefined') {
    return {
      isEmployeeLink: false,
      isClientLink: false,
      trackCode: '',
      prefillUsername: '',
      invitedTech: null,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const portalParam = params.get('portal');
  const trackParam = params.get('track') || '';
  const uParam = params.get('u') || '';
  const accParam = params.get('acc') || '';
  const decoded = accParam ? decodeTechToken(accParam) : null;
  const isClientLink = portalParam === 'client' || Boolean(trackParam);
  const isEmployeeLink = !isClientLink && (portalParam === 'employee' || Boolean(decoded));
  return {
    isEmployeeLink,
    isClientLink,
    trackCode: trackParam,
    prefillUsername: uParam || decoded?.username || '',
    invitedTech: decoded,
  };
}

/**
 * Convert real latitude/longitude to a clean 12..88 map canvas coordinate
 * anchored around Greater Cairo (and clamped nicely for any global location).
 */
function geoToCanvasPoint(lat: number, lng: number): { x: number; y: number } {
  const minLng = 30.92;
  const maxLng = 31.56;
  const minLat = 29.90;
  const maxLat = 30.16;
  const normX = ((lng - minLng) / (maxLng - minLng)) * 76 + 12;
  const normY = ((maxLat - lat) / (maxLat - minLat)) * 76 + 12;
  return {
    x: Math.round(Math.max(12, Math.min(88, normX))),
    y: Math.round(Math.max(12, Math.min(88, normY))),
  };
}

export const App: React.FC = () => {
  const urlInvite = readInitialInviteFromUrl();
  const isReceivingRemoteSync = useRef(false);

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [portal, setPortal] = useState<ActivePortal>(
    urlInvite.isClientLink ? 'client' : urlInvite.isEmployeeLink ? 'technician' : 'manager'
  );
  const [managerSection, setManagerSection] = useState<ManagerSection>('overview');
  const [techSection, setTechSection] = useState<TechSection>('home');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);

  // Employee Account Creation / Edit / Credentials Modal State
  const [techModalOpen, setTechModalOpen] = useState<boolean>(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [viewTechCredsOnly, setViewTechCredsOnly] = useState<boolean>(false);

  // Standalone Employee Login Gate State
  const [showEmployeeLogin, setShowEmployeeLogin] = useState<boolean>(
    urlInvite.isEmployeeLink
  );
  const [loginPrefillUser, setLoginPrefillUser] = useState<string>(
    urlInvite.prefillUsername
  );
  const [invitedTech, setInvitedTech] = useState<Technician | null>(
    urlInvite.invitedTech
  );
  const [loggedInEmployeeId, setLoggedInEmployeeId] = useState<string | null>(null);

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

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    let base: Technician[] = INITIAL_TECHNICIANS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.technicians) && parsed.technicians.length > 0) {
          base = parsed.technicians.map((t: Technician, idx: number) => ({
            ...INITIAL_TECHNICIANS[idx % INITIAL_TECHNICIANS.length],
            ...t,
            workDays:
              Array.isArray(t.workDays) && t.workDays.length
                ? t.workDays
                : ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
            username: t.username || `tech.${idx + 1}`,
            password: t.password || `MS-${1000 + idx * 111}`,
          }));
        }
      }
    } catch {
      // ignore
    }

    if (urlInvite.invitedTech && !base.some((t) => t.username === urlInvite.invitedTech!.username)) {
      base = [urlInvite.invitedTech, ...base];
    }
    return base;
  });

  const [locationLogs, setLocationLogs] = useState<LocationLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.locationLogs) && parsed.locationLogs.length > 0) {
          return parsed.locationLogs;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_LOCATION_LOGS;
  });

  const [activeTechId, setActiveTechId] = useState<string>(
    urlInvite.invitedTech?.id || INITIAL_TECHNICIANS[0].id
  );
  const [selectedMissionId, setSelectedMissionId] = useState<string>(() => {
    if (urlInvite.trackCode) {
      const found = INITIAL_MISSIONS.find(
        (m) => m.code.toLowerCase() === urlInvite.trackCode.toLowerCase()
      );
      if (found) return found.id;
    }
    return INITIAL_MISSIONS[0].id;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Persist & Broadcast live updates across tabs (Technician <-> Patient Tracking <-> Manager!)
  useEffect(() => {
    if (isReceivingRemoteSync.current) {
      isReceivingRemoteSync.current = false;
      return;
    }
    const payload = { missions, technicians, locationLogs };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(SYNC_CHANNEL);
        bc.postMessage(payload);
        bc.close();
      }
    } catch {
      // ignore storage errors
    }
  }, [missions, technicians, locationLogs]);

  // Listen for live cross-tab broadcasts & storage events so Patient & Manager pages animate immediately!
  useEffect(() => {
    const applyIncoming = (parsed: {
      missions?: MaintenanceMission[];
      technicians?: Technician[];
      locationLogs?: LocationLogEntry[];
    }) => {
      if (!parsed) return;
      isReceivingRemoteSync.current = true;
      if (Array.isArray(parsed.missions) && parsed.missions.length > 0) {
        setMissions(parsed.missions);
      }
      if (Array.isArray(parsed.technicians) && parsed.technicians.length > 0) {
        setTechnicians(parsed.technicians);
      }
      if (Array.isArray(parsed.locationLogs)) {
        setLocationLogs(parsed.locationLogs);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          applyIncoming(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.onmessage = (ev) => applyIncoming(ev.data);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  // Keep technicians' live statuses synchronized with their missions
  useEffect(() => {
    setTechnicians((prev) =>
      prev.map((tech) => {
        const techMissions = missions.filter((m) => m.technicianId === tech.id);
        const enRoute = techMissions.some((m) => m.stage === 2);
        const working = techMissions.some((m) => m.stage === 3 || m.stage === 4);
        const completedCount = techMissions.filter((m) => m.stage === 5).length;
        const nextStatus = working ? 'working' : enRoute ? 'en_route' : 'available';
        const nextCompleted = Math.max(tech.completedToday, completedCount);
        if (tech.status === nextStatus && tech.completedToday === nextCompleted) return tech;
        return {
          ...tech,
          status: nextStatus,
          completedToday: nextCompleted,
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

    const tech = technicians.find((t) => t.id === existingMission.technicianId);
    pushToast(`${existingMission.code}: ${stageDef.title}`);
    addNotification(
      `${tech?.name || 'الفني'} — ${stageDef.shortTitle}`,
      `${existingMission.title} (${existingMission.site.district})`,
      newStage === 5 ? 'success' : 'info'
    );
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

  const handleSaveTechnician = (tech: Technician, isNew: boolean) => {
    setTechnicians((prev) => {
      if (isNew) return [tech, ...prev];
      return prev.map((t) => (t.id === tech.id ? tech : t));
    });
    pushToast(
      isNew
        ? `تم إنشاء حساب ${tech.name} وتجهيز الرابط وبيانات الدخول`
        : `تم تحديث مواعيد وبيانات ${tech.name}`
    );
    addNotification(
      isNew ? `حساب موظف جديد: ${tech.name}` : `تحديث جدول ${tech.name}`,
      `الوردية ${tech.shiftStart} - ${tech.shiftEnd} (@${tech.username})`,
      'success'
    );
  };

  // Real GPS Location Update from Employee Device -> Updates Map + Records Audit Log for Manager!
  const handleReportGpsLocation = (
    techId: string,
    lat: number,
    lng: number,
    accuracyMeters: number | undefined,
    eventLabel: string
  ) => {
    const nowTime = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const canvasPt = geoToCanvasPoint(lat, lng);
    const tech = technicians.find((t) => t.id === techId);
    const techName = tech?.name || 'فني ميداني';

    setTechnicians((prev) =>
      prev.map((t) =>
        t.id === techId
          ? {
              ...t,
              gpsEnabled: true,
              lastLocationUpdatedAt: nowTime,
              locationAccuracy: accuracyMeters,
              currentCoords: {
                lat: Number(lat.toFixed(6)),
                lng: Number(lng.toFixed(6)),
                x: canvasPt.x,
                y: canvasPt.y,
              },
            }
          : t
      )
    );

    const newLog: LocationLogEntry = {
      id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      technicianId: techId,
      technicianName: techName,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      accuracyMeters,
      event: eventLabel,
      timestamp: nowTime,
    };

    setLocationLogs((prev) => [newLog, ...prev].slice(0, 40));
    pushToast(`تم تسجيل موقع ${techName} عبر GPS بنجاح`);
    addNotification(
      `تحديث موقع GPS — ${techName}`,
      `${eventLabel} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      'success'
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

  const handleSendAdminPing = (techName: string, message: string) => {
    pushToast(message);
    addNotification(`تحديث من ${techName}`, message, 'info');
  };

  const handleInspectAsTechnician = (techId: string, missionId: string) => {
    setActiveTechId(techId);
    if (missionId) setSelectedMissionId(missionId);
    setPortal('technician');
    setTechSection('home');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenClientTracking = (missionId: string) => {
    if (missionId) setSelectedMissionId(missionId);
    setPortal('client');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAddTechnician = () => {
    setEditingTech(null);
    setViewTechCredsOnly(false);
    setTechModalOpen(true);
  };

  const handleEditTechnician = (tech: Technician) => {
    setEditingTech(tech);
    setViewTechCredsOnly(false);
    setTechModalOpen(true);
  };

  const handleViewTechCredentials = (tech: Technician) => {
    setEditingTech(tech);
    setViewTechCredsOnly(true);
    setTechModalOpen(true);
  };

  const handlePreviewEmployeeLogin = (tech: Technician) => {
    setInvitedTech(tech);
    setLoginPrefillUser(tech.username);
    setLoggedInEmployeeId(null);
    setShowEmployeeLogin(true);
  };

  const handleEmployeeAuthenticated = (tech: Technician) => {
    setTechnicians((prev) =>
      prev.some((t) => t.id === tech.id || t.username === tech.username) ? prev : [tech, ...prev]
    );
    setLoggedInEmployeeId(tech.id);
    setActiveTechId(tech.id);
    const firstMission = missions.find((m) => m.technicianId === tech.id);
    if (firstMission) setSelectedMissionId(firstMission.id);
    setShowEmployeeLogin(false);
    setPortal('technician');
    setTechSection('home');
    pushToast(`أهلاً بك ${tech.name} — تم تسجيل الدخول بنجاح`);
  };

  const handleLogoutEmployee = () => {
    setLoggedInEmployeeId(null);
    setShowEmployeeLogin(true);
  };

  const handleExitEmployeeMode = () => {
    setShowEmployeeLogin(false);
    setLoggedInEmployeeId(null);
    setInvitedTech(null);
    setPortal('manager');
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Dedicated Employee Login Screen
  if (showEmployeeLogin) {
    return (
      <EmployeeLoginGate
        technicians={technicians}
        prefilledUsername={loginPrefillUser}
        invitedTech={invitedTech}
        onAuthenticated={handleEmployeeAuthenticated}
        onExitToManager={handleExitEmployeeMode}
      />
    );
  }

  // PATIENT / CLIENT LIVE TRACKING PAGE
  if (portal === 'client') {
    return (
      <>
        <ClientTrackingPage
          missions={missions}
          technicians={technicians}
          selectedMissionId={selectedMissionId}
          onSelectMission={setSelectedMissionId}
          onSetStageForPreview={handleSetStage}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          standaloneClientLink={urlInvite.isClientLink}
          onSwitchToManager={urlInvite.isClientLink ? undefined : () => setPortal('manager')}
          onSwitchToTechnician={
            urlInvite.isClientLink
              ? undefined
              : () => {
                  setPortal('technician');
                  setTechSection('home');
                }
          }
        />
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast-pill">
              <CheckCircle2 size={16} color="#34D399" />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  const isStandaloneEmployeeSession = Boolean(loggedInEmployeeId);

  // NATIVE STANDALONE EMPLOYEE APP SHELL
  if (portal === 'technician' || isStandaloneEmployeeSession) {
    return (
      <>
        <TechnicianPortal
          section={techSection}
          onChangeSection={setTechSection}
          technicians={technicians}
          activeTechId={loggedInEmployeeId || activeTechId}
          onChangeTechId={setActiveTechId}
          missions={missions}
          selectedMissionId={selectedMissionId}
          onSelectMission={setSelectedMissionId}
          onAdvanceStage={handleAdvanceStage}
          onSetStage={handleSetStage}
          onToggleChecklist={handleToggleChecklist}
          onUpdateNotes={handleUpdateNotes}
          onCreateQuickTask={handleCreateMission}
          onSendAdminPing={handleSendAdminPing}
          onReportGpsLocation={handleReportGpsLocation}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          lockedToEmployee={isStandaloneEmployeeSession}
          onLogoutEmployee={handleLogoutEmployee}
          onSwitchToManager={
            isStandaloneEmployeeSession ? undefined : () => setPortal('manager')
          }
        />

        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast-pill">
              <CheckCircle2 size={16} color="#34D399" />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // MANAGER DASHBOARD SHELL
  const unreadNotifs = notifications.filter((n) => n.unread).length;
  const activeCount = missions.filter((m) => m.stage < 5).length;
  const urgentCount = missions.filter((m) => m.priority === 'urgent' && m.stage < 5).length;

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* RIGHT SIDEBAR */}
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
            className={`nav-item ${managerSection === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setManagerSection('overview');
              setSidebarOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>الرئيسية (المدير)</span>
          </button>

          <button
            type="button"
            className={`nav-item ${managerSection === 'missions' ? 'active' : ''}`}
            onClick={() => {
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
            className={`nav-item ${managerSection === 'map' ? 'active' : ''}`}
            onClick={() => {
              setManagerSection('map');
              setSidebarOpen(false);
            }}
          >
            <MapPin size={18} />
            <span>خريطة وسجل GPS</span>
            <span className="nav-badge live">{activeCount}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${managerSection === 'technicians' ? 'active' : ''}`}
            onClick={() => {
              setManagerSection('technicians');
              setSidebarOpen(false);
            }}
          >
            <Users size={18} />
            <span>الموظفون والحسابات</span>
            <span className="nav-badge live">{technicians.length}</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => {
              setSidebarOpen(false);
              handleOpenAddTechnician();
            }}
          >
            <UserPlus size={18} color="var(--accent-coral)" />
            <span>+ إضافة موظف وحساب</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: 10 }}>
            البوابات المباشرة
          </div>

          <button
            type="button"
            className="nav-item"
            onClick={() => {
              setPortal('technician');
              setTechSection('home');
              setSidebarOpen(false);
            }}
          >
            <Wrench size={18} />
            <span>تطبيق الموظف / الفني</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => handleOpenClientTracking(selectedMissionId)}
          >
            <Radio size={18} color="var(--accent-coral)" />
            <span>صفحة المريض / المتابعة</span>
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
              <div className="user-avatar" style={{ background: 'var(--accent-espresso)' }}>
                م
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

            <div className="role-switcher" role="tablist">
              <button
                type="button"
                className="role-tab active"
                onClick={() => setPortal('manager')}
              >
                <Shield size={15} />
                المدير
              </button>
              <button
                type="button"
                className="role-tab"
                onClick={() => {
                  setPortal('technician');
                  setTechSection('home');
                }}
              >
                <Wrench size={15} />
                الموظف
              </button>
              <button
                type="button"
                className="role-tab"
                onClick={() => handleOpenClientTracking(selectedMissionId)}
              >
                <Radio size={15} />
                صفحة المريض
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

            <button
              type="button"
              className="pill-btn"
              onClick={handleOpenAddTechnician}
            >
              <UserPlus size={16} color="var(--accent-coral)" />
              <span>إضافة موظف</span>
            </button>
            <button
              type="button"
              className="pill-btn coral"
              onClick={() => setAssignModalOpen(true)}
            >
              <Plus size={16} />
              <span>تعيين صيانة</span>
            </button>

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

        <ManagerDashboard
          section={managerSection}
          onChangeSection={setManagerSection}
          missions={missions}
          technicians={technicians}
          locationLogs={locationLogs}
          selectedMissionId={selectedMissionId}
          onSelectMission={setSelectedMissionId}
          onOpenAssignModal={() => setAssignModalOpen(true)}
          onOpenAddTechnician={handleOpenAddTechnician}
          onEditTechnician={handleEditTechnician}
          onViewTechCredentials={handleViewTechCredentials}
          onAdvanceStage={handleAdvanceStage}
          onSetStage={handleSetStage}
          onInspectAsTechnician={handleInspectAsTechnician}
          onOpenClientTracking={handleOpenClientTracking}
        />
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR MANAGER */}
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع للموبايل">
        <button
          type="button"
          className={`mobile-nav-btn ${managerSection !== 'technicians' ? 'active' : ''}`}
          onClick={() => setManagerSection('overview')}
        >
          <LayoutDashboard size={18} />
          <span>المدير</span>
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => {
            setPortal('technician');
            setTechSection('home');
          }}
        >
          <Wrench size={18} />
          <span>الموظف</span>
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => handleOpenClientTracking(selectedMissionId)}
        >
          <Radio size={18} />
          <span>المريض</span>
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

      <AssignMissionModal
        open={assignModalOpen}
        technicians={technicians}
        onClose={() => setAssignModalOpen(false)}
        onCreate={handleCreateMission}
      />

      <AddTechnicianModal
        open={techModalOpen}
        editingTech={editingTech}
        initialViewCredentials={viewTechCredsOnly}
        onClose={() => setTechModalOpen(false)}
        onSave={handleSaveTechnician}
        onPreviewEmployeeLogin={handlePreviewEmployeeLogin}
      />

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
