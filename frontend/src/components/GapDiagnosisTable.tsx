import { useNavigate } from 'react-router-dom'
import { MATCH_COLORS, type LabIntegration } from '../utils/integrate'
import { buildCrossNavUrl } from '../utils/crossNav'

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

function gapHints(item: LabIntegration, facultyLoaded: boolean): string {
  const hints: string[] = []
  if (item.faculty.length < 3 && item.courses.length >= 10) {
    hints.push(`师资仅 ${item.faculty.length} 人，难覆盖 ${item.courses.length} 门课`)
  }
  if (item.strictCoveragePct < 40 && facultyLoaded) {
    hints.push(`课师映射 ${item.strictCoveragePct}%，建议补充 capable_courses`)
  }
  if (item.vendorRatioPct > 50) {
    hints.push(`厂商课占比 ${item.vendorRatioPct}%`)
  }
  if (item.jobCount > 0 && item.strictCoveragePct < 50) {
    hints.push(`关联 ${item.jobCount} 个岗位但映射偏弱`)
  }
  return hints.join('；') || '—'
}

export default function GapDiagnosisTable({
  items,
  facultyLoaded,
}: {
  items: LabIntegration[]
  facultyLoaded: boolean
}) {
  const navigate = useNavigate()

  return (
    <div className="glass rounded-2xl overflow-hidden border border-warm-300">
      <div className="px-4 py-3 border-b border-warm-300">
        <h3 className="text-sm font-semibold text-warm-800">缺口诊断</h3>
        <p className="text-xs text-warm-500 mt-0.5">
          共 {items.length} 个实训室存在师资缺口、课程偏重或课师映射偏弱（&lt;40%），建议优先改善
        </p>
      </div>
      {items.length === 0 ? (
        <p className="p-8 text-center text-accent-green text-sm">当前无明显缺口项，整体匹配良好</p>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-warm-50/95 backdrop-blur z-10">
              <tr className="border-b border-warm-300 text-warm-500 text-left text-xs">
                <th className="p-2.5">实训室</th>
                <th className="p-2.5">状态</th>
                <th className="p-2.5">课程</th>
                <th className="p-2.5">师资</th>
                <th className="p-2.5">课师映射</th>
                <th className="p-2.5">关联岗位</th>
                <th className="p-2.5 min-w-[200px]">诊断要点</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.lab.id}
                  onClick={() => navigate(buildCrossNavUrl(`/labs/${item.lab.id}`, { lab: item.lab.name }))}
                  className="border-b border-warm-200 hover:bg-warm-100 cursor-pointer transition text-xs"
                >
                  <td className="p-2.5 font-medium max-w-[140px]">
                    <span className="text-warm-400 mr-1">#{item.lab.id}</span>
                    {shortLab(item.lab.name)}
                  </td>
                  <td className="p-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap ${MATCH_COLORS[item.matchLevel]}`}>
                      {item.matchLabel}
                    </span>
                  </td>
                  <td className="p-2.5 text-accent-primary font-bold">{item.courses.length}</td>
                  <td className="p-2.5 text-accent-green font-bold">{item.faculty.length}</td>
                  <td className="p-2.5">
                    <span className={item.strictCoveragePct >= 60 ? 'text-accent-green' : item.strictCoveragePct >= 30 ? 'text-accent-orange' : 'text-red-500'}>
                      {facultyLoaded ? `${item.strictCoveragePct}%` : '—'}
                    </span>
                  </td>
                  <td className="p-2.5">{item.jobCount || '—'}</td>
                  <td className="p-2.5 text-warm-600 leading-relaxed max-w-xs">
                    {gapHints(item, facultyLoaded)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
