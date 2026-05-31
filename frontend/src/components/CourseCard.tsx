import type { Course } from '../types'
import { TYPE_COLORS } from '../types'

interface CourseCardProps {
  course: Course
  onClick?: () => void
  compact?: boolean
}

export default function CourseCard({ course, onClick, compact }: CourseCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass rounded-xl p-4 transition-all hover:border-accent-primary/30 hover:bg-warm-200/60 ${
        course.is_vendor ? 'border-l-2 border-l-accent-orange glow-orange' : ''
      } ${compact ? 'p-3' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="shrink-0 px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: `${TYPE_COLORS[course.type]}33`, color: TYPE_COLORS[course.type] }}
            >
              {course.type_label}
            </span>
            {course.is_vendor && (
              <span className="text-[10px] text-accent-orange">厂商</span>
            )}
          </div>
          <h3 className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>{course.name}</h3>
          {!compact && (
            <p className="text-xs text-warm-500 mt-1 truncate">{course.source}</p>
          )}
        </div>
        {course.hours != null && (
          <span className="shrink-0 text-xs text-warm-600">{course.hours}学时</span>
        )}
      </div>
    </button>
  )
}
