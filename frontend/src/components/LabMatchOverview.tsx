import { useMemo } from 'react'
import Chart, { warmChartBase, WARM_CHART } from './Chart'
import { MATCH_COLORS, type LabIntegration } from '../utils/integrate'

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

export default function LabMatchOverview({
  items,
  facultyLoaded,
  selectedLabName,
  onLabSelect,
}: {
  items: LabIntegration[]
  facultyLoaded: boolean
  selectedLabName?: string | null
  onLabSelect?: (item: LabIntegration) => void
}) {
  const compareChart = useMemo(() => {
    const chartItems = [...items]
      .filter((i) => i.courses.length > 0 || i.faculty.length > 0)
      .sort((a, b) => b.courses.length - a.courses.length)
      .slice(0, 14)
      .reverse()
    if (!chartItems.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['课程', '师资', '关联岗位', '竞赛'], top: 0, textStyle: { color: WARM_CHART.muted, fontSize: 10 } },
      grid: { left: 120, right: 16, top: 36, bottom: 12 },
      xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category' as const,
        data: chartItems.map((i) => shortLab(i.lab.name)),
        axisLabel: { fontSize: 9, color: WARM_CHART.muted },
      },
      series: [
        { name: '课程', type: 'bar' as const, data: chartItems.map((i) => i.courses.length), itemStyle: { color: WARM_CHART.primary, borderRadius: [0, 2, 2, 0] } },
        { name: '师资', type: 'bar' as const, data: chartItems.map((i) => i.faculty.length), itemStyle: { color: WARM_CHART.nodeLab, borderRadius: [0, 2, 2, 0] } },
        { name: '关联岗位', type: 'bar' as const, data: chartItems.map((i) => i.jobCount), itemStyle: { color: '#b8860b', borderRadius: [0, 2, 2, 0] } },
        { name: '竞赛', type: 'bar' as const, data: chartItems.map((i) => i.competitionCount), itemStyle: { color: '#c45c26', borderRadius: [0, 2, 2, 0] } },
      ],
    }
  }, [items])

  const matchStatusPie = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of items) {
      counts.set(i.matchLabel, (counts.get(i.matchLabel) ?? 0) + 1)
    }
    const pieData = [...counts.entries()].map(([name, value]) => ({ name, value }))
    if (!pieData.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '68%'],
        center: ['50%', '52%'],
        label: { fontSize: 10, color: WARM_CHART.muted },
        data: pieData,
      }],
    }
  }, [items])

  if (!items.length) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-warm-500">
        暂无实训室匹配数据
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 glass rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-warm-300">
          <h3 className="text-sm font-semibold text-warm-700">实训室要素匹配总览</h3>
          <p className="text-xs text-warm-500">点击行查看详情 · 含岗位关联与课师映射率</p>
        </div>
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-warm-50/95 backdrop-blur z-10">
              <tr className="border-b border-warm-300 text-warm-500 text-left text-xs">
                <th className="p-2.5">实训室</th>
                <th className="p-2.5">课程</th>
                <th className="p-2.5">师资</th>
                <th className="p-2.5">岗位</th>
                <th className="p-2.5">竞赛</th>
                <th className="p-2.5">证书</th>
                <th className="p-2.5">课师映射</th>
                <th className="p-2.5">厂商课</th>
                <th className="p-2.5">状态</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.lab.id}
                  onClick={() => onLabSelect?.(item)}
                  className={`border-b border-warm-200 transition text-xs ${
                    onLabSelect ? 'cursor-pointer hover:bg-warm-100' : ''
                  } ${selectedLabName === item.lab.name ? 'bg-accent-primary/10' : ''}`}
                >
                  <td className="p-2.5 font-medium max-w-[180px]">
                    <span className="text-warm-400 mr-1">#{item.lab.id}</span>
                    {shortLab(item.lab.name)}
                  </td>
                  <td className="p-2.5 text-accent-primary font-bold">{item.courses.length}</td>
                  <td className="p-2.5 text-accent-green font-bold">{item.faculty.length}</td>
                  <td className="p-2.5 text-warm-700">{item.jobCount || '—'}</td>
                  <td className="p-2.5 text-orange-600">{item.competitionCount || '—'}</td>
                  <td className="p-2.5 text-teal-700">{item.certificateCount || '—'}</td>
                  <td className="p-2.5">
                    <span className={item.strictCoveragePct >= 60 ? 'text-accent-green' : item.strictCoveragePct >= 30 ? 'text-accent-orange' : 'text-red-500'}>
                      {facultyLoaded ? `${item.strictCoveragePct}%` : '—'}
                    </span>
                  </td>
                  <td className="p-2.5 text-warm-600">{item.vendorCourses}</td>
                  <td className="p-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap ${MATCH_COLORS[item.matchLevel]}`}>
                      {item.matchLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-4">
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm text-warm-600 mb-2">课程 · 师资 · 岗位对比</h3>
          <Chart option={compareChart} height={200} />
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm text-warm-600 mb-2">匹配状态分布</h3>
          <Chart option={matchStatusPie} height={180} />
        </div>
      </div>
    </div>
  )
}
