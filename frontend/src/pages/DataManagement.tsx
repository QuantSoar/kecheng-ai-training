import { useRef, useState } from 'react'
import {
  Upload, RefreshCw, FileDown, Database, BookOpen, Users, Briefcase, CheckCircle2, AlertCircle, Trophy, Layers,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import { useCompCert } from '../context/CompCertContext'
import { useCurriculumDesign } from '../context/CurriculumDesignContext'
import { useDataManagement } from '../context/DataManagementContext'
import { downloadTemplate } from '../utils/templateDownload'

interface DataCardProps {
  title: string
  description: string
  icon: typeof BookOpen
  mode: string
  stat?: string
  error?: string | null
  uploading: boolean
  onUpload: (file: File) => Promise<void>
  onDownloadTemplate: () => void
  uploadLabel: string
  templateLabel: string
  showTemplate?: boolean
}

function DataCard({
  title,
  description,
  icon: Icon,
  mode,
  stat,
  error,
  uploading,
  onUpload,
  onDownloadTemplate,
  uploadLabel,
  templateLabel,
  showTemplate = true,
}: DataCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await onUpload(file)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="glass rounded-2xl p-5 border border-warm-300 flex flex-col gap-4 h-full">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-accent-primary/10 text-accent-primary shrink-0">
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-warm-900">{title}</h2>
          <p className="text-sm text-warm-600 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded-lg bg-warm-100 text-warm-600 border border-warm-200">
          数据源：{mode}
        </span>
        {stat && (
          <span className="px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 inline-flex items-center gap-1">
            <CheckCircle2 size={12} />
            {stat}
          </span>
        )}
        {error && (
          <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-auto">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/15 text-accent-primary border border-accent-primary/30 text-sm hover:bg-accent-primary/20 transition disabled:opacity-50"
        >
          <Upload size={16} />
          {uploading ? '上传中...' : uploadLabel}
        </button>
        {showTemplate && (
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass text-sm text-warm-700 hover:text-warm-900 transition"
          >
            <FileDown size={16} />
            {templateLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function modeLabel(mode: string) {
  if (mode === 'server') return '服务端'
  if (mode === 'cloud') return '云端数据'
  return '本地解析'
}

export default function DataManagement() {
  const { data, error: courseError, mode: courseMode } = useData()
  const { data: facultyData, error: facultyError, mode: facultyMode } = useFaculty()
  const { data: jobMapData, error: jobMapError, mode: jobMapMode } = useJobMap()
  const { data: compCertData, error: compCertError, mode: compCertMode } = useCompCert()
  const { data: curriculumData, error: curriculumError } = useCurriculumDesign()
  const {
    onUploadCourse,
    onUploadFaculty,
    onUploadJobMap,
    onUploadCompCert,
    onUploadCurriculum,
    onReload,
    courseMode: cm,
    facultyMode: fm,
    jobMapMode: jm,
    compCertMode: ccm,
    curriculumMode: cdm,
  } = useDataManagement()

  const [courseUploading, setCourseUploading] = useState(false)
  const [facultyUploading, setFacultyUploading] = useState(false)
  const [jobUploading, setJobUploading] = useState(false)
  const [certUploading, setCertUploading] = useState(false)
  const [curriculumUploading, setCurriculumUploading] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    window.setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleCourseUpload = async (file: File) => {
    setCourseUploading(true)
    try {
      await onUploadCourse(file)
      showSuccess(`课程 Excel「${file.name}」已导入并替换旧数据，各页面将只显示新内容`)
    } finally {
      setCourseUploading(false)
    }
  }

  const handleFacultyUpload = async (file: File) => {
    setFacultyUploading(true)
    try {
      await onUploadFaculty(file)
      showSuccess(`师资 Excel「${file.name}」已导入并替换旧师资数据`)
    } finally {
      setFacultyUploading(false)
    }
  }

  const handleJobUpload = async (file: File) => {
    setJobUploading(true)
    try {
      const mode = await onUploadJobMap(file)
      showSuccess(
        mode === 'server'
          ? `岗位映射 Excel「${file.name}」已替换旧数据并保存至后端`
          : `岗位映射 Excel「${file.name}」已替换当前会话数据（静态部署请同步到 data/jobs.xlsx）`,
      )
    } finally {
      setJobUploading(false)
    }
  }

  const handleCertUpload = async (file: File) => {
    setCertUploading(true)
    try {
      const mode = await onUploadCompCert(file)
      showSuccess(
        mode === 'server'
          ? `竞赛·证书 Excel「${file.name}」已替换旧数据并保存至后端`
          : `竞赛·证书 Excel「${file.name}」已替换当前会话数据（静态部署请同步到 data/certs.xlsx）`,
      )
    } finally {
      setCertUploading(false)
    }
  }

  const handleCurriculumUpload = async (file: File) => {
    setCurriculumUploading(true)
    try {
      await onUploadCurriculum(file)
      showSuccess(
        `实训室课程体系设计 Excel「${file.name}」已导入并替换当前数据（静态部署请运行 sync-data.bat 同步到 site/data/curriculum-design.xlsx）`,
      )
    } finally {
      setCurriculumUploading(false)
    }
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await onReload()
      showSuccess('全部数据已重新加载')
    } finally {
      setReloading(false)
    }
  }

  const readyCount = [data, facultyData, jobMapData, compCertData, curriculumData].filter(Boolean).length

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
          <Database size={26} className="text-accent-primary" />
          数据管理
        </h1>
        <p className="text-warm-600 text-sm mt-1">
          上传 Excel 后将<strong className="font-medium text-warm-800">整表替换</strong>当前数据（不合并、不保留历史版本），全站页面即时切换为新数据
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${data ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-warm-100 text-warm-500 border-warm-200'}`}>
            {data ? '✓' : '○'} 课程
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${facultyData ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-warm-100 text-warm-500 border-warm-200'}`}>
            {facultyData ? '✓' : '○'} 师资
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${jobMapData ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-warm-100 text-warm-500 border-warm-200'}`}>
            {jobMapData ? '✓' : '○'} 岗位映射
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${compCertData ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-warm-100 text-warm-500 border-warm-200'}`}>
            {compCertData ? '✓' : '○'} 竞赛·证书
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${curriculumData ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-warm-100 text-warm-500 border-warm-200'}`}>
            {curriculumData ? '✓' : '○'} 课程体系设计
          </span>
          <span className="text-xs text-warm-400">已就绪 {readyCount}/5</span>
        </div>
        {successMsg && (
          <p className="mt-3 text-sm text-accent-green bg-accent-green/10 border border-accent-green/25 rounded-lg px-3 py-2">
            {successMsg}
          </p>
        )}
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <DataCard
          title="课程数据"
          description="驱动总览、实训室、课程检索、厂商课程、共享网络、大屏演示等。建议最先上传。"
          icon={BookOpen}
          mode={modeLabel(cm)}
          stat={data ? `${data.meta.total_labs} 实训室 · ${data.meta.total_courses} 课程` : undefined}
          error={courseError}
          uploading={courseUploading}
          onUpload={handleCourseUpload}
          onDownloadTemplate={() => downloadTemplate('course')}
          uploadLabel="上传课程 Excel"
          templateLabel="下载课程模板"
        />

        <DataCard
          title="师资数据"
          description="驱动师资分析、综合匹配、大屏师资章节。上传后自动与课程实训室名称对齐。"
          icon={Users}
          mode={modeLabel(fm)}
          stat={facultyData ? `${facultyData.meta.total_teachers} 位师资 · 覆盖 ${facultyData.meta.total_labs} 个实训室` : undefined}
          error={facultyError}
          uploading={facultyUploading}
          onUpload={handleFacultyUpload}
          onDownloadTemplate={() => downloadTemplate('faculty')}
          uploadLabel="上传师资 Excel"
          templateLabel="下载师资模板"
        />

        <DataCard
          title="岗位映射"
          description="驱动岗位技能图谱、共享网络岗位联动、大屏岗位章节。开发模式下上传后持久化到后端 uploads/jobs/。"
          icon={Briefcase}
          mode={modeLabel(jm)}
          stat={jobMapData ? `${jobMapData.meta.total_jobs} 个岗位 · ${jobMapData.meta.total_skills} 条能力域` : undefined}
          error={jobMapError}
          uploading={jobUploading}
          onUpload={handleJobUpload}
          onDownloadTemplate={() => downloadTemplate('jobMap')}
          uploadLabel="上传岗位映射 Excel"
          templateLabel="下载岗位映射模板"
        />

        <DataCard
          title="竞赛·证书"
          description="驱动竞赛·证书中心：竞赛、证书、实训室/岗位竞赛映射与建设建议。静态部署请同步到 data/certs.xlsx。"
          icon={Trophy}
          mode={modeLabel(ccm)}
          stat={compCertData ? `${compCertData.meta.total_competitions} 项竞赛 · ${compCertData.meta.total_certificates} 张证书` : undefined}
          error={compCertError}
          uploading={certUploading}
          onUpload={handleCertUpload}
          onDownloadTemplate={() => downloadTemplate('compCert')}
          uploadLabel="上传竞赛·证书 Excel"
          templateLabel="下载竞赛·证书模板"
        />

        <DataCard
          title="实训室课程体系设计"
          description="驱动课程体系 Tab、实训室三层课程、岗位培养周期、综合匹配路线图。含企业培训/实习实训/产业学院与课程-岗位索引。"
          icon={Layers}
          mode={modeLabel(cdm)}
          stat={
            curriculumData
              ? `${curriculumData.meta.total_labs} 个实训室 · ${curriculumData.meta.total_track_courses} 门分层课程 · ${curriculumData.meta.total_job_links} 条岗位关联`
              : undefined
          }
          error={curriculumError}
          uploading={curriculumUploading}
          onUpload={handleCurriculumUpload}
          onDownloadTemplate={() => downloadTemplate('curriculumDesign')}
          uploadLabel="上传课程体系设计 Excel"
          templateLabel="下载课程体系设计模板"
        />
      </div>

      <div className="glass rounded-xl p-5 border border-warm-300">
        <h3 className="font-bold text-warm-900 mb-2">重新加载</h3>
        <p className="text-sm text-warm-600 mb-4">
          开发模式下从后端重新读取项目根目录 Excel；静态部署模式下从 data/ 目录重新拉取 xlsx（courses、faculty、jobs、certs、curriculum-design）。
          <strong className="font-medium text-warm-800"> 重新加载会覆盖当前浏览器内上传的临时数据。</strong>
        </p>
        <button
          type="button"
          onClick={handleReload}
          disabled={reloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass text-sm text-warm-700 hover:text-warm-900 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={reloading ? 'animate-spin' : ''} />
          {reloading ? '加载中...' : '重新加载全部数据'}
        </button>
        {(courseMode === 'cloud' || facultyMode === 'cloud' || jobMapMode === 'cloud' || compCertMode === 'cloud' || cdm === 'cloud') && (
          <p className="text-xs text-warm-400 mt-3">
            提示：纯静态部署时，也可直接将 xlsx 放到 site/data/ 后点击重新加载
          </p>
        )}
      </div>
    </div>
  )
}
