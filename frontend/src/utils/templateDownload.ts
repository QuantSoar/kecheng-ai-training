import { TEMPLATE_DOWNLOADS, TEMPLATE_FILENAMES } from '../templates/spec'
import { downloadCourseTemplate, downloadFacultyTemplate, downloadJobMapTemplate } from '../templates/generateTemplates'

export type TemplateKind = 'course' | 'faculty' | 'jobMap' | 'compCert' | 'curriculumDesign'

const GENERATORS: Partial<Record<TemplateKind, () => void>> = {
  course: downloadCourseTemplate,
  faculty: downloadFacultyTemplate,
  jobMap: downloadJobMapTemplate,
}

/** 优先下载 public/templates 静态文件，缺失时在浏览器内生成 */
export async function downloadTemplate(kind: TemplateKind): Promise<void> {
  const url = TEMPLATE_DOWNLOADS[kind]
  const filename = TEMPLATE_FILENAMES[kind]

  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (res.ok) {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      return
    }
  } catch {
    // fallback to client generation
  }

  GENERATORS[kind]?.()
}