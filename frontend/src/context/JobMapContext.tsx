import { createContext, useContext } from 'react'
import type { JobMapData } from '../types/jobMap'
import type { DataMode } from '../services/dataSource'

export interface JobMapContextValue {
  data: JobMapData | null
  loading: boolean
  error: string | null
  mode: DataMode
  refresh: () => Promise<void>
}

export const JobMapContext = createContext<JobMapContextValue>({
  data: null,
  loading: true,
  error: null,
  mode: 'client',
  refresh: async () => {},
})

export function useJobMap() {
  return useContext(JobMapContext)
}
