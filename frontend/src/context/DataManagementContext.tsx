import { createContext, useContext } from 'react'
import type { DataMode } from '../services/dataSource'

export interface DataManagementActions {
  onUploadCourse: (file: File) => Promise<void>
  onUploadFaculty: (file: File) => Promise<void>
  onUploadJobMap: (file: File) => Promise<DataMode>
  onReload: () => Promise<void>
  courseMode: DataMode
  facultyMode: DataMode
  jobMapMode: DataMode
}

export const DataManagementContext = createContext<DataManagementActions | null>(null)

export function useDataManagement() {
  const ctx = useContext(DataManagementContext)
  if (!ctx) throw new Error('useDataManagement must be used within DataManagementContext')
  return ctx
}
