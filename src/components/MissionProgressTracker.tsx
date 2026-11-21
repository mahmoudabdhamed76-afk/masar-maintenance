import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Navigation,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react';
import { MISSION_STAGES } from '../data/initialData';
import { MaintenanceMission, MissionStageIndex, Technician } from '../types/maintenance';

interface MissionProgressTrackerProps {
  mission: MaintenanceMission;
  technician?: Technician;
  onAdvanceStage?: (missionId: string) => void;
  onSetStage?: (missionId: string, stage: MissionStageIndex) => void;
  compact?: boolean;
  readOnly?: boolean;
}

const STAGE_ICONS = [BellRing, ClipboardCheck, Truck, MapPin, Wrench, CheckCircle2];

// RTL Curved S-Wave Highway Path (Right x=840 -> Left x=60)
const HIGHWAY_PATH =
  'M 840 92 C 760 22, 680 22, 610 92 C 540 162, 460 162, 390 92 C 320 22, 240 22, 170 92 C 130 132, 95 112, 60 88';

// Fractional stops along the SVG path for the 6 stages (0..5)
const STAGE_FRACTIONS = [0.02, 0.21, 0.42, 0.62, 0.82, 1.0];

// Ring geometry for Orbital Gauge
const GAUGE_R = 44;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

export const MissionProgressTracker: React.FC<MissionProgressTrackerProps> = ({
  mission,
  technician,
  onAdvanceStage,
  onSetStage,
  compact = false,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const progressPathRef = useRef<SVGPathElement>(null);
  const energyPathRef = useRef<SVGPathElement>(null);
  const podRef = useRef<SVGGElement>(null);
  const shockwaveRef = useRef<SVGCircleElement>(null);

  const gaugeCircleRef = useRef<SVGCircleElement>(null);
  const percentTextRef = useRef<HTMLSpanElement>(null);
  const distTextRef = useRef<HTMLSpanElement>(null);
  const flipBannerRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  const prevFractionRef = useRef<number>(STAGE_FRACTIONS[mission.stage]);
  const prevPercentRef = useRef<number>(MISSION_STAGES[mission.stage].percent);
  const prevDistRef = useRef<number>(mission.stage >= 3 ? 0 : mission.distanceKm);

  const [waypointCoords, setWaypointCoords] = useState<Array<{ x: number; y: number }>>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(824);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simTimerRef = useRef<number | null>(null);

  const currentStageDef = MISSION_STAGES[mission.stage];

  // Measure exact waypoint (x, y) coordinates along the SVG S-Wave curve
  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    const totalLen = pathEl.getTotalLength();
    const pts = STAGE_FRACTIONS.map((f) => {
      const pt = pathEl.getPointAtLength(totalLen * f);
      return { x: pt.x, y: pt.y };
    });
    setWaypointCoords(pts);
  }, []);

  // Live mission elapsed timer
  useEffect(() => {
    if (mission.stage === 5) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [mission.stage]);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) window.clearInterval(simTimerRef.current);
    };
  }, [mission.id]);

  // GSAP Kinetic S-Wave Highway + Orbital Gauge + Banking Vehicle Pod + 3D Flip Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const pathEl = pathRef.current;
      const targetPercent = currentStageDef.percent;
      const targetFraction = STAGE_FRACTIONS[mission.stage];
      const targetDist =
        mission.stage === 0 || mission.stage === 1
          ? mission.distanceKm
          : mission.stage === 2
          ? Number((mission.distanceKm * 0.45).toFixed(1))
          : 0;

      const tl = gsap.timeline();

      // 1. Animate Curved S-Wave Path Draw + Banking Kinetic Pod along exact curve
      if (pathEl && progressPathRef.current && podRef.current) {
        const totalLen = pathEl.getTotalLength();
        progressPathRef.current.style.strokeDasharray = `${totalLen}`;

        const driveState = { f: prevFractionRef.current };

        const updatePodAt = (frac: number) => {
          const clamped = Math.min(Math.max(frac, 0.005), 1);
          const len = totalLen * clamped;
          const pt = pathEl.getPointAtLength(len);
          const ahead = pathEl.getPointAtLength(Math.min(totalLen, len + 2));
          const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * (180 / Math.PI);
          // Dampen tilt so the pod tilts subtly with the hills
          const gentleTilt = Math.max(-22, Math.min(22, (angle - 180) * 0.35));
          if (podRef.current) {
            podRef.current.setAttribute(
              'transform',
              `translate(${pt.x}, ${pt.y}) rotate(${gentleTilt})`
            );
          }
          if (progressPathRef.current) {
            progressPathRef.current.style.strokeDashoffset = `${totalLen * (1 - clamped)}`;
          }
          if (energyPathRef.current) {
            energyPathRef.current.style.clipPath = `inset(0 0 0 ${Math.max(0, (1 - clamped) * 100 - 4)}%)`;
          }
        };

        // Initialize immediately before tweening
        updatePodAt(prevFractionRef.current);

        tl.to(
          driveState,
          {
            f: targetFraction,
            duration: 1.15,
            ease: 'power3.inOut',
            onUpdate: () => updatePodAt(driveState.f),
            onComplete: () => {
              // Radial shockwave burst when pod arrives at the waypoint!
              if (shockwaveRef.current) {
                const destPt = pathEl.getPointAtLength(totalLen * targetFraction);
                shockwaveRef.current.setAttribute('cx', `${destPt.x}`);
                shockwaveRef.current.setAttribute('cy', `${destPt.y}`);
                gsap.fromTo(
                  shockwaveRef.current,
                  { attr: { r: 10 }, opacity: 0.9, strokeWidth: 4 },
                  { attr: { r: 46 }, opacity: 0, strokeWidth: 0.5, duration: 0.75, ease: 'power2.out' }
                );
              }
            },
          },
          0
        );

        prevFractionRef.current = targetFraction;
      }

      // 2. Orbital Circular Speedometer Gauge Ring (GSAP elastic stroke draw)
      if (gaugeCircleRef.current) {
        const targetOffset = GAUGE_CIRC * (1 - targetPercent / 100);
        tl.to(
          gaugeCircleRef.current,
          {
            strokeDashoffset: targetOffset,
            stroke: currentStageDef.color,
            duration: 1.05,
            ease: 'elastic.out(0.85, 0.55)',
          },
          0
        );
      }

      // 3. GSAP Percentage Counter Roll
      const pctObj = { val: prevPercentRef.current };
      tl.to(
        pctObj,
        {
          val: targetPercent,
          duration: 0.9,
          ease: 'power2.out',
          onUpdate: () => {
            if (percentTextRef.current) {
              percentTextRef.current.textContent = `${Math.round(pctObj.val)}%`;
            }
          },
        },
        0
      );
      prevPercentRef.current = targetPercent;

      // 4. GSAP Distance Countdown Roll
      const distObj = { val: prevDistRef.current };
      tl.to(
        distObj,
        {
          val: targetDist,
          duration: 0.95,
          ease: 'power2.out',
          onUpdate: () => {
            if (distTextRef.current) {
              distTextRef.current.textContent = `${distObj.val.toFixed(1)} كم`;
            }
          },
        },
        0
      );
      prevDistRef.current = targetDist;

      // 5. 3D Kinetic Flip on the Stage Status Banner
      if (flipBannerRef.current) {
        gsap.fromTo(
          flipBannerRef.current,
          { rotateX: -28, y: 10, opacity: 0.55, transformPerspective: 800 },
          { rotateX: 0, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' }
        );
      }

      // 6. Active Step Chip Pop
      const activeNode = containerRef.current?.querySelector('.kinetic-step-card.current');
      if (activeNode) {
        gsap.fromTo(
          activeNode,
          { scale: 0.9, y: 6 },
          { scale: 1, y: 0, duration: 0.5, ease: 'back.out(2.1)' }
        );
      }

      // 7. Grand Finale Firework Burst on Stage 5
      if (mission.stage === 5 && confettiRef.current) {
        const pieces = confettiRef.current.querySelectorAll('.confetti-piece');
        const colors = ['#E56A45', '#2F8A5B', '#F3B44B', '#3B75A9', '#8B5BA8', '#10B981'];
        pieces.forEach((piece, idx) => {
          const el = piece as HTMLElement;
          el.style.backgroundColor = colors[idx % colors.length];
          const angle = (idx / pieces.length) * Math.PI * 2;
          const dist = 120 + Math.random() * 170;
          gsap.fromTo(
            el,
            {
              left: '50%',
              top: '44%',
              x: 0,
              y: 0,
              scale: 0.4,
              opacity: 1,
              rotation: 0,
            },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 20,
              scale: 1.15,
              opacity: 0,
              rotation: Math.random() * 540 - 270,
              duration: 1.15 + Math.random() * 0.55,
              ease: 'power3.out',
            }
          );
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [mission.stage, mission.id, mission.distanceKm, currentStageDef.percent, currentStageDef.color]);

  const handleToggleSimulation = () => {
    if (!onSetStage) return;
    if (isSimulating) {
      if (simTimerRef.current) window.clearInterval(simTimerRef.current);
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);
    let step: MissionStageIndex = mission.stage === 5 ? 0 : mission.stage;
    if (mission.stage === 5) {
      onSetStage(mission.id, 0);
    }

    simTimerRef.current = window.setInterval(() => {
      step = (step + 1) as MissionStageIndex;
      if (step <= 5) {
        onSetStage(mission.id, step);
      }
      if (step >= 5) {
        if (simTimerRef.current) window.clearInterval(simTimerRef.current);
        setIsSimulating(false);
      }
    }, 1550);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const CurrentIcon = STAGE_ICONS[mission.stage];

  const getStageTimestamp = (idx: MissionStageIndex) => {
    const log = mission.stageLogs.find((l) => l.stage === idx);
    return log ? log.timestamp : '—';
  };

  return (
    <div ref={containerRef} className="mission-hero-card kinetic-hero">
      <div className="mission-hero-aura" />
      <div className="mission-hero-aura-2" />

      {/* Confetti / Firework Celebration Layer */}
      <div ref={confettiRef} className="confetti-layer" aria-hidden="true">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className="confetti-piece" />
        ))}
      </div>

      {/* TOP ROW: Title + Orbital GSAP Gauge */}
      <div className="kinetic-top-row">
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
            <span className={`badge ${mission.stage === 5 ? 'resolved' : mission.priority}`}>
              {mission.stage === 5
                ? '✓ تم الحل والإغلاق'
                : mission.priority === 'urgent'
                ? '● بلاغ طارئ'
                : mission.priority === 'high'
                ? '▲ أولوية مرتفعة'
                : '• صيانة مجدولة'}
            </span>
            <span className="code-pill">
              {mission.code} • {mission.category}
            </span>
            <span className="telemetry-live-pill">
              <Radio size={13} />
              بث حركي مباشر
              <span className="eq-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: compact ? '1.1rem' : '1.3rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
            }}
          >
            {mission.title}
          </h2>
          <p
            style={{
              margin: '5px 0 0',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} color="var(--accent-coral)" />
              {mission.site.name}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} color="var(--text-muted)" />
              {mission.scheduledDate} — {mission.scheduledTime}
            </span>
          </p>

          {/* 3D Flip Active Stage Banner */}
          <div ref={flipBannerRef} className="kinetic-stage-pill" style={{ borderColor: `${currentStageDef.color}45` }}>
            <div
              className="kinetic-stage-icon"
              style={{
                background: currentStageDef.softBg,
                color: currentStageDef.color,
              }}
            >
              <CurrentIcon
                size={20}
                className={
                  mission.stage === 2
                    ? 'anim-van'
                    : mission.stage === 4
                    ? 'anim-gear'
                    : mission.stage === 0
                    ? 'anim-bell'
                    : ''
                }
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: currentStageDef.color }}>
                المرحلة {mission.stage + 1} من 6 {technician ? `• ${technician.name}` : ''}
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {currentStageDef.title}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {currentStageDef.subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* ORBITAL DUAL-RING GSAP GAUGE + TELEMETRY */}
        <div className="orbital-gauge-panel">
          <div className="orbital-ring-wrap">
            <svg width="114" height="114" viewBox="0 0 114 114">
              {/* Outer spinning dashed orbit */}
              <circle
                cx="57"
                cy="57"
                r="53"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                className="orbit-spin"
              />
              {/* Track circle */}
              <circle
                cx="57"
                cy="57"
                r={GAUGE_R}
                fill="none"
                stroke="var(--bg-card-subtle)"
                strokeWidth="9"
              />
              {/* GSAP Animated Progress Arc */}
              <circle
                ref={gaugeCircleRef}
                cx="57"
                cy="57"
                r={GAUGE_R}
                fill="none"
                stroke={currentStageDef.color}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRC}
                strokeDashoffset={GAUGE_CIRC * (1 - currentStageDef.percent / 100)}
                transform="rotate(-90 57 57)"
                style={{ filter: `drop-shadow(0 0 8px ${currentStageDef.color}66)` }}
              />
            </svg>
            <div className="orbital-center-text">
              <span ref={percentTextRef} style={{ color: currentStageDef.color }}>
                {currentStageDef.percent}%
              </span>
              <small>الإنجاز</small>
            </div>
          </div>

          <div className="orbital-metrics">
            <div className="metric-mini">
              <span>المسافة</span>
              <strong ref={distTextRef}>
                {mission.stage >= 3 ? '0.0 كم' : `${mission.distanceKm.toFixed(1)} كم`}
              </strong>
            </div>
            <div className="metric-mini">
              <span>الوقت</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTimer(elapsedSeconds)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* BRAND-NEW CURVED KINETIC S-WAVE HIGHWAY (GSAP + CSS) */}
      <div className="highway-stage-box">
        <svg viewBox="0 0 900 178" className="highway-svg" role="img" aria-label="مسار رحلة الصيانة التفاعلي">
          <defs>
            <linearGradient id="kineticHighwayGrad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#E56A45" />
              <stop offset="35%" stopColor="#F0984B" />
              <stop offset="68%" stopColor="#3B75A9" />
              <stop offset="100%" stopColor="#2F8A5B" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle Horizon Grid Lines */}
          <line x1="20" y1="92" x2="880" y2="92" stroke="var(--border-soft)" strokeDasharray="3 7" strokeWidth="1" />

          {/* Road Outer Casing */}
          <path
            ref={pathRef}
            d={HIGHWAY_PATH}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* Road Inner Lane */}
          <path
            d={HIGHWAY_PATH}
            fill="none"
            stroke="var(--bg-card)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* GSAP-Traced Glowing Gradient Progress Highway */}
          <path
            ref={progressPathRef}
            d={HIGHWAY_PATH}
            fill="none"
            stroke="url(#kineticHighwayGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />

          {/* CSS Flowing Energy Pulses Racing Along the Highway */}
          <path
            ref={energyPathRef}
            d={HIGHWAY_PATH}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            className="highway-energy-stream"
            opacity="0.72"
          />

          {/* 6 Interactive Waypoint Nodes on the Curve */}
          {waypointCoords.map((pt, idx) => {
            const st = MISSION_STAGES[idx];
            const isDone = mission.stage > idx || (mission.stage === 5 && idx === 5);
            const isCurrent = mission.stage === idx && mission.stage !== 5;
            const labelY = pt.y > 95 ? pt.y + 34 : pt.y - 26;
            return (
              <g
                key={st.id}
                onClick={() => !readOnly && onSetStage && onSetStage(mission.id, st.index)}
                style={{ cursor: readOnly ? 'default' : 'pointer' }}
              >
                {isCurrent && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="21"
                    fill="none"
                    stroke={st.color}
                    strokeWidth="2.5"
                    className="svg-sonar-ring"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isCurrent ? 14 : 11}
                  fill={isDone ? '#2F8A5B' : isCurrent ? st.color : 'var(--bg-elevated)'}
                  stroke={isDone || isCurrent ? '#ffffff' : 'var(--border-strong)'}
                  strokeWidth="3"
                />
                <text
                  x={pt.x}
                  y={pt.y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="900"
                  fill={isDone || isCurrent ? '#ffffff' : 'var(--text-muted)'}
                >
                  {idx + 1}
                </text>
                <text
                  x={pt.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={isCurrent ? '900' : '700'}
                  fill={isCurrent ? st.color : 'var(--text-secondary)'}
                >
                  {st.shortTitle}
                </text>
              </g>
            );
          })}

          {/* Arrival Shockwave Circle */}
          <circle
            ref={shockwaveRef}
            cx="840"
            cy="92"
            r="10"
            fill="none"
            stroke={currentStageDef.color}
            opacity="0"
          />

          {/* GSAP Traveling Kinetic Vehicle Pod (glides & banks along the exact S-curve!) */}
          <g ref={podRef} transform="translate(840, 92)">
            {/* Speed glow halo */}
            <circle cx="0" cy="0" r="22" fill={currentStageDef.color} opacity="0.22" />
            {/* Pod capsule body */}
            <rect
              x="-19"
              y="-13"
              width="38"
              height="26"
              rx="13"
              fill="#0E1A2B"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            {/* Glowing beacon core */}
            <circle cx="0" cy="0" r="6" fill={currentStageDef.color} />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* 6 Sleek Interactive Step Chips */}
      <div className="kinetic-steps-grid">
        {MISSION_STAGES.map((stage) => {
          const Icon = STAGE_ICONS[stage.index];
          const isDone = mission.stage > stage.index || (mission.stage === 5 && stage.index === 5);
          const isCurrent = mission.stage === stage.index && mission.stage !== 5;
          return (
            <button
              key={stage.id}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onSetStage && onSetStage(mission.id, stage.index)}
              className={`kinetic-step-card ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              style={readOnly ? { cursor: 'default' } : undefined}
            >
              <div className="kinetic-step-top">
                <span className="kinetic-step-num">{stage.index + 1}</span>
                <Icon
                  size={16}
                  className={isCurrent && stage.index === 4 ? 'anim-gear' : isCurrent && stage.index === 2 ? 'anim-van' : ''}
                />
              </div>
              <div className="kinetic-step-title">{stage.shortTitle}</div>
              <div className="kinetic-step-time">
                {isDone || isCurrent ? getStageTimestamp(stage.index) : `${stage.percent}%`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Controls Bar */}
      {readOnly ? (
        <div className="tracker-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span className="live-dot" />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
              {mission.stage === 5
                ? 'تم إنهاء الزيارة بنجاح — شكراً لتواصلك مع مسار الصيانة'
                : 'يتم تحديث المسار والأنيميشن تلقائياً لحظة بلحظة مع تحرك الفني'}
            </span>
          </div>
          {onSetStage && (
            <button
              type="button"
              className="pill-btn"
              onClick={handleToggleSimulation}
              style={{
                background: isSimulating ? 'var(--pastel-peach-bg)' : undefined,
                borderColor: isSimulating ? 'var(--accent-coral)' : undefined,
              }}
            >
              <Play size={15} />
              {isSimulating ? 'إيقاف العرض التجريبي' : 'معاينة حركة المسار كاملة'}
            </button>
          )}
        </div>
      ) : (
        <div className="tracker-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pill-btn"
              onClick={handleToggleSimulation}
              style={{
                background: isSimulating ? 'var(--pastel-peach-bg)' : undefined,
                borderColor: isSimulating ? 'var(--accent-coral)' : undefined,
              }}
            >
              <Play size={15} />
              {isSimulating ? 'إيقاف المحاكاة' : 'محاكاة المسار الموجي (GSAP)'}
            </button>

            {mission.stage > 0 && onSetStage && (
              <button
                type="button"
                className="pill-btn"
                onClick={() => onSetStage(mission.id, 0)}
                title="إعادة البلاغ للبداية"
              >
                <RotateCcw size={15} />
                إعادة من البداية
              </button>
            )}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mission.site.coords.lat},${mission.site.coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="pill-btn"
              style={{ textDecoration: 'none' }}
            >
              <Navigation size={15} color="var(--accent-coral)" />
              فتح اللوكيشن GPS
            </a>
          </div>

          <button
            type="button"
            disabled={mission.stage === 5}
            onClick={() => onAdvanceStage && onAdvanceStage(mission.id)}
            className={`primary-advance-btn ${mission.stage === 5 ? 'complete-state' : ''}`}
          >
            {mission.stage === 5 ? (
              <>
                <Sparkles size={18} />
                تم حل المشكلة وتسليم المركز
              </>
            ) : (
              <>
                <span>{currentStageDef.actionLabel}</span>
                <ArrowLeft size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
