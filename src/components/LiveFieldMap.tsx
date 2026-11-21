import React, { useState } from 'react';
import { Building2, Clock, ExternalLink, MapPin, Navigation, Phone, UserCheck } from 'lucide-react';
import { MISSION_STAGES } from '../data/initialData';
import { MaintenanceMission, Technician } from '../types/maintenance';

interface LiveFieldMapProps {
  missions: MaintenanceMission[];
  technicians: Technician[];
  selectedMissionId: string;
  onSelectMission: (id: string) => void;
  height?: number;
}

export const LiveFieldMap: React.FC<LiveFieldMapProps> = ({
  missions,
  technicians,
  selectedMissionId,
  onSelectMission,
  height = 340,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedMission =
    missions.find((m) => m.id === selectedMissionId) || missions[0];
  const selectedTech = technicians.find(
    (t) => t.id === selectedMission?.technicianId
  );

  // Compute live interpolated technician position based on mission stage
  const getLiveTechCoords = (mission: MaintenanceMission, tech: Technician) => {
    const start = tech.currentCoords;
    const dest = mission.site.coords;
    if (mission.stage >= 3) {
      return { x: dest.x, y: dest.y };
    }
    if (mission.stage === 2) {
      return {
        x: start.x + (dest.x - start.x) * 0.55,
        y: start.y + (dest.y - start.y) * 0.55,
      };
    }
    if (mission.stage === 1) {
      return {
        x: start.x + (dest.x - start.x) * 0.15,
        y: start.y + (dest.y - start.y) * 0.15,
      };
    }
    return { x: start.x, y: start.y };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="live-map-box" style={{ height }}>
        {/* Stylized Warm Cartography SVG */}
        <svg className="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Subtle city grid */}
          <defs>
            <pattern id="cityGrid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="0.22"
                opacity="0.45"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#cityGrid)" />

          {/* Stylized Nile River Curve */}
          <path
            d="M 38 0 C 37 22, 41 38, 36 58 C 32 75, 35 88, 33 100"
            fill="none"
            stroke="#94BBD9"
            strokeWidth="3.6"
            opacity="0.55"
          />

          {/* Major Ring Roads */}
          <path
            d="M 5 52 Q 48 16 95 45"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <path
            d="M 10 82 Q 52 54 92 70"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="1.1"
            opacity="0.65"
          />
          <path
            d="M 54 6 Q 58 48 64 95"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="1"
            opacity="0.6"
          />

          {/* District Labels */}
          <text x="64" y="14" fontSize="2.8" fill="var(--text-muted)" fontWeight="700">
            مصر الجديدة
          </text>
          <text x="72" y="28" fontSize="2.8" fill="var(--text-muted)" fontWeight="700">
            مدينة نصر
          </text>
          <text x="80" y="72" fontSize="2.8" fill="var(--text-muted)" fontWeight="700">
            التجمع الخامس
          </text>
          <text x="16" y="29" fontSize="2.8" fill="var(--text-muted)" fontWeight="700">
            المهندسين
          </text>
          <text x="10" y="64" fontSize="2.8" fill="var(--text-muted)" fontWeight="700">
            الشيخ زايد
          </text>
          <text x="24" y="84" fontSize="2.8" fill="var(--text-muted)" fontWeight="700">
            المعادي
          </text>

          {/* Animated Active Routes between Technician & Site */}
          {missions.map((mission) => {
            const tech = technicians.find((t) => t.id === mission.technicianId);
            if (!tech || mission.stage === 5) return null;
            const livePos = getLiveTechCoords(mission, tech);
            const dest = mission.site.coords;
            const isSelected = mission.id === selectedMission?.id;
            return (
              <g key={`route-${mission.id}`}>
                <line
                  x1={livePos.x}
                  y1={livePos.y}
                  x2={dest.x}
                  y2={dest.y}
                  stroke={isSelected ? '#E56A45' : '#3B75A9'}
                  strokeWidth={isSelected ? '0.9' : '0.55'}
                  className="anim-route-dash"
                  opacity={isSelected ? 0.95 : 0.5}
                />
              </g>
            );
          })}
        </svg>

        {/* Site / Center Pins */}
        {missions.map((mission) => {
          const isSelected = mission.id === selectedMission?.id;
          return (
            <button
              key={`site-${mission.id}`}
              type="button"
              onClick={() => onSelectMission(mission.id)}
              onMouseEnter={() => setHoveredId(mission.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="map-pin-btn"
              style={{
                left: `${mission.site.coords.x}%`,
                top: `${mission.site.coords.y}%`,
                zIndex: isSelected ? 12 : 6,
              }}
              title={mission.site.name}
            >
              {isSelected && <span className="map-radar-ring" />}
              <div
                className="map-site-pin"
                style={{
                  background:
                    mission.stage === 5
                      ? '#2F8A5B'
                      : isSelected
                      ? '#E56A45'
                      : '#0E1A2B',
                }}
              >
                <Building2 size={16} />
              </div>
              {(isSelected || hoveredId === mission.id) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '112%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent-navy)',
                    color: '#fff',
                    padding: '3px 9px',
                    borderRadius: 8,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  {mission.site.district}
                </div>
              )}
            </button>
          );
        })}

        {/* Live Moving Technician Pins (one live pin per active technician) */}
        {(() => {
          const seenTechs = new Set<string>();
          return missions
            .filter((m) => m.stage < 5)
            .filter((m) => {
              if (seenTechs.has(m.technicianId)) return false;
              seenTechs.add(m.technicianId);
              return true;
            })
            .map((mission) => {
              const tech = technicians.find((t) => t.id === mission.technicianId);
              if (!tech) return null;
              const livePos = getLiveTechCoords(mission, tech);
              // Offset cleanly above the center pin when arrived so pins never overlap
              const offsetY = mission.stage >= 3 ? -12 : 0;
              return (
                <button
                  key={`tech-${mission.id}`}
                  type="button"
                  onClick={() => onSelectMission(mission.id)}
                  className="map-pin-btn"
                  style={{
                    left: `${livePos.x}%`,
                    top: `${Math.max(9, livePos.y + offsetY)}%`,
                    zIndex: mission.id === selectedMission?.id ? 14 : 9,
                    transition: 'left 0.9s ease, top 0.9s ease',
                  }}
                >
                  <div className="map-tech-pin">
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: tech.avatarColor,
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                      }}
                    >
                      {tech.avatarInitials}
                    </span>
                    <span>{tech.name.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                </button>
              );
            });
        })()}

        {/* Legend */}
        <div className="map-overlay-legend">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: '#0E1A2B',
                display: 'inline-block',
              }}
            />
            مركز صيانة
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#E56A45',
                display: 'inline-block',
              }}
            />
            فني مباشر (GPS)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: '#2F8A5B',
                display: 'inline-block',
              }}
            />
            مكتمل
          </span>
        </div>
      </div>

      {/* Selected Location Detail Strip */}
      {selectedMission && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '13px 16px',
            borderRadius: 16,
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-soft)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, minWidth: 0, flex: '1 1 260px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                background: 'var(--pastel-peach-bg)',
                color: 'var(--accent-coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedMission.site.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {selectedMission.site.address}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 5,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <UserCheck size={13} />
                  الفني: {selectedTech?.name}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} />
                  {selectedMission.scheduledTime} ({MISSION_STAGES[selectedMission.stage].shortTitle})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Navigation size={13} />
                  {selectedMission.site.coords.lat.toFixed(4)}, {selectedMission.site.coords.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={`tel:${selectedMission.site.contactPhone}`}
              className="pill-btn"
              style={{ textDecoration: 'none', height: 36, fontSize: '0.78rem' }}
            >
              <Phone size={14} />
              {selectedMission.site.contactName}
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedMission.site.coords.lat},${selectedMission.site.coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="pill-btn primary"
              style={{ textDecoration: 'none', height: 36, fontSize: '0.78rem' }}
            >
              <ExternalLink size={14} />
              Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
