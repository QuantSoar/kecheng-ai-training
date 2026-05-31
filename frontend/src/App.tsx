import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DataContext } from './context/DataContext'
import { FacultyContext } from './context/FacultyContext'
import { JobMapContext } from './context/JobMapContext'
import type { GraphData } from './types'
import type { FacultyData } from './types/faculty'
import type { JobMapData } from './types/jobMap'
import type { DataMode } from './services/dataSource'
import {
  loadCourseData,
  loadFacultyDataSafe,
  uploadCourseWithFallback,
  uploadFacultyWithFallback,
  reloadAllFromServer,
  renormalizeFaculty,
  resetBackendCache,
} from './services/dataSource'
import { loadJobMapData, uploadJobMapWithFallback, reloadJobMapWithFallback } from './services/jobMapDataSource'

import Layout from './components/Layout'
import LabHubLayout from './components/LabHubLayout'
import Dashboard from './pages/Dashboard'
import LabsPage from './pages/LabsPage'
import LabDetail from './pages/LabDetail'
import CourseSearch from './pages/CourseSearch'
import VendorCourses from './pages/VendorCourses'
import ShareNetwork from './pages/ShareNetwork'
import FacultyAnalysis from './pages/FacultyAnalysis'
import IntegratedAnalysis from './pages/IntegratedAnalysis'
import JobSkillMap from './pages/JobSkillMap'
import DataManagement from './pages/DataManagement'
import DemoMode from './pages/DemoMode'
import { DataManagementContext } from './context/DataManagementContext'

async function loadAllData() {
  let course: GraphData | null = null
  let courseMode: DataMode = 'client'
  let faculty: FacultyData | null = null
  let facultyMode: DataMode = 'client'
  let courseError: string | null = null
  let facultyError: string | null = null

  try {
    const courseResult = await loadCourseData()
    course = courseResult.data
    courseMode = courseResult.mode
  } catch (e) {
    if (e instanceof Error && e.message === 'OFFLINE_NO_DATA') {
      courseError = '未连接后端且无云端数据，请前往「数据管理」上传课程 Excel'
    } else if (e instanceof Error && e.message === 'SERVER_NO_DATA') {
      courseError = '后端已连接但未找到课程数据，请将 Excel 放到项目根目录后点「重新加载」'
    } else if (e instanceof Error) {
      courseError = e.message
    }
  }

  try {
    const facultyResult = await loadFacultyDataSafe(course?.labs.map((l) => l.name))
    if (facultyResult) {
      faculty = facultyResult.data
      facultyMode = facultyResult.mode
    }
  } catch (e) {
    facultyError = e instanceof Error ? e.message : '师资数据加载失败'
  }

  return { course, courseMode, faculty, facultyMode, courseError, facultyError }
}

export default function App() {
  const [data, setData] = useState<GraphData | null>(null)
  const [facultyData, setFacultyData] = useState<FacultyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [facultyLoading, setFacultyLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [facultyError, setFacultyError] = useState<string | null>(null)
  const [courseMode, setCourseMode] = useState<DataMode>('server')
  const [facultyMode, setFacultyMode] = useState<DataMode>('server')
  const [jobMapData, setJobMapData] = useState<JobMapData | null>(null)
  const [jobMapLoading, setJobMapLoading] = useState(true)
  const [jobMapError, setJobMapError] = useState<string | null>(null)
  const [jobMapMode, setJobMapMode] = useState<DataMode>('client')

  const refreshJobMap = useCallback(async () => {
    setJobMapLoading(true)
    setJobMapError(null)
    try {
      const result = await loadJobMapData()
      if (result) {
        setJobMapData(result.data)
        setJobMapMode(result.mode)
      }
    } catch (e) {
      setJobMapError(e instanceof Error ? e.message : '岗位映射数据加载失败')
    } finally {
      setJobMapLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setFacultyLoading(true)
    setJobMapLoading(true)
    setError(null)
    setFacultyError(null)
    setJobMapError(null)
    const result = await loadAllData()
    setData(result.course)
    setCourseMode(result.courseMode)
    setFacultyData(result.faculty)
    setFacultyMode(result.facultyMode)
    setError(result.courseError)
    setFacultyError(result.facultyError)
    try {
      const jobResult = await loadJobMapData()
      if (jobResult) {
        setJobMapData(jobResult.data)
        setJobMapMode(jobResult.mode)
      }
    } catch (e) {
      setJobMapError(e instanceof Error ? e.message : '岗位映射数据加载失败')
    }
    setLoading(false)
    setFacultyLoading(false)
    setJobMapLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, mode } = await loadCourseData()
      setData(result)
      setCourseMode(mode)
      if (facultyData && mode !== 'server') {
        setFacultyData(renormalizeFaculty(facultyData, result))
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'OFFLINE_NO_DATA') {
        setCourseMode('client')
        setError('未连接后端且无云端数据，请前往「数据管理」上传课程 Excel')
      } else if (e instanceof Error && e.message === 'SERVER_NO_DATA') {
        setCourseMode('server')
        setError('后端已连接但未找到课程数据，请将 Excel 放到项目根目录后点「重新加载」')
      } else if (e instanceof Error) {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [facultyData])

  const refreshFaculty = useCallback(async () => {
    setFacultyLoading(true)
    setFacultyError(null)
    try {
      const result = await loadFacultyDataSafe(data?.labs.map((l) => l.name))
      if (result) {
        setFacultyData(result.data)
        setFacultyMode(result.mode)
      } else {
        setFacultyMode(courseMode === 'cloud' ? 'cloud' : 'client')
      }
    } catch (e) {
      setFacultyError(e instanceof Error ? e.message : '师资数据加载失败')
    } finally {
      setFacultyLoading(false)
    }
  }, [data, courseMode])

  useEffect(() => {
    refreshAll()
    // 后端可能晚于前端启动，2 秒后再试一次
    const retry = window.setTimeout(() => {
      refreshAll()
    }, 2500)
    return () => window.clearTimeout(retry)
  }, [refreshAll])

  const handleUpload = async (file: File) => {
    const { data: parsed, mode } = await uploadCourseWithFallback(file)
    resetBackendCache()
    setData(parsed)
    setCourseMode(mode)
    setError(null)
    if (mode === 'server') {
      await refreshFaculty()
    } else if (facultyData) {
      setFacultyData(renormalizeFaculty(facultyData, parsed))
    }
  }

  const handleFacultyUpload = async (file: File) => {
    const canonicalLabs = data?.labs.map((l) => l.name)
    const { data: parsed, mode } = await uploadFacultyWithFallback(file, canonicalLabs)
    resetBackendCache()
    setFacultyData(parsed)
    setFacultyMode(mode)
    setFacultyError(null)
  }

  const handleJobMapUpload = async (file: File): Promise<DataMode> => {
    const { data: parsed, mode } = await uploadJobMapWithFallback(file)
    resetBackendCache()
    setJobMapData(parsed)
    setJobMapMode(mode)
    setJobMapError(null)
    return mode
  }

  const handleReload = async () => {
    const result = await reloadAllFromServer()
    if (result.course) {
      setData(result.course)
      setCourseMode(result.mode)
      setError(null)
    }
    if (result.faculty) {
      setFacultyData(result.faculty)
      setFacultyMode(result.mode)
      setFacultyError(null)
    }
    const jobReloaded = await reloadJobMapWithFallback()
    if (jobReloaded) {
      setJobMapData(jobReloaded.data)
      setJobMapMode(jobReloaded.mode)
      setJobMapError(null)
    }
    if (!result.course && !result.faculty && !jobReloaded) {
      await refreshAll()
    }
  }

  return (
    <DataManagementContext.Provider
      value={{
        onUploadCourse: handleUpload,
        onUploadFaculty: handleFacultyUpload,
        onUploadJobMap: handleJobMapUpload,
        onReload: handleReload,
        courseMode,
        facultyMode,
        jobMapMode,
      }}
    >
    <DataContext.Provider value={{ data, loading, error, mode: courseMode, refresh }}>
      <FacultyContext.Provider value={{ data: facultyData, loading: facultyLoading, error: facultyError, mode: facultyMode, refresh: refreshFaculty }}>
        <JobMapContext.Provider value={{ data: jobMapData, loading: jobMapLoading, error: jobMapError, mode: jobMapMode, refresh: refreshJobMap }}>
          <Routes>
            <Route path="/demo" element={<DemoMode />} />
            <Route
              path="/*"
              element={
                <Layout
                  courseMode={courseMode}
                  facultyMode={facultyMode}
                  jobMapMode={jobMapMode}
                >
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/labs" element={<LabHubLayout />}>
                      <Route index element={<LabsPage />} />
                      <Route path="courses" element={<CourseSearch embedded />} />
                      <Route path="vendors" element={<VendorCourses embedded />} />
                    </Route>
                    <Route path="/labs/:id" element={<LabDetail />} />
                    <Route path="/courses" element={<Navigate to="/labs/courses" replace />} />
                    <Route path="/vendors" element={<Navigate to="/labs/vendors" replace />} />
                    <Route path="/network" element={<ShareNetwork />} />
                    <Route path="/faculty" element={<FacultyAnalysis />} />
                    <Route path="/integrated" element={<IntegratedAnalysis />} />
                    <Route path="/jobs" element={<JobSkillMap />} />
                    <Route path="/data" element={<DataManagement />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </JobMapContext.Provider>
      </FacultyContext.Provider>
    </DataContext.Provider>
    </DataManagementContext.Provider>
  )
}
