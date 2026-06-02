import type { Course, GraphData, Lab, SharedCourse, VendorDetail } from './types'
import type { FacultyData } from './types/faculty'
import type { JobMapData } from './types/jobMap'
import type { CompCertData } from './types/compCert'

const API = '/api'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '请求失败')
  }
  return res.json()
}

export async function getData(): Promise<GraphData> {
  return fetchJson(`${API}/data`)
}

export async function getLabs(): Promise<Lab[]> {
  return fetchJson(`${API}/labs`)
}

export async function getLab(id: number): Promise<Lab & { courses: Course[] }> {
  return fetchJson(`${API}/labs/${id}`)
}

export async function getCourses(params?: Record<string, string | boolean>): Promise<Course[]> {
  const qs = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    })
  }
  const query = qs.toString()
  return fetchJson(`${API}/courses${query ? `?${query}` : ''}`)
}

export async function getVendorCourses(vendor?: string, lab?: string): Promise<VendorDetail[]> {
  const qs = new URLSearchParams()
  if (vendor) qs.set('vendor', vendor)
  if (lab) qs.set('lab', lab)
  const query = qs.toString()
  return fetchJson(`${API}/vendor-courses${query ? `?${query}` : ''}`)
}

export async function getSharedCourses(): Promise<SharedCourse[]> {
  return fetchJson(`${API}/shared-courses`)
}

export async function uploadExcel(file: File): Promise<{ message: string; meta: GraphData['meta'] }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '上传失败')
  }
  return res.json()
}

export async function reloadData(): Promise<void> {
  await fetch(`${API}/reload`, { method: 'POST' })
}

export async function getFacultyData(): Promise<FacultyData> {
  return fetchJson(`${API}/faculty/data`)
}

export async function uploadFacultyExcel(file: File): Promise<{ message: string; meta: FacultyData['meta'] }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/faculty/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '上传失败')
  }
  return res.json()
}

export async function reloadFacultyData(): Promise<void> {
  await fetch(`${API}/faculty/reload`, { method: 'POST' })
}

export async function getJobMapData(): Promise<JobMapData> {
  return fetchJson(`${API}/jobs/data`)
}

export async function uploadJobMapExcel(file: File): Promise<{ message: string; meta: JobMapData['meta'] }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/jobs/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '上传失败')
  }
  return res.json()
}

export async function reloadJobMapData(): Promise<void> {
  await fetch(`${API}/jobs/reload`, { method: 'POST' })
}

export async function getCompCertData(): Promise<CompCertData> {
  return fetchJson(`${API}/certs/data`)
}

export async function uploadCompCertExcel(file: File): Promise<{ message: string; meta: CompCertData['meta'] }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/certs/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '上传失败')
  }
  return res.json()
}

export async function reloadCompCertData(): Promise<void> {
  await fetch(`${API}/certs/reload`, { method: 'POST' })
}
