import { Layers } from 'lucide-react'
import {
  CURRICULUM_PRINCIPLES,
  CURRICULUM_TIERS,
  TIER_FIT_LABEL,
  type CurriculumTier,
  type TierFitStatus,
} from '../types/curriculumTier'

interface CurriculumTierOverviewProps {
  /** 可选：某实训室总学时，用于显示匹配状态 */
  labHours?: number
  /** 紧凑模式用于 Dashboard */
  compact?: boolean
  /** 是否展示 01–04 设计原则卡片 */
  showPrinciples?: boolean
  /** 来自「实训室课程体系设计」表的总课程数（按层） */
  tierCourseCounts?: Partial<Record<import('../types/curriculumTier').CurriculumTierId, number>>
  /** 数据来源说明 */
  dataSource?: string
}

function FitBadge({ status }: { status: TierFitStatus }) {
  const styles: Record<TierFitStatus, string> = {
    fit: 'bg-accent-green/10 text-accent-green border-accent-green/25',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    exceed: 'bg-accent-primary/10 text-accent-primary border-accent-primary/25',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-lg border ${styles[status]}`}>
      {TIER_FIT_LABEL[status]}
    </span>
  )
}

function TierCard({
  tier,
  labHours,
  compact,
  courseCount,
}: {
  tier: CurriculumTier
  labHours?: number
  compact?: boolean
  courseCount?: number
}) {
  let fit: TierFitStatus | null = null
  if (labHours != null) {
    const [min, max] = tier.hourRange
    if (labHours >= min && labHours <= max) fit = 'fit'
    else if (labHours < min) fit = 'partial'
    else fit = 'exceed'
  }

  return (
    <div
      className={`glass rounded-2xl border border-warm-300 overflow-hidden ${compact ? 'p-4' : 'p-5'}`}
      style={{ borderTopWidth: 3, borderTopColor: tier.color }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className={`font-bold text-warm-900 ${compact ? 'text-sm' : 'text-base'}`}>{tier.label}</h3>
          <p className="text-xs text-warm-500 mt-0.5">
            {tier.period} · {tier.hours}
            {courseCount != null && (
              <span className="text-accent-primary ml-1">· 共 {courseCount} 门课</span>
            )}
          </p>
        </div>
        {fit && <FitBadge status={fit} />}
      </div>
      <dl className={`grid gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {[
          ['形式', tier.format],
          ['师资', tier.faculty],
          ['频率', tier.frequency],
          ['资料', tier.materials],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-warm-400 shrink-0 w-8">{k}</dt>
            <dd className="text-warm-700 leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function CurriculumTierOverview({
  labHours,
  compact,
  showPrinciples = true,
  tierCourseCounts,
  dataSource,
}: CurriculumTierOverviewProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers size={compact ? 18 : 22} className="text-accent-primary" />
        <div>
          <h2 className={`font-bold text-warm-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {dataSource ? '实训室三层课程体系' : '实训基地三层课程体系'}
          </h2>
          <p className="text-xs text-warm-500 mt-0.5">
            企业培训 · 实习实训 · 产业学院 — 按周期与学时梯度划分
            {dataSource && <span className="text-accent-primary ml-1">· 来源 {dataSource}</span>}
          </p>
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? 'md:grid-cols-3' : 'lg:grid-cols-3'}`}>
        {CURRICULUM_TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            labHours={labHours}
            compact={compact}
            courseCount={tierCourseCounts?.[tier.id]}
          />
        ))}
      </div>

      {!compact && showPrinciples && (
        <div className="grid md:grid-cols-2 gap-3">
          {CURRICULUM_PRINCIPLES.map((p) => (
            <div key={p.no} className="glass rounded-xl p-4 border border-warm-300 flex gap-3">
              <span className="text-2xl font-bold text-accent-primary/30 shrink-0">{p.no}</span>
              <div>
                <h4 className="font-semibold text-warm-900 text-sm">{p.title}</h4>
                <p className="text-sm text-warm-600 mt-1 leading-relaxed">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
