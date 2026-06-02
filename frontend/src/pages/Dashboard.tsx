import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Building2, ChevronDown, ChevronRight } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import { useCompCert } from '../context/CompCertContext'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import CurriculumTierOverview from '../components/CurriculumTierOverview'
import LabMatchOverview from '../components/LabMatchOverview'
import { EcosystemBadges } from '../components/CrossLinkStrip'
import { Link } from 'react-router-dom'
import { buildCrossNavUrl } from '../utils/crossNav'
import { buildLabIntegrations } from '../utils/integrate'
import { JOB_CATEGORY_COLORS } from '../types/jobMap'
import { TYPE_COLORS } from '../types'

function isLabStats(items: unknown): items is { lab: string; count: number; ratio: number }[] {
  return Array.isArray(items) && items.length > 0 && 'lab' in items[0]
}

export default function Dashboard() {
  const { data, error } = useData()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()
  const { data: compCertData } = useCompCert()
  const navigate = useNavigate()
  const [labsOpen, setLabsOpen] = useState(false)

  const typeChart = useMemo(() => {
    if (!data) return {}
    const items = data.stats.type_distribution
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          itemStyle: { borderRadius: 6, borderColor: WARM_CHART.pieBorder, borderWidth: 2 },
          label: { color: WARM_CHART.muted, fontSize: 11 },
          data: items.map((t) => ({
            name: t.label,
            value: t.count,
            itemStyle: { color: TYPE_COLORS[t.type] || '#64748b' },
          })),
        },
      ],
    }
  }, [data])

  const facultyChart = useMemo(() => {
    if (!facultyData) return {}
    const raw = facultyData.stats.lab_match
    const labs = (isLabStats(raw) ? raw : [])
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .reverse()
    if (!labs.length) return {}
    return {
      ...warmChartBase(),
      grid: { left: 120, right: 20, top: 10, bottom: 20 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: labs.map((d) => d.lab.replace('实训室', '').replace('实验室', '')),
        axisLabel: { color: WARM_CHART.muted, fontSize: 10 },
      },
      series: [
        {
          type: 'bar',
          data: labs.map((d) => d.count),
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: WARM_CHART.nodeLab,
          },
        },
      ],
    }
  }, [facultyData])

  const jobChart = useMemo(() => {
    if (!jobMapData?.jobs.length) return {}
    const counts = new Map<string, number>()
    for (const job of jobMapData.jobs) {
      const cat = job.category || '未分类'
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }
    const items = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 60 },
      xAxis: {
        type: 'category',
        data: items.map(([cat]) => cat),
        axisLabel: { rotate: 20, color: WARM_CHART.muted, fontSize: 10 },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      series: [
        {
          type: 'bar',
          data: items.map(([, count]) => count),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: { dataIndex: number }) =>
              JOB_CATEGORY_COLORS[items[params.dataIndex][0]] ?? WARM_CHART.primary,
          },
        },
      ],
    }
  }, [jobMapData])

  const labIntegrations = useMemo(() => {
    if (!data) return []
    return buildLabIntegrations(data.labs, data.courses, facultyData?.teachers ?? [], {
      jobs: jobMapData?.jobs,
      compCert: compCertData,
    })
  }, [data, facultyData, jobMapData, compCertData])

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <p className="text-warm-500 text-sm mt-2">请将 xlsx 放到 data/ 目录，或前往「数据管理」下载模板填写后上传</p>
      </div>
    )
  }

  if (!data) return null

  const { meta } = data

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gradient">课程体系总览</h1>
        <p className="text-warm-600 mt-1">
          {meta.total_labs} 个实训室 · {meta.total_courses} 门课程 · {meta.vendor_count} 家合作厂商
        </p>
      </header>

      <EcosystemBadges
        variant="cards"
        labs={meta.total_labs}
        courses={meta.total_courses}
        faculty={facultyData?.meta.total_teachers}
        jobs={jobMapData?.meta.total_jobs}
        competitions={compCertData?.meta.total_competitions}
        certificates={compCertData?.meta.total_certificates}
        facultyLoaded={!!facultyData}
        jobsLoaded={!!jobMapData}
        certsLoaded={!!compCertData}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: '综合匹配', path: '/integrated', desc: '四表要素对比' },
          { label: '岗位图谱', path: '/jobs', desc: '岗位培养链路' },
          { label: '课程图谱', path: '/network', desc: '六元关系网络' },
          { label: '竞赛·证书', path: '/labs/compcerts', desc: '赛事与认证' },
        ].map(({ label, path, desc }) => (
          <Link
            key={path}
            to={path}
            className="glass rounded-xl p-3 border border-warm-300 hover:border-accent-primary/30 transition text-sm"
          >
            <span className="font-semibold text-warm-900">{label}</span>
            <p className="text-[11px] text-warm-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      <LabMatchOverview
        items={labIntegrations}
        facultyLoaded={!!facultyData}
        onLabSelect={(item) => navigate(buildCrossNavUrl(`/labs/${item.lab.id}`, { lab: item.lab.name }))}
      />

      <CurriculumTierOverview compact />

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm text-warm-600 mb-3">课程类型分布</h3>
          <Chart option={typeChart} height={260} />
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm text-warm-600 mb-3">师资分布</h3>
          {facultyData && Object.keys(facultyChart).length > 0 ? (
            <Chart option={facultyChart} height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-xs text-warm-500 text-center px-4">
              {facultyData ? '暂无匹配实训室的师资数据' : '上传 faculty.xlsx 后显示各实训室师资分布'}
            </div>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm text-warm-600 mb-3">岗位分布</h3>
          {jobMapData && Object.keys(jobChart).length > 0 ? (
            <Chart option={jobChart} height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-xs text-warm-500 text-center px-4">
              上传 jobs.xlsx 后显示岗位大类分布
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setLabsOpen((open) => !open)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-warm-100/60 transition"
        >
          <h3 className="text-sm font-semibold text-warm-800">
            {meta.total_labs} 个实训室
            <span className="ml-2 font-normal text-warm-500">点击{labsOpen ? '收起' : '展开'}浏览</span>
          </h3>
          {labsOpen ? (
            <ChevronDown size={18} className="text-warm-500 shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-warm-500 shrink-0" />
          )}
        </button>
        {labsOpen && (
          <div className="px-4 pb-4 border-t border-warm-300/80">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 pt-3">
              {data.labs.map((lab) => (
                <button
                  key={lab.id}
                  onClick={() => navigate(buildCrossNavUrl(`/labs/${lab.id}`, {}))}
                  className="rounded-lg border border-warm-300/80 bg-warm-50/50 px-2.5 py-2 text-left hover:border-accent-primary/40 hover:bg-accent-primary/5 transition group"
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] text-warm-400 truncate">#{lab.id}</span>
                    <span className="text-sm font-bold text-accent-primary shrink-0">{lab.course_counts.total}</span>
                  </div>
                  <h4 className="font-medium text-xs leading-tight line-clamp-2 text-warm-800 group-hover:text-accent-primary transition">
                    {lab.name.replace('实训室', '').replace('实验室', '')}
                  </h4>
                  <p className="mt-1 text-[10px] text-warm-500 truncate">
                    通{lab.course_counts.general} · 基{lab.course_counts.foundation} · 核{lab.course_counts.core} · 实{lab.course_counts.practice}
                    {lab.vendor_course_count > 0 && ` · 厂${lab.vendor_course_count}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

