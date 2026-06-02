import { BookOpen, Clock } from 'lucide-react'
import type { Course } from '../types'
import type { CurriculumDesignData } from '../types/curriculumDesign'
import { TRAINING_TRACK_LABELS, TRAINING_TRACK_META } from '../types/curriculumDesign'
import { coursesForJobTrack } from '../utils/curriculumLink'

export default function JobCurriculumTracks({
  design,
  jobName,
  labCanonical,
  resolveCourseByName,
  onCourseClick,
}: {
  design: CurriculumDesignData
  jobName: string
  labCanonical: string | null
  resolveCourseByName: (name: string) => Course | null
  onCourseClick: (course: Course) => void
}) {
  const tracks = ['enterprise', 'internship', 'industry'] as const

  return (
    <div className="border-t border-warm-300 bg-[#fafafa]">
      <div className="text-white text-sm font-bold px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#5d4037' }}>
        <span className="flex items-center gap-2">
          <BookOpen size={14} />
          培养周期课程 · 企业培训 · 实习实训 · 产业学院
        </span>
        <span className="text-[10px] font-normal opacity-90">来源：实训室课程体系设计</span>
      </div>
      <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#e0e0e0]">
        {tracks.map((track) => {
          const meta = TRAINING_TRACK_META[track]
          const list = coursesForJobTrack(design, jobName, labCanonical, track)
          return (
            <div key={track} className="p-4">
              <h4 className="text-xs font-bold text-warm-800 mb-1">{TRAINING_TRACK_LABELS[track]}</h4>
              <p className="text-[10px] text-warm-500 mb-2 flex items-center gap-1">
                <Clock size={10} />
                {meta.period} · {meta.hours} · {meta.form}
              </p>
              {list.length === 0 ? (
                <p className="text-[11px] text-warm-500">该岗位暂无{TRAINING_TRACK_LABELS[track]}映射</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {list.slice(0, 12).map((item) => {
                    const matched = resolveCourseByName(item.courseName)
                    const cls =
                      'text-left px-2 py-1 rounded-md border text-[10px] max-w-full ' +
                      (matched
                        ? 'border-accent-primary/30 bg-accent-primary/5 text-warm-800 hover:bg-accent-primary/10 cursor-pointer'
                        : 'border-warm-200 bg-white text-warm-600')
                    const inner = (
                      <>
                        <span className="font-medium block truncate">{item.courseName}</span>
                        <span className="text-[9px] text-warm-500">{item.courseType}{item.hours ? ` · ${item.hours}` : ''}</span>
                      </>
                    )
                    return matched ? (
                      <button key={`${track}-${item.courseName}`} type="button" className={cls} onClick={() => onCourseClick(matched)}>
                        {inner}
                      </button>
                    ) : (
                      <div key={`${track}-${item.courseName}`} className={cls} title="未在课程库中匹配">
                        {inner}
                      </div>
                    )
                  })}
                  {list.length > 12 && (
                    <p className="text-[9px] text-warm-400 w-full pt-1">另有 {list.length - 12} 门…</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
