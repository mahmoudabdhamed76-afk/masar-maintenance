export type MissionStageIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface StageDefinition {
  index: MissionStageIndex;
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  actionLabel: string;
  color: string;
  softBg: string;
  percent: number;
}

export type PriorityLevel = 'urgent' | 'high' | 'normal';

export type TechStatus = 'available' | 'en_route' | 'working' | 'break';

export interface GeoPoint {
  lat: number;
  lng: number;
  /** Normalized map canvas coordinates (0 - 100) for the live interactive SVG map */
  x: number;
  y: number;
}

export interface SiteLocation {
  id: string;
  name: string;
  district: string;
  address: string;
  contactName: string;
  contactPhone: string;
  coords: GeoPoint;
}

export interface Technician {
  id: string;
  name: string;
  role: string;
  specialty: string;
  phone: string;
  avatarInitials: string;
  avatarColor: string;
  status: TechStatus;
  rating: number;
  completedToday: number;
  shiftStart: string;
  shiftEnd: string;
  workDays: string[];
  vehicle: string;
  username: string;
  password: string;
  currentCoords: GeoPoint;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface StageLogEntry {
  stage: MissionStageIndex;
  timestamp: string;
  note?: string;
}

export interface MaintenanceMission {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  priority: PriorityLevel;
  technicianId: string;
  site: SiteLocation;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: string;
  distanceKm: number;
  etaMinutes: number;
  stage: MissionStageIndex;
  stageLogs: StageLogEntry[];
  checklist: ChecklistItem[];
  resolutionNotes: string;
  createdAt: string;
  partsNeeded?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  unread: boolean;
}

export type ActivePortal = 'manager' | 'technician';
export type ManagerSection = 'overview' | 'missions' | 'map' | 'technicians';
export type TechSection = 'home' | 'missions' | 'monthly' | 'admin';
