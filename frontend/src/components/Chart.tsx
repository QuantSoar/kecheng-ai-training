import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface ChartProps {
  option: EChartsOption
  height?: number | string
  className?: string
  onEvents?: Record<string, (params: unknown) => void>
}

export default function Chart({ option, height = 300, className, onEvents }: ChartProps) {
  return (
    <ReactECharts
      option={option}
      style={{ height }}
      className={className}
      opts={{ renderer: 'canvas' }}
      onEvents={onEvents}
    />
  )
}

export const WARM_CHART = {
  text: '#5c4a3d',
  muted: '#7a6555',
  splitLine: 'rgba(61, 44, 30, 0.08)',
  pieBorder: '#fffdf9',
  primary: '#c45c26',
  secondary: '#d97706',
  nodeCourse: '#b8860b',
  nodeLab: '#9a7b5f',
  nodeJob: '#c45c26',
} as const

export function warmChartBase(): Partial<EChartsOption> {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: WARM_CHART.text },
    legend: { textStyle: { color: WARM_CHART.muted } },
  }
}

/** @deprecated use warmChartBase */
export const darkChartBase = warmChartBase
