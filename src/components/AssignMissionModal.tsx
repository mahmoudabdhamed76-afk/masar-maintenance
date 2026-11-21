import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Calendar, Clock, MapPin, PlusCircle, User, X } from 'lucide-react';
import { SITE_PRESETS } from '../data/initialData';
import { MaintenanceMission, PriorityLevel, Technician } from '../types/maintenance';

interface AssignMissionModalProps {
  open: boolean;
  technicians: Technician[];
  onClose: () => void;
  onCreate: (mission: MaintenanceMission) => void;
}

export const AssignMissionModal: React.FC<AssignMissionModalProps> = ({
  open,
  technicians,
  onClose,
  onCreate,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('أجهزة طبية وتبريد');
  const [priority, setPriority] = useState<PriorityLevel>('urgent');
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id || 'tech-1');
  const [siteId, setSiteId] = useState(SITE_PRESETS[0].id);
  const [customSite, setCustomSite] = useState(false);
  const [customSiteName, setCustomSiteName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('اليوم');
  const [scheduledTime, setScheduledTime] = useState('12:00 م');
  const [estimatedDuration, setEstimatedDuration] = useState('45 دقيقة');
  const [description, setDescription] = useState('');
  const [partsNeeded, setPartsNeeded] = useState('');

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 26, scale: 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.36, ease: 'back.out(1.4)' }
      );
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const now = new Date();
    const formattedNow = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const preset = SITE_PRESETS.find((s) => s.id === siteId) || SITE_PRESETS[0];
    const site = customSite
      ? {
          id: `site-custom-${Date.now()}`,
          name: customSiteName.trim() || 'موقع صيانة ميداني جديد',
          district: 'القاهرة الكبرى',
          address: customAddress.trim() || 'تم تحديد العنوان عبر GPS',
          contactName: 'مسؤول الموقع',
          contactPhone: '01000000000',
          coords: {
            lat: Number((30.01 + Math.random() * 0.08).toFixed(4)),
            lng: Number((31.2 + Math.random() * 0.25).toFixed(4)),
            x: Math.round(20 + Math.random() * 62),
            y: Math.round(20 + Math.random() * 62),
          },
        }
      : preset;

    const newMission: MaintenanceMission = {
      id: `msn-${Date.now()}`,
      code: `MT-${Math.floor(2055 + Math.random() * 890)}`,
      title: title.trim(),
      category,
      description:
        description.trim() ||
        'بلاغ صيانة ميدانية جديد تم إرساله من غرفة تحكم المدير مع تفعيل التتبع المباشر.',
      priority,
      technicianId,
      site,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      distanceKm: Number((2.5 + Math.random() * 8.5).toFixed(1)),
      etaMinutes: Math.round(12 + Math.random() * 18),
      stage: 0,
      stageLogs: [{ stage: 0, timestamp: formattedNow, note: 'تم إنشاء وإرسال البلاغ من المدير' }],
      checklist: [
        { id: 'c1', label: 'معاينة العطل وتوثيق حالة الجهاز عند الوصول', done: false },
        { id: 'c2', label: 'تنفيذ الصيانة وتركيب القطع المطلوبة', done: false },
        { id: 'c3', label: 'اختبار الكفاءة التشغيلية واعتماد التسليم', done: false },
      ],
      resolutionNotes: '',
      createdAt: formattedNow,
      partsNeeded: partsNeeded.trim() || undefined,
    };

    onCreate(newMission);
    setTitle('');
    setDescription('');
    setPartsNeeded('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="تعيين مهمة صيانة ميدانية جديدة"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>
              تعيين مهمة صيانة ميدانية جديدة
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              حدد الفني والموقع والموعد — سيصل البلاغ فوراً لصفحة الفني مع تفعيل بار التتبع
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: '1px solid var(--border-soft)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field full">
            <label className="form-label">عنوان المشكلة / الصيانة *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="مثال: عطل مفاجئ في وحدة التبريد أو فحص لوحة UPS..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <User size={13} style={{ marginLeft: 4 }} />
              الفني المكلف بالمهمة
            </label>
            <select
              className="form-select"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status === 'available' ? 'متاح الآن' : 'في مهمة'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">درجة الأولوية</label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            >
              <option value="urgent">عاجل جداً (طوارئ)</option>
              <option value="high">أولوية مرتفعة</option>
              <option value="normal">صيانة عادية / دورية</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">التخصص / القسم</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="أجهزة طبية وتبريد">أجهزة طبية وتبريد</option>
              <option value="تبريد وتكييف">تبريد وتكييف مركزي</option>
              <option value="شبكات وسيرفرات">شبكات وسيرفرات</option>
              <option value="كهرباء وقدرة">كهرباء وقدرة UPS</option>
              <option value="أنظمة ميكانيكية">أنظمة ميكانيكية وأبواب</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">قطع غيار مطلوبة (اختياري)</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: حساس حرارة، كابستور، كابل فايبر..."
              value={partsNeeded}
              onChange={(e) => setPartsNeeded(e.target.value)}
            />
          </div>

          {/* Location Picker */}
          <div className="form-field full">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">
                <MapPin size={13} style={{ marginLeft: 4 }} />
                موقع الصيانة / المركز (اللوكيشن)
              </label>
              <button
                type="button"
                onClick={() => setCustomSite((v) => !v)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent-coral)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {customSite ? 'اختيار من المراكز المسجلة' : '+ إدخال لوكيشن جديد يدوياً'}
              </button>
            </div>

            {!customSite ? (
              <select
                className="form-select"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                {SITE_PRESETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.district}
                  </option>
                ))}
              </select>
            ) : (
              <div className="form-grid" style={{ marginTop: 4 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="اسم المركز أو المكان..."
                  value={customSiteName}
                  onChange={(e) => setCustomSiteName(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="العنوان التفصيلي / المنطقة..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">
              <Calendar size={13} style={{ marginLeft: 4 }} />
              تاريخ الصيانة
            </label>
            <select
              className="form-select"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            >
              <option value="اليوم">اليوم</option>
              <option value="غداً">غداً</option>
              <option value="بعد غد">بعد غد</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">
              <Clock size={13} style={{ marginLeft: 4 }} />
              وقت الصيانة والمدة المتوقعة
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="12:00 م"
              />
              <select
                className="form-select"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
              >
                <option value="30 دقيقة">30 دقيقة</option>
                <option value="45 دقيقة">45 دقيقة</option>
                <option value="60 دقيقة">60 دقيقة</option>
                <option value="90 دقيقة">90 دقيقة</option>
              </select>
            </div>
          </div>

          <div className="form-field full">
            <label className="form-label">وصف العطل والملاحظات للفني</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="اكتب تفاصيل المشكلة، رقم الدور أو الجهاز، وأي تعليمات مهمة للفني..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div
            className="form-field full"
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 6,
            }}
          >
            <button type="button" className="pill-btn" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="pill-btn coral">
              <PlusCircle size={16} />
              إرسال البلاغ وتفعيل التتبع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
