import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useCurriculumDesign } from '../context/CurriculumDesignContext'
import CurriculumTierOverview from '../components/CurriculumTierOverview'
import {
  CURRICULUM_TIERS,
  tierStatsForLabs,
  type CurriculumTierId,
} from '../types/curriculumTier'
import type { LabCurriculumSummary } from '../types/curriculumDesign'
import type { TrainingTrack } from '../types/curriculumDesign'

function tierToTrack(tierId: CurriculumTierId): TrainingTrack {
  return tierId === 'academy' ? 'industry' : tierId
}

function summaryCountField(tierId: CurriculumTierId): keyof Pick<
  LabCurriculumSummary,
  'enterpriseCount' | 'internshipCount' | 'industryCount'
> {
  if (tierId === 'enterprise') return 'enterpriseCount'
  if (tierId === 'internship') return 'internshipCount'
  return 'industryCount'
}

export default function CurriculumTiersPage() {
  const { data } = useData()
  const { data: design, loading: designLoading, error: designError } = useCurriculumDesign()
  const [activeTier, setActiveTier] = useState<CurriculumTierId>('enterprise')

  const tierCourseCounts = useMemo(() => {
    if (!design) return undefined
    return {
      enterprise: design.trackCourses.filter((c) => c.track === 'enterprise').length,
      internship: design.trackCourses.filter((c) => c.track === 'internship').length,
      academy: design.trackCourses.filter((c) => c.track === 'industry').length,
    }
  }, [design])

  const tierLabStats = useMemo(() => {
    if (design?.labSummaries.length) {
      return CURRICULUM_TIERS.map((tier) => {
        const field = summaryCountField(tier.id)
        const labCount = design.labSummaries.filter((s) => s[field] > 0).length
        return { tier, labCount }
      })
    }
    if (!data) return []
    return tierStatsForLabs(data.labs, data.courses)
  }, [design, data])

  const activeTierDef = CURRICULUM_TIERS.find((t) => t.id === activeTier) ?? CURRICULUM_TIERS[0]

  const labsForTier = useMemo(() => {
    if (!data) return []

    if (design?.labSummaries.length) {
      const field = summaryCountField(activeTierDef.id)
      const track = tierToTrack(activeTierDef.id)
      return design.labSummaries
        .filter((s) => s[field] > 0)
        .map((summary) => {
          const lab = data.labs.find((l) => l.name === summary.lab)
          if (!lab) return null
          const trackCourses = design.trackCourses.filter(
            (c) => c.lab === summary.lab && c.track === track,
          )
          const sampleNames = trackCourses.slice(0, 3).map((c) => c.courseName)
          return {
            lab,
            summary,
            courseCount: summary[field],
            sampleNames,
            coreJobCount: summary.coreJobs.length,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
        .sort((a, b) => b.courseCount - a.courseCount)
    }

    return data.labs
      .map((lab) => {
        const labCourses = data.courses.filter((c) => c.lab_name === lab.name)
        const hours = labCourses.reduce((s, c) => {
          const h = typeof c.hours === 'number' ? c.hours : parseInt(String(c.hours ?? ''), 10)
          return s + (Number.isFinite(h) ? h : 0)
        }, 0)
        return { lab, hours, courseCount: lab.course_counts.total, sampleNames: [] as string[], coreJobCount: 0, summary: null }
      })
      .filter((x) => x.courseCount > 0)
      .sort((a, b) => b.courseCount - a.courseCount)
  }, [data, design, activeTierDef])

  if (!data) return null

  return (
    <div className="space-y-8">
      {!design && !designLoading && (
        <div className="glass rounded-xl px-4 py-3 border border-amber-200 bg-amber-50/50 text-sm text-amber-800">
          未加载「实训室课程体系设计」表，当前为课程库学时估算。请将 xlsx 放到 data/curriculum-design.xlsx 后重新加载。
          {designError && <span className="block text-xs mt-1 text-amber-700">{designError}</span>}
        </div>
      )}

      <CurriculumTierOverview
        tierCourseCounts={tierCourseCounts}
        dataSource={design?.meta.source_file}
        showPrinciples={false}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {CURRICULUM_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setActiveTier(tier.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                activeTier === tier.id
                  ? 'text-white border-transparent'
                  : 'text-warm-600 border-warm-300 hover:bg-warm-100'
              }`}
              style={activeTier === tier.id ? { backgroundColor: tier.color } : undefined}
            >
              {tier.shortLabel}
              <span className="ml-1.5 opacity-80">
                ({tierLabStats.find((s) => s.tier.id === tier.id)?.labCount ?? 0} 室)
              </span>
              {tierCourseCounts && (
                <span className="ml-1 opacity-70 text-[11px]">
                  · {tierCourseCounts[tier.id]} 课
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {labsForTier.map(({ lab, courseCount, sampleNames, coreJobCount, summary }) => (
            <Link
              key={lab.id}
              to={`/labs/${lab.id}?tier=${activeTierDef.id}`}
              className="glass rounded-xl p-4 border border-warm-300 hover:border-accent-primary/30 transition block"
            >
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-medium text-warm-900 text-sm leading-snug">
                  {lab.name.replace('实训室', '').replace('实验室', '')}
                </h4>
                <span className="text-xs text-accent-primary shrink-0 font-medium">
                  {courseCount} 门
                </span>
              </div>
              <p className="text-xs text-warm-500 mt-2">
                {activeTierDef.shortLabel}体系
                {summary && ` · 全库 ${summary.totalCourses} 门`}
                {coreJobCount > 0 && ` · ${coreJobCount} 个核心岗位`}
              </p>
              {sampleNames.length > 0 && (
                <p className="text-[10px] text-warm-400 mt-1.5 line-clamp-2">
                  {sampleNames.join(' · ')}
                  {courseCount > sampleNames.length ? ' …' : ''}
                </p>
              )}
            </Link>
          ))}
        </div>
        {!labsForTier.length && (
          <p className="text-sm text-warm-500 text-center py-8">
            {design ? '该层体系暂无实训室课程配置' : '暂无实训室满足该层体系的学时要求'}
          </p>
        )}
      </div>
    </div>
  )
}
