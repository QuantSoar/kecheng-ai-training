import { createContext, useContext } from 'react'
import type { CurriculumDesignData } from '../types/curriculumDesign'
import type { DataMode } from '../services/dataSource'

export interface CurriculumDesignContextValue {
  data: CurriculumDesignData | null
  loading: boolean
  error: string | null
  mode: DataMode
  refresh: () => Promise<void>
}

export const CurriculumDesignContext = createContext<CurriculumDesignContextValue>({
  data: null,
  loading: true,
  error: null,
  mode: 'client',
  refresh: async () => {},
})

export function useCurriculumDesign() {
  return useContext(CurriculumDesignContext)
}
