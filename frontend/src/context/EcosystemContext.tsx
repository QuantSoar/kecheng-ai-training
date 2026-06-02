import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from './DataContext'
import { useFaculty } from './FacultyContext'
import { useJobMap } from './JobMapContext'
import { useCompCert } from './CompCertContext'
import {
  buildEcosystemIndexes,
  queryRelations,
  searchEntities,
  type EntityBundle,
  type EntityRef,
  type EcosystemIndexes,
  type EcosystemSources,
} from '../utils/ecosystemIndex'

interface EcosystemContextValue {
  sources: EcosystemSources | null
  indexes: EcosystemIndexes | null
  focus: EntityRef | null
  bundle: EntityBundle | null
  setFocus: (ref: EntityRef | null) => void
  search: (q: string) => EntityRef[]
  ready: { courses: boolean; faculty: boolean; jobs: boolean; certs: boolean }
}

const EcosystemContext = createContext<EcosystemContextValue>({
  sources: null,
  indexes: null,
  focus: null,
  bundle: null,
  setFocus: () => {},
  search: () => [],
  ready: { courses: false, faculty: false, jobs: false, certs: false },
})

export function useEcosystem() {
  return useContext(EcosystemContext)
}

function refToParams(ref: EntityRef | null): Record<string, string> {
  if (!ref) return {}
  switch (ref.kind) {
    case 'job': return { job: ref.id, focusKind: 'job', focusId: ref.id }
    case 'lab': return { lab: ref.id, focusKind: 'lab', focusId: ref.id }
    case 'course': return { courseId: ref.id, focusKind: 'course', focusId: ref.id }
    case 'faculty': return { facultyId: ref.id, focusKind: 'faculty', focusId: ref.id }
    case 'competition': return { competition: ref.id, focusKind: 'competition', focusId: ref.id }
    case 'certificate': return { certificate: ref.id, focusKind: 'certificate', focusId: ref.id }
  }
}

function paramsToRef(params: URLSearchParams, sources: EcosystemSources | null): EntityRef | null {
  if (!sources) return null
  const kind = params.get('focusKind')
  const id = params.get('focusId')
  if (kind && id) {
    const labels: Record<string, string> = {
      job: sources.jobs.find((j) => j.name === id)?.name ?? id,
      lab: sources.labs.find((l) => l.name === id)?.name ?? id,
      course: sources.courses.find((c) => String(c.id) === id)?.name ?? id,
      faculty: sources.teachers.find((t) => String(t.id) === id)?.name ?? id,
      competition: id,
      certificate: id,
    }
    return { kind: kind as EntityRef['kind'], id, label: labels[kind] ?? id }
  }
  const job = params.get('job')
  if (job) return { kind: 'job', id: job, label: job }
  const lab = params.get('lab')
  if (lab) return { kind: 'lab', id: lab, label: lab }
  const courseId = params.get('courseId')
  if (courseId) {
    const c = sources.courses.find((x) => String(x.id) === courseId)
    if (c) return { kind: 'course', id: courseId, label: c.name }
  }
  const facultyId = params.get('facultyId')
  if (facultyId) {
    const t = sources.teachers.find((x) => String(x.id) === facultyId)
    if (t) return { kind: 'faculty', id: facultyId, label: t.name }
  }
  const competition = params.get('competition')
  if (competition) return { kind: 'competition', id: competition, label: competition }
  const certificate = params.get('certificate')
  if (certificate) return { kind: 'certificate', id: certificate, label: certificate }
  return null
}

export function EcosystemProvider({ children }: { children: ReactNode }) {
  const { data } = useData()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()
  const { data: compCertData } = useCompCert()
  const [searchParams, setSearchParams] = useSearchParams()

  const sources = useMemo((): EcosystemSources | null => {
    if (!data) return null
    return {
      labs: data.labs,
      courses: data.courses,
      teachers: facultyData?.teachers ?? [],
      jobs: jobMapData?.jobs ?? [],
      labCourseRows: jobMapData?.labCourseRows ?? [],
      compCert: compCertData,
    }
  }, [data, facultyData, jobMapData, compCertData])

  const indexes = useMemo(() => (sources ? buildEcosystemIndexes(sources) : null), [sources])

  const focus = useMemo(() => paramsToRef(searchParams, sources), [searchParams, sources])

  const bundle = useMemo(() => {
    if (!focus || !sources || !indexes) return null
    return queryRelations(focus, sources, indexes)
  }, [focus, sources, indexes])

  const setFocus = useCallback(
    (ref: EntityRef | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const k of ['focusKind', 'focusId', 'job', 'lab', 'courseId', 'facultyId', 'competition', 'certificate']) {
          next.delete(k)
        }
        if (ref) {
          Object.entries(refToParams(ref)).forEach(([k, v]) => next.set(k, v))
        }
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const search = useCallback(
    (q: string) => (sources ? searchEntities(q, sources) : []),
    [sources],
  )

  const value = useMemo(
    (): EcosystemContextValue => ({
      sources,
      indexes,
      focus,
      bundle,
      setFocus,
      search,
      ready: {
        courses: !!data,
        faculty: !!facultyData,
        jobs: !!jobMapData,
        certs: !!compCertData,
      },
    }),
    [sources, indexes, focus, bundle, setFocus, search, data, facultyData, jobMapData, compCertData],
  )

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>
}
