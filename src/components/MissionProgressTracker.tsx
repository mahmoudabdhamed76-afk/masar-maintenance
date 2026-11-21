import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Navigation,
  Play,
  RotateCcw,
  Sparkles,
  Truck,
  Wrench,
  ArrowLeft,
  Radio,
} from 'lucide-react';
import { MISSION_STAGES } from '../data/initialData';
import { MaintenanceMission, MissionStageIndex, Technician } from '../types/maintenance';

interface MissionProgressTrackerProps {
  mission: MaintenanceMission;
  technician?: Technician;
  onAdvanceStage: (missionId: string) => void;
  onSetStage: (missionId: string, stage: MissionStageIndex) => void;
  compact?: boolean;
}

const STAGE_ICONS = [BellRing, ClipboardCheck, Truck, MapPin, Wrench, CheckCircle2];

export const MissionProgressTracker: React.FC<MissionProgressTrackerProps> = ({
  mission,
  technician,
  onAdvanceStage,
  onSetStage,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const percentTextRef = useRef<HTMLSpanElement>(null);
  const distTextRef = useRef<HTMLSpanElement>(null);
  const routeVanRef = useRef<SVGGElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  const prevPercentRef = useRef<number>(MISSION_STAGES[mission.stage].percent);
  const prevDistRef = useRef<number>(mission.stage >= 3 ? 0 : mission.distanceKm);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(824); // realistic live elapsed counter
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simTimerRef = useRef<number | null>(null);

  const currentStageDef = MISSION_STAGES[mission.stage];

  // Live mission timer (pauses when solved)
  useEffect(() => {
    if (mission.stage === 5) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [mission.stage]);

  // Stop simulation on unmount or mission change
  useEffect(() => {
    return () => {
      if (simTimerRef.current) window.clearInterval(simTimerRef.current);
    };
  }, [mission.id]);

  // GSAP Core Progress Bar & Stage Transition Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const targetPercent = currentStageDef.percent;
      const targetDist =
        mission.stage === 0 || mission.stage === 1
          ? mission.distanceKm
          : mission.stage === 2
          ? Number((mission.distanceKm * 0.45).toFixed(1))
          : 0;

      const tl = gsap.timeline();

      // 1. Animate liquid bar width smoothly
      if (fillRef.current) {
        tl.to(
          fillRef.current,
          {
            width: `${targetPercent}%`,
            duration: 0.95,
            ease: 'power3.out',
          },
          0
        );
      }

      // 2. Glide moving technician bubble + radar orb along RTL rail
      if (moverRef.current) {
        const clampedPos = Math.min(Math.max(targetPercent, 8), 92);
        tl.to(
          moverRef.current,
          {
            right: `${clampedPos}%`,
            duration: 1.0,
            ease: 'back.out(1.25)',
          },
          0
        );
      }

      // 3. Roll percentage counter with GSAP
      const counterObj = { val: prevPercentRef.current };
      tl.to(
        counterObj,
        {
          val: targetPercent,
          duration: 0.85,
          ease: 'power2.out',
          onUpdate: () => {
            if (percentTextRef.current) {
              percentTextRef.current.textContent = `${Math.round(counterObj.val)}%`;
            }
          },
        },
        0
      );
      prevPercentRef.current = targetPercent;

      // 4. Roll remaining distance counter
      const distObj = { val: prevDistRef.current };
      tl.to(
        distObj,
        {
          val: targetDist,
          duration: 0.9,
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

      // 5. Move mini SVG vehicle along route from right (x=310) to center pin (x=42)
      if (routeVanRef.current) {
        const routeProgress =
          mission.stage === 0
            ? 0.04
            : mission.stage === 1
            ? 0.16
            : mission.stage === 2
            ? 0.58
            : 1;
        const xPos = 310 - routeProgress * 260;
        const yArc = 38 - Math.sin(routeProgress * Math.PI) * 18;
        tl.to(
          routeVanRef.current,
          {
            attr: { transform: `translate(${xPos}, ${yArc})` },
            duration: 1.05,
            ease: 'power3.inOut',
          },
          0
        );
      }

      // 6. Subtle entrance bounce on stage banner & active node
      if (bannerRef.current) {
        gsap.fromTo(
          bannerRef.current,
          { y: 6, opacity: 0.78 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }
        );
      }

      const activeNode = containerRef.current?.querySelector('.stage-node.current');
      if (activeNode) {
        gsap.fromTo(
          activeNode,
          { scale: 0.94 },
          { scale: 1, duration: 0.5, ease: 'back.out(2)' }
        );
      }

      // 7. Celebration Confetti Burst on Stage 5 (Resolved!)
      if (mission.stage === 5 && confettiRef.current) {
        const pieces = confettiRef.current.querySelectorAll('.confetti-piece');
        const colors = ['#E56A45', '#2F8A5B', '#F3B44B', '#3B75A9', '#8B5BA8'];
        pieces.forEach((piece, idx) => {
          const el = piece as HTMLElement;
          el.style.backgroundColor = colors[idx % colors.length];
          gsap.fromTo(
            el,
            {
              left: `${45 + (Math.random() * 14 - 7)}%`,
              top: '35%',
              scale: 0.5,
              opacity: 1,
              rotation: 0,
            },
            {
              left: `${10 + Math.random() * 80}%`,
              top: `${-5 + Math.random() * 95}%`,
              scale: 1 + Math.random() * 0.6,
              opacity: 0,
              rotation: Math.random() * 520 - 260,
              duration: 1.2 + Math.random() * 0.7,
              ease: 'power3.out',
            }
          );
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [mission.stage, mission.id, mission.distanceKm, currentStageDef.percent]);

  const handleToggleSimulation = () => {
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
    }, 1500);
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
    <div ref={containerRef} className="mission-hero-card">
      <div className="mission-hero-aura" />
      <div className="mission-hero-aura-2" />

      {/* Confetti celebration particles */}
      <div ref={confettiRef} className="confetti-layer" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="confetti-piece" />
        ))}
      </div>

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 2,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className={`badge ${mission.stage === 5 ? 'resolved' : mission.priority}`}>
              {mission.stage === 5
                ? '✓ تم الحل بنجاح'
                : mission.priority === 'urgent'
                ? '● بلاغ عاجل'
                : mission.priority === 'high'
                ? '▲ أولوية مرتفعة'
                : '• صيانة مجدولة'}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                background: 'var(--bg-card-subtle)',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              {mission.code} • {mission.category}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.77rem',
                fontWeight: 700,
                color: 'var(--pastel-mint-text)',
                background: 'var(--pastel-mint-bg)',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              <Radio size={13} />
              GPS مباشر
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: compact ? '1.08rem' : '1.28rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
            }}
          >
            {mission.title}
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.83rem',
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
              الموعد: {mission.scheduledDate} — {mission.scheduledTime}
            </span>
          </p>
        </div>

        {/* Live Telemetry Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 14,
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-soft)',
              textAlign: 'center',
              minWidth: 88,
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>نسبة الإنجاز</div>
            <span
              ref={percentTextRef}
              style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-coral)' }}
            >
              {currentStageDef.percent}%
            </span>
          </div>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 14,
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-soft)',
              textAlign: 'center',
              minWidth: 92,
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>المسافة للمركز</div>
            <span
              ref={distTextRef}
              style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}
            >
              {mission.stage >= 3 ? '0.0 كم' : `${mission.distanceKm.toFixed(1)} كم`}
            </span>
          </div>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 14,
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-soft)',
              textAlign: 'center',
              minWidth: 88,
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>الزمن المنقضي</div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTimer(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Live Current Stage Banner + SVG Route Arc */}
      <div ref={bannerRef} className="tracker-stage-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0, flex: '1 1 260px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: currentStageDef.softBg,
              color: currentStageDef.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1.5px solid ${currentStageDef.color}40`,
            }}
          >
            <CurrentIcon
              size={24}
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.73rem', fontWeight: 800, color: currentStageDef.color }}>
              المرحلة {mission.stage + 1} من 6 • الحالة الحالية للفني {technician ? `(${technician.name})` : ''}
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {currentStageDef.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {currentStageDef.subtitle}
            </div>
          </div>
        </div>

        {/* Mini Animated SVG Route Trajectory */}
        <div style={{ width: '100%', maxWidth: 350, flexShrink: 0 }}>
          <svg viewBox="0 0 360 66" style={{ width: '100%', height: 64, overflow: 'visible' }}>
            {/* Dashed curved road from Technician (right) to Center (left) */}
            <path
              d="M 315 44 Q 180 6 45 44"
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 315 44 Q 180 6 45 44"
              fill="none"
              stroke={currentStageDef.color}
              strokeWidth="3.5"
              strokeLinecap="round"
              className={mission.stage < 5 ? 'anim-route-dash' : ''}
            />
            {/* Start point: Technician dispatch */}
            <circle cx="315" cy="44" r="6" fill="var(--accent-coral)" />
            <text x="315" y="62" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="700">
              نقطة الانطلاق
            </text>
            {/* Destination: Center */}
            <circle cx="45" cy="44" r="7" fill={mission.stage >= 3 ? '#2F8A5B' : '#0E1A2B'} />
            <text x="45" y="62" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="700">
              موقع المركز
            </text>
            {/* GSAP Animated Moving Van/Pin */}
            <g ref={routeVanRef} transform="translate(180, 24)">
              <circle cx="0" cy="0" r="14" fill={currentStageDef.color} opacity="0.2" />
              <circle cx="0" cy="0" r="9" fill={currentStageDef.color} stroke="#fff" strokeWidth="2.5" />
            </g>
          </svg>
        </div>
      </div>

      {/* THE ADVANCED GSAP + CSS ANIMATED PROGRESS BAR */}
      <div className="tracker-track-wrapper">
        {/* Floating Animated Mover Indicator */}
        <div ref={moverRef} className="tracker-mover">
          <div className="mover-bubble">
            <CurrentIcon
              size={14}
              className={mission.stage === 2 ? 'anim-van' : mission.stage === 4 ? 'anim-gear' : ''}
            />
            <span>{currentStageDef.shortTitle}</span>
          </div>
          <div className="mover-pulse-orb" />
        </div>

        {/* Liquid Shimmer Rail */}
        <div className="tracker-rail">
          <div ref={fillRef} className="tracker-fill" />
        </div>
      </div>

      {/* 6 Interactive Milestone Nodes */}
      <div className="stages-grid">
        {MISSION_STAGES.map((stage) => {
          const Icon = STAGE_ICONS[stage.index];
          const isDone = mission.stage > stage.index || (mission.stage === 5 && stage.index === 5);
          const isCurrent = mission.stage === stage.index && mission.stage !== 5;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSetStage(mission.id, stage.index)}
              className={`stage-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              title={`الانتقال إلى مرحلة: ${stage.title}`}
            >
              <div className="stage-icon-circle">
                <Icon
                  size={18}
                  className={isCurrent && stage.index === 4 ? 'anim-gear' : isCurrent && stage.index === 2 ? 'anim-van' : ''}
                />
              </div>
              <div className="stage-node-title">{stage.shortTitle}</div>
              <div className="stage-node-time">
                {isDone || isCurrent ? getStageTimestamp(stage.index) : `${stage.percent}%`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Controls Bar */}
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
            {isSimulating ? 'إيقاف المحاكاة' : 'محاكاة تلقائية للرحلة (GSAP)'}
          </button>

          {mission.stage > 0 && (
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
          onClick={() => onAdvanceStage(mission.id)}
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
    </div>
  );
};
