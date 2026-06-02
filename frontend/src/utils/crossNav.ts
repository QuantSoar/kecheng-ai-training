import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface CrossNavParams {
  lab?: string
  job?: string
}

export function buildCrossNavUrl(path: string, params: CrossNavParams): string {
  const q = new URLSearchParams()
  if (params.lab) q.set('lab', params.lab)
  if (params.job) q.set('job', params.job)
  const qs = q.toString()
  return qs ? `${path}?${qs}` : path
}

export function parseCrossNav(searchParams: URLSearchParams): CrossNavParams {
  const lab = searchParams.get('lab')?.trim() || undefined
  const job = searchParams.get('job')?.trim() || undefined
  return { lab, job }
}

/** 读写 URL 中的 lab / job，供多页面四表联动 */
export function useCrossNavState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => parseCrossNav(searchParams), [searchParams])

  const setParams = useCallback(
    (next: CrossNavParams, replace = true) => {
      const q = new URLSearchParams(searchParams)
      if (next.lab) q.set('lab', next.lab)
      else q.delete('lab')
      if (next.job) q.set('job', next.job)
      else q.delete('job')
      setSearchParams(q, { replace })
    },
    [searchParams, setSearchParams],
  )

  const setLab = useCallback(
    (lab: string | undefined) => setParams({ ...params, lab: lab || undefined }),
    [params, setParams],
  )

  const setJob = useCallback(
    (job: string | undefined) => setParams({ ...params, job: job || undefined }),
    [params, setParams],
  )

  return { params, setParams, setLab, setJob }
}

export function resolveLabId(labName: string, labs: { id: number; name: string }[]): number | null {
  const lab = labs.find((l) => l.name === labName)
  return lab?.id ?? null
}
