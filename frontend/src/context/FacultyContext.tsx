import { createContext, useContext } from 'react'
import type { FacultyData } from '../types/faculty'
import type { DataMode } from '../services/dataSource'

export interface FacultyContextValue {
  data: FacultyData | null
  loading: boolean
  error: string | null
  mode: DataMode
  refresh: () => Promise<void>
}

export const FacultyContext = createContext<FacultyContextValue>({
  data: null,
  loading: true,
  error: null,
  mode: 'server',
  refresh: async () => {},
})
export function useFaculty() {
  return useContext(FacultyContext)
}
