import { createContext, useContext } from 'react'
import type { GraphData } from '../types'
import type { DataMode } from '../services/dataSource'

interface DataContextValue {
  data: GraphData | null
  loading: boolean
  error: string | null
  mode: DataMode
  refresh: () => Promise<void>
}

export const DataContext = createContext<DataContextValue>({
  data: null,
  loading: true,
  error: null,
  mode: 'server',
  refresh: async () => {},
})
export function useData() {
  return useContext(DataContext)
}
