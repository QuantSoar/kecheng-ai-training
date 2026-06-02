import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Award, Users, Briefcase, BookOpen, ExternalLink, Layers } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import { useCompCert } from '../context/CompCertContext'
import { useCurriculumDesign } from '../context/CurriculumDesignContext'
import { buildLabIntegrations, buildLabJobIndex } from '../utils/integrate'
import {
  detailedCompetitionsForLab,
  detailedCertificatesForLab,
} from '../utils/certLink'
import { buildCrossNavUrl } from '../utils/crossNav'
import { MATCH_COLORS } from '../utils/integrate'
import type { LabIntegration } from '../utils/integrate'

import type { JobMapData } from '../types/jobMap'
import type { CurriculumDesignData } from '../types/curriculumDesign'
import type { Lab } from '../types'

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

function buildLabJobLists(
  labs: Lab[],
  jobMapData: JobMapData | null | undefined,
  design: CurriculumDesignData | null | undefined,
) {
  const map = new Map<string, { name: string; level: string }[]>()
  for (const lab of labs) {
    const names = new Map<string, string>()
    if (jobMapData) {
      const idx = buildLabJobIndex(jobMapData.jobs, labs)
      for (const j of idx.get(lab.name) ?? []) names.set(j, '岗位映射')
    }
    const summary = design?.labSummaries.find((s) => s.lab === lab.name)
    if (summary) {
      for (const j of summary.coreJobs) names.set(j, '核心岗位')
      for (const j of summary.importantJobs) if (!names.has(j)) names.set(j, '重要岗位')
      for (const j of summary.basicJobs) if (!names.has(j)) names.set(j, '基础岗位')
    }
    map.set(
      lab.name,
      [...names.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
        .map(([name, level]) => ({ name, level })),
    )
  }
  return map
}

export default function LabResourceSummaryTable() {
  const { data } = useData()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()
  const { data: compCertData } = useCompCert()
  const { data: design } = useCurriculumDesign()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const integrations = useMemo(() => {
    if (!data) return []
    return buildLabIntegrations(data.labs, data.courses, facultyData?.teachers ?? [], {
      jobs: jobMapData?.jobs,
      compCert: compCertData,
    })
  }, [data, facultyData, jobMapData, compCertData])

  const selected = useMemo(
    () => integrations.find((i) => i.lab.id === selectedId) ?? null,
    [integrations, selectedId],
  )

  const jobListsByLab = useMemo(() => {
    if (!data) return new Map<string, { name: string; level: string }[]>()
    return buildLabJobLists(data.labs, jobMapData, design)
  }, [data, jobMapData, design])

  const selectedDetail = useMemo(() => {
    if (!selected || !data) return null
    const labName = selected.lab.name
    return {
      jobs: jobListsByLab.get(labName) ?? [],
      competitions: compCertData
        ? detailedCompetitionsForLab(labName, compCertData, data.labs)
        : [],
      certificates: compCertData
        ? detailedCertificatesForLab(labName, compCertData, data.labs)
        : [],
      faculty: facultyData?.teachers.filter((t) => t.lab_list.includes(labName)) ?? [],
      courses: selected.courses,
      designSummary: design?.labSummaries.find((s) => s.lab === labName) ?? null,
    }
  }, [selected, data, jobListsByLab, compCertData, facultyData, design])

  if (!data) return null

  const handleRowClick = (item: LabIntegration) => {
    setSelectedId((prev) => (prev === item.lab.id ? null : item.lab.id))
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl overflow-hidden border border-warm-300">
        <div className="px-4 py-3 border-b border-warm-300">
          <h3 className="text-sm font-semibold text-warm-800 flex items-center gap-2">
            <Layers size={16} className="text-accent-primary" />
            实训室 · 岗位 · 课程 · 证书 · 竞赛 综合统计
          </h3>
          <p className="text-xs text-warm-500 mt-0.5">点击实训室行展开要素详情，或进入实训室详情页</p>
        </div>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-warm-50/95 backdrop-blur z-10">
              <tr className="border-b border-warm-300 text-warm-500 text-left text-xs">
                <th className="p-2.5 w-8" />
                <th className="p-2.5">实训室</th>
                <th className="p-2.5">课程</th>
                <th className="p-2.5">岗位</th>
                <th className="p-2.5">竞赛</th>
                <th className="p-2.5">证书</th>
                <th className="p-2.5">师资</th>
                <th className="p-2.5">状态</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((item) => {
                const jobCount = (jobListsByLab.get(item.lab.name)?.length ?? 0) || item.jobCount
                const active = selectedId === item.lab.id
                return (
                  <tr
                    key={item.lab.id}
                    onClick={() => handleRowClick(item)}
                    className={`border-b border-warm-200 cursor-pointer transition text-xs ${
                      active ? 'bg-accent-primary/10' : 'hover:bg-warm-100'
                    }`}
                  >
                    <td className="p-2.5 text-warm-400">#{item.lab.id}</td>
                    <td className="p-2.5 font-medium max-w-[160px]">{shortLab(item.lab.name)}</td>
                    <td className="p-2.5 text-accent-primary font-bold">{item.courses.length}</td>
                    <td className="p-2.5 text-warm-800">{jobCount || '—'}</td>
                    <td className="p-2.5 text-orange-600">{item.competitionCount || '—'}</td>
                    <td className="p-2.5 text-teal-700">{item.certificateCount || '—'}</td>
                    <td className="p-2.5 text-accent-green">{item.faculty.length || '—'}</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap ${MATCH_COLORS[item.matchLevel]}`}>
                        {item.matchLabel}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && selectedDetail && (
        <div className="glass rounded-2xl p-4 border border-accent-primary/20 space-y-4 animate-fade-in-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-warm-900">{selected.lab.name}</h3>
              <p className="text-xs text-warm-500 mt-0.5">
                {selected.courses.length} 门课程
                {selectedDetail.designSummary && (
                  <span className="text-accent-primary ml-1">
                    · 设计表 {selectedDetail.designSummary.totalCourses} 门（企{selectedDetail.designSummary.enterpriseCount}
                    /实{selectedDetail.designSummary.internshipCount}
                    /产{selectedDetail.designSummary.industryCount}）
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(buildCrossNavUrl(`/labs/${selected.lab.id}`, { lab: selected.lab.name }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-accent-primary/10 text-accent-primary border border-accent-primary/25 hover:bg-accent-primary/15"
            >
              实训室详情 <ExternalLink size={12} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {selectedDetail.jobs.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Briefcase size={12} className="text-accent-primary" />
                  关联岗位 ({selectedDetail.jobs.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {selectedDetail.jobs.map(({ name, level }) => (
                    <Link
                      key={name}
                      to={buildCrossNavUrl('/jobs', { job: name, lab: selected.lab.name })}
                      title={level}
                      className="px-2 py-1 rounded-lg bg-accent-primary/10 text-[11px] text-accent-primary border border-accent-primary/15 hover:bg-accent-primary/15"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {selectedDetail.courses.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <BookOpen size={12} className="text-accent-primary" />
                  课程 ({selectedDetail.courses.length})
                </h4>
                <div className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {selectedDetail.courses.slice(0, 12).map((c) => (
                    <p key={c.id} className="text-[11px] text-warm-700 truncate px-2 py-0.5 rounded bg-warm-100" title={c.name}>
                      {c.name}
                    </p>
                  ))}
                  {selectedDetail.courses.length > 12 && (
                    <p className="text-[10px] text-warm-400 px-2">另有 {selectedDetail.courses.length - 12} 门…</p>
                  )}
                </div>
              </div>
            )}
            {selectedDetail.competitions.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Trophy size={12} className="text-[#e65100]" />
                  关联竞赛 ({selectedDetail.competitions.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {selectedDetail.competitions.map((c) => (
                    <span key={c.id} className="px-2 py-1 rounded-lg bg-[#e65100]/10 text-[11px] text-[#bf360c] border border-[#e65100]/15">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedDetail.certificates.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Award size={12} className="text-[#00897b]" />
                  关联证书 ({selectedDetail.certificates.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {selectedDetail.certificates.map((c) => (
                    <span key={c.id} className="px-2 py-1 rounded-lg bg-[#00897b]/10 text-[11px] text-[#00695c] border border-[#00897b]/15">
                      {c.shortName || c.fullName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedDetail.faculty.length > 0 && (
              <div className="sm:col-span-2 xl:col-span-4">
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Users size={12} className="text-accent-green" />
                  关联师资 ({selectedDetail.faculty.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto scrollbar-thin">
                  {selectedDetail.faculty.slice(0, 24).map((t) => (
                    <span key={t.id} title={`${t.title_dim} · ${t.level}级`} className="px-2 py-1 rounded-lg bg-accent-green/10 text-[11px] text-accent-green border border-accent-green/20">
                      {t.name}
                    </span>
                  ))}
                  {selectedDetail.faculty.length > 24 && (
                    <span className="text-[10px] text-warm-400 self-center">+{selectedDetail.faculty.length - 24}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
