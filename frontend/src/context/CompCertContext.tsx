import { createContext, useContext } from 'react'
import type { CompCertData } from '../types/compCert'
import type { DataMode } from '../services/dataSource'

export interface CompCertContextValue {
  data: CompCertData | null
  loading: boolean
  error: string | null
  mode: DataMode
  refresh: () => Promise<void>
}

export const CompCertContext = createContext<CompCertContextValue>({
  data: null,
  loading: true,
  error: null,
  mode: 'client',
  refresh: async () => {},
})

export function useCompCert() {
  return useContext(CompCertContext)
}
