import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import Chart, { warmChartBase, WARM_CHART } from './Chart'
import { TYPE_COLORS } from '../types'

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

const VENDOR_COLORS = ['#d97706', '#c45c26', '#b8860b', '#9a7b5f', '#6b8f3c', '#5b7fa5']

export default function LabOverviewCharts() {
  const { data } = useData()
  const navigate = useNavigate()

  const labBarOption = useMemo(() => {
    if (!data) return {}
    const list = [...data.labs].sort((a, b) => b.course_counts.total - a.course_counts.total).slice(0, 12).reverse()
    if (!list.length) return {}
    return {
      ...warmChartBase(),
      grid: { left: 96, right: 16, top: 8, bottom: 8 },
      tooltip: { trigger: 'axis', formatter: (p: { name: string; value: number } | { name: string; value: number }[]) => {
        const item = Array.isArray(p) ? p[0] : p
        return `${item.name}<br/>${item.value} 门课程`
      }},
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: list.map((l) => shortLab(l.name)),
        axisLabel: { color: WARM_CHART.muted, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: list.map((l) => l.course_counts.total),
        itemStyle: { color: WARM_CHART.primary, borderRadius: [0, 4, 4, 0] },
      }],
    }
  }, [data])

  const typePieOption = useMemo(() => {
    if (!data?.stats.type_distribution.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item', formatter: '{b}: {c}门 ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '48%'],
        itemStyle: { borderRadius: 4, borderColor: WARM_CHART.pieBorder, borderWidth: 2 },
        label: { color: WARM_CHART.muted, fontSize: 10 },
        data: data.stats.type_distribution.map((t) => ({
          name: t.label,
          value: t.count,
          itemStyle: { color: TYPE_COLORS[t.type] || '#64748b' },
        })),
      }],
    }
  }, [data])

  const vendorBarOption = useMemo(() => {
    if (!data?.stats.vendor_distribution.length) return {}
    const list = data.stats.vendor_distribution.slice(0, 8).reverse()
    return {
      ...warmChartBase(),
      grid: { left: 72, right: 12, top: 8, bottom: 8 },
      tooltip: { trigger: 'axis', formatter: '{b}: {c} 门' },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: list.map((v) => v.vendor),
        axisLabel: { color: WARM_CHART.muted, fontSize: 9 },
      },
      series: [{
        type: 'bar',
        data: list.map((v, i) => ({
          value: v.count,
          itemStyle: { color: VENDOR_COLORS[i % VENDOR_COLORS.length], borderRadius: [0, 4, 4, 0] },
        })),
      }],
    }
  }, [data])

  const handleLabClick = (params: unknown) => {
    const p = params as { name?: string }
    if (!p.name || !data) return
    const lab = data.labs.find((l) => shortLab(l.name) === p.name || (p.name && l.name.includes(p.name)))
    if (lab) navigate(`/labs/${lab.id}`)
  }

  if (!data) return null

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-warm-700 mb-1">各实训室课程规模</h3>
        <p className="text-[11px] text-warm-500 mb-2">按课程总量排序 · 点击可进入实训室详情</p>
        <Chart option={labBarOption} height={240} onEvents={{ click: handleLabClick }} />
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-warm-700 mb-1">课程类型构成</h3>
        <p className="text-[11px] text-warm-500 mb-2">全基地 {data.meta.total_courses} 门课程</p>
        <Chart option={typePieOption} height={240} />
      </div>
      {data.stats.vendor_distribution.length > 0 && (
        <div className="col-span-3 glass rounded-2xl p-4">
          <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
            <div>
              <h3 className="text-sm font-medium text-warm-700">厂商课程分布</h3>
              <p className="text-[11px] text-warm-500">共 {data.meta.total_vendor_courses} 门 · {data.meta.vendor_count} 家厂商</p>
            </div>
          </div>
          <Chart option={vendorBarOption} height={200} />
        </div>
      )}
    </div>
  )
}
