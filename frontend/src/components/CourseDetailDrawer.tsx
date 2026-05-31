import { X } from 'lucide-react'
import type { Course } from '../types'
import { TYPE_COLORS, TYPE_LABELS } from '../types'

interface CourseDetailDrawerProps {
  course: Course | null
  onClose: () => void
}

export default function CourseDetailDrawer({ course, onClose }: CourseDetailDrawerProps) {
  if (!course) return null

  const vd = course.vendor_detail

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl h-full glass border-l border-warm-300 overflow-y-auto scrollbar-thin animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between p-5 bg-warm-50/95 backdrop-blur border-b border-warm-300">
          <div>
            <span
              className="inline-block px-2 py-0.5 rounded text-xs mb-2"
              style={{ backgroundColor: `${TYPE_COLORS[course.type]}33`, color: TYPE_COLORS[course.type] }}
            >
              {course.type_label || TYPE_LABELS[course.type]}
            </span>
            <h2 className="text-xl font-bold pr-4">{course.name}</h2>
            <p className="text-sm text-warm-600 mt-1">{course.lab_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-warm-200 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <InfoRow label="建议学时" value={course.hours != null ? String(course.hours) : '—'} />
          <InfoRow label="课程来源" value={course.source || '—'} highlight={course.is_vendor} />
          {course.vendor && <InfoRow label="所属厂商" value={course.vendor} highlight />}
          <InfoRow label="推荐教材" value={course.textbook || '—'} multiline />
          <InfoRow label="实训平台" value={course.platform || '—'} multiline />

          {(course.hardware || vd?.hardware) && (
            <InfoRow label="配套硬件" value={course.hardware || vd?.hardware || ''} multiline highlight />
          )}

          {(course.description || vd?.description) && (
            <div>
              <h3 className="text-sm text-warm-500 mb-2">课程描述</h3>
              <div className="p-4 rounded-xl bg-warm-100 text-sm leading-relaxed text-warm-800 whitespace-pre-wrap">
                {course.description || vd?.description}
              </div>
            </div>
          )}

          {vd && (vd.hours_total || vd.hours_theory || vd.hours_practice) && (
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="总课时" value={vd.hours_total} />
              <StatBox label="理论" value={vd.hours_theory} />
              <StatBox label="实训" value={vd.hours_practice} />
            </div>
          )}

          {vd?.capability && <InfoRow label="培养能力" value={vd.capability} multiline />}
          {vd?.jobs && <InfoRow label="岗位辐射" value={vd.jobs} multiline />}
          {course.note && <InfoRow label="备注" value={course.note} multiline />}
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  multiline,
  highlight,
}: {
  label: string
  value: string
  multiline?: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <h3 className="text-sm text-warm-500 mb-1">{label}</h3>
      <p
        className={`text-sm ${multiline ? 'leading-relaxed whitespace-pre-wrap' : ''} ${
          highlight ? 'text-accent-orange' : 'text-warm-800'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value?: number | string | null }) {
  return (
    <div className="p-3 rounded-xl bg-warm-100 text-center">
      <div className="text-lg font-bold text-accent-primary">{value ?? '—'}</div>
      <div className="text-xs text-warm-500 mt-1">{label}</div>
    </div>
  )
}
