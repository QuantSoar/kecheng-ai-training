import { Trophy, Award, Briefcase, Building2, Star, Info } from 'lucide-react'
import type { JobProfile } from '../types/jobMap'
import type { Lab } from '../types'
import type { CompetitionItem, CertificateItem } from '../types/compCert'
import { RATING_COLORS } from '../types/compCert'
import { resolveLab } from '../utils/jobLink'
import type { EntityRef } from '../utils/ecosystemIndex'

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

export function CertificateDetailPanel({ item }: { item: CertificateItem | null }) {
  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/60 p-3 flex flex-col items-center justify-center min-h-[100px] text-center">
        <Info size={20} className="text-warm-300 mb-1" />
        <p className="text-xs text-warm-500">点击右侧证书查看介绍</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-teal-200/60 bg-gradient-to-br from-teal-50/40 to-white p-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Award size={16} className="text-teal-700 shrink-0" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-warm-900 leading-tight truncate">{item.shortName || item.fullName}</h4>
          {item.shortName && item.fullName !== item.shortName && (
            <p className="text-[10px] text-warm-500 truncate">{item.fullName}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {item.category && (
          <span className="text-[9px] px-1.5 py-px rounded-full bg-white border border-warm-200 text-warm-600">{item.category}</span>
        )}
        {item.level && (
          <span className="text-[9px] px-1.5 py-px rounded-full bg-white border border-warm-200 text-warm-600">{item.level}</span>
        )}
        {item.field && (
          <span className="text-[9px] px-1.5 py-px rounded-full bg-teal-50 border border-teal-100 text-teal-800">{item.field}</span>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {item.org && (
          <div className="flex gap-1 min-w-0 sm:col-span-2">
            <dt className="text-[9px] text-warm-500 shrink-0">发证机构</dt>
            <dd className="text-[11px] text-warm-800 truncate">{item.org}</dd>
          </div>
        )}
        {item.examForm && (
          <div className="flex gap-1 min-w-0">
            <dt className="text-[9px] text-warm-500 shrink-0">考试</dt>
            <dd className="text-[11px] text-warm-700 truncate" title={item.examForm}>{item.examForm}</dd>
          </div>
        )}
        {item.recognition && (
          <div className="flex gap-1 min-w-0">
            <dt className="text-[9px] text-warm-500 shrink-0">认可度</dt>
            <dd className="text-[11px] text-warm-700 truncate" title={item.recognition}>{item.recognition}</dd>
          </div>
        )}
        {item.note && (
          <div className="flex gap-1 min-w-0 sm:col-span-2">
            <dt className="text-[9px] text-warm-500 shrink-0">说明</dt>
            <dd className="text-[11px] text-warm-600 line-clamp-2" title={item.note}>{item.note}</dd>
          </div>
        )}
        {item.labs.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-[9px] text-warm-500 mb-0.5">适用实训室</dt>
            <dd className="flex flex-wrap gap-0.5">
              {item.labs.map((l) => (
                <span key={l} className="text-[9px] px-1 py-px rounded bg-accent-primary/8 text-accent-primary">{shortLab(l)}</span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export function CompetitionDetailPanel({ item }: { item: CompetitionItem | null }) {
  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/60 p-3 flex flex-col items-center justify-center min-h-[100px] text-center">
        <Info size={20} className="text-warm-300 mb-1" />
        <p className="text-xs text-warm-500">点击右侧竞赛查看介绍</p>
      </div>
    )
  }
  const ratingColor = RATING_COLORS[item.rating] ?? '#9e9e9e'
  return (
    <div className="rounded-lg border border-orange-200/60 bg-gradient-to-br from-orange-50/30 to-white p-2.5">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Trophy size={16} className="text-orange-600 shrink-0" />
          <h4 className="text-sm font-bold text-warm-900 leading-tight truncate">{item.name}</h4>
        </div>
        {item.rating && (
          <span
            className="shrink-0 text-[9px] px-1.5 py-px rounded border font-medium"
            style={{ color: ratingColor, borderColor: `${ratingColor}40`, backgroundColor: `${ratingColor}12` }}
          >
            {item.rating}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {item.category && <span className="text-[9px] px-1.5 py-px rounded-full bg-white border border-warm-200 text-warm-600">{item.category}</span>}
        {item.level && <span className="text-[9px] px-1.5 py-px rounded-full bg-white border border-warm-200 text-warm-600">{item.level}</span>}
        {item.audience && <span className="text-[9px] px-1.5 py-px rounded-full bg-orange-50 border border-orange-100 text-orange-800">{item.audience}</span>}
        {item.official && <span className="text-[9px] px-1.5 py-px rounded-full bg-warm-50 border border-warm-200 text-warm-500">{item.official}</span>}
      </div>
      {item.summary && (
        <p className="text-[11px] text-warm-700 mt-1.5 line-clamp-2 leading-snug" title={item.summary}>{item.summary}</p>
      )}
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {item.organizer && (
          <div className="flex gap-1 min-w-0 sm:col-span-2">
            <dt className="text-[9px] text-warm-500 shrink-0">主办方</dt>
            <dd className="text-[11px] text-warm-800 truncate">{item.organizer}</dd>
          </div>
        )}
        {item.labs.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-[9px] text-warm-500 mb-0.5">关联实训室</dt>
            <dd className="flex flex-wrap gap-0.5">
              {item.labs.map((l) => (
                <span key={l} className="text-[9px] px-1 py-px rounded bg-accent-primary/8 text-accent-primary">{shortLab(l)}</span>
              ))}
            </dd>
          </div>
        )}
        {item.jobs.length > 0 && (
          <div className="flex gap-1 min-w-0 sm:col-span-2">
            <dt className="text-[9px] text-warm-500 shrink-0">关联岗位</dt>
            <dd className="text-[11px] text-warm-700 truncate" title={item.jobs.join('、')}>{item.jobs.join('、')}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export function CompetitionCard({
  item,
  source,
  selected,
  onFocus,
  onSelect,
  onLabClick,
  compact = false,
}: {
  item: CompetitionItem
  source: 'job' | 'lab'
  selected?: boolean
  onFocus: (ref: EntityRef) => void
  onSelect?: () => void
  onLabClick?: (lab: string) => void
  compact?: boolean
}) {
  const ratingColor = RATING_COLORS[item.rating] ?? '#9e9e9e'
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect?.()
          onFocus({ kind: 'competition', id: item.name, label: item.name, subtitle: item.category })
        }}
        title={[item.category, item.audience, item.rating].filter(Boolean).join(' · ')}
        className={`w-full text-left px-2 py-1 rounded-md border transition ${
          selected
            ? 'bg-orange-50/90 border-orange-400/60 ring-1 ring-orange-300/20'
            : 'bg-white/90 border-warm-200 hover:border-orange-300/60'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className={`text-[8px] px-1 py-px rounded shrink-0 font-medium ${
            source === 'job' ? 'bg-amber-50 text-amber-800' : 'bg-orange-50 text-orange-800'
          }`}>
            {source === 'job' ? '岗' : '室'}
          </span>
          <p className="text-[11px] font-medium text-warm-900 truncate flex-1 min-w-0">{item.name}</p>
          <span
            className="shrink-0 text-[9px] px-1 py-px rounded"
            style={{ color: ratingColor, backgroundColor: `${ratingColor}18` }}
          >
            {item.rating || '—'}
          </span>
        </div>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.()
        onFocus({ kind: 'competition', id: item.name, label: item.name, subtitle: item.category })
      }}
      className={`w-full text-left px-2 py-1.5 rounded-md border transition ${
        selected
          ? 'bg-orange-50/90 border-orange-400/60 ring-1 ring-orange-300/20'
          : 'bg-white/90 border-warm-200 hover:border-orange-300/60'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="text-[11px] font-medium text-warm-900 truncate">{item.name}</p>
        <span
          className="shrink-0 text-[9px] px-1 py-px rounded"
          style={{ color: ratingColor, backgroundColor: `${ratingColor}18` }}
        >
          {item.rating || '—'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        <span className={`text-[9px] px-1 py-px rounded-full ${source === 'job' ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-orange-50 text-orange-800 border border-orange-100'}`}>
          {source === 'job' ? '岗位' : '实训室'}
        </span>
        {item.category && (
          <span className="text-[9px] px-1 py-px rounded-full bg-warm-50 text-warm-600 border border-warm-100 truncate max-w-full">
            {item.category}
          </span>
        )}
        {item.audience && (
          <span className="text-[9px] px-1 py-px rounded-full bg-warm-50 text-warm-500 border border-warm-100 truncate">
            {item.audience}
          </span>
        )}
      </div>
      {item.labs.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {item.labs.slice(0, 3).map((lab) => (
            <span
              key={lab}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onLabClick?.(lab) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onLabClick?.(lab) } }}
              className="text-[9px] px-1 py-px rounded bg-accent-primary/8 text-accent-primary hover:bg-accent-primary/15 cursor-pointer"
            >
              {shortLab(lab)}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

export function CertificateRow({
  item,
  selected,
  onFocus,
  onSelect,
}: {
  item: CertificateItem
  selected?: boolean
  onFocus: (ref: EntityRef) => void
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.()
        onFocus({ kind: 'certificate', id: item.fullName, label: item.shortName || item.fullName, subtitle: item.org })
      }}
      className={`w-full text-left px-2 py-1.5 rounded-md border transition flex items-center gap-2 ${
        selected
          ? 'bg-teal-50/90 border-teal-400/50 ring-1 ring-teal-300/20'
          : 'bg-white/90 border-warm-200 hover:border-teal-300/60'
      }`}
    >
      <Award size={14} className="text-teal-700 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-warm-900 truncate">{item.shortName || item.fullName}</p>
        <p className="text-[9px] text-warm-500 truncate">{item.org}{item.level ? ` · ${item.level}` : ''}</p>
        {item.field && <p className="text-[9px] text-warm-400 truncate">{item.field}</p>}
      </div>
    </button>
  )
}

export function JobLabContextChips({
  job,
  labs,
  selectedLabCanonical,
  onSelectLab,
  onFocus,
  compact = false,
}: {
  job: JobProfile
  labs: Lab[]
  selectedLabCanonical: string | null
  onSelectLab: (lab: string) => void
  onFocus: (ref: EntityRef) => void
  compact?: boolean
}) {
  const handleLabChip = (lab: string) => {
    const canonical = resolveLab(lab, labs)?.name ?? lab
    onSelectLab(canonical)
    onFocus({ kind: 'lab', id: canonical, label: canonical })
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${compact ? 'mb-1.5' : 'gap-1.5 mb-2'}`}>
      <span className={`inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 text-amber-900 ${
        compact ? 'text-[10px] px-1.5 py-px' : 'text-[11px] px-2 py-0.5'
      }`}>
        <Briefcase size={compact ? 10 : 12} />
        {job.name}
      </span>
      {job.labLinks.map(({ lab, level }) => {
        const canonical = resolveLab(lab, labs)?.name ?? lab
        const selected = selectedLabCanonical === canonical
        return (
          <button
            key={lab}
            type="button"
            onClick={() => handleLabChip(lab)}
            className={`inline-flex items-center gap-1 rounded-md border transition ${
              compact ? 'text-[10px] px-1.5 py-px' : 'text-[11px] px-2 py-0.5'
            } ${
              selected
                ? 'bg-accent-primary/12 border-accent-primary/35 text-accent-primary font-medium'
                : 'bg-white border-warm-200 text-warm-700 hover:border-accent-primary/25'
            }`}
          >
            <Building2 size={compact ? 10 : 12} />
            {shortLab(canonical)}
            {level === 'core' && <Star size={compact ? 8 : 10} className="text-amber-500 fill-amber-500" />}
          </button>
        )
      })}
    </div>
  )
}
