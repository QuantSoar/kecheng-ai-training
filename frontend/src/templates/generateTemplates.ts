/**
 * 浏览器端生成 Excel 模板（与 backend/generate_templates.py 结构一致）
 * 静态 public/templates/ 文件缺失时作为备用下载方式
 */
import * as XLSX from 'xlsx'
import {
  COURSE_DETAIL_HEADERS,
  VENDOR_HEADERS,
  OVERVIEW_HEADERS,
  LAB_NAME_HEADERS,
  STANDARD_LABS,
  FACULTY_HEADERS,
  JOB_MATRIX_HEADERS,
  JOB_MATRIX_LAB_COLUMNS,
  JOB_SKILL_HEADERS,
  JOB_LAB_COURSE_HEADERS,
  JOB_GAP_HEADERS,
} from './spec'

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}

function aoaSheet(data: unknown[][], name: string): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(data)
  return ws
}

export function downloadCourseTemplate() {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['AI 课程图谱 — 课程 Excel 上传模板'],
    [''],
    ['【必填】全部课程明细 — 驱动总览、实训室、课程检索、共享网络、大屏'],
    ['【建议填】各个厂商课程体系 — 厂商课程页长描述、硬件、课时详情'],
    ['【可选】课程体系总览 / 实训室名称 / 统计汇总 — 不填也会从明细自动汇总'],
    [''],
    ['课程类型：通识课程 / 专业基础课 / 专业核心课 / 专业实践课'],
    ['厂商课在「课程来源」标注，如：厂商课程/华为、厂商课程/华清智言'],
  ], '填写说明'), '填写说明')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['24个实训室课程体系建设 — 全部课程明细'],
    ['课程类型：通识课程 / 专业基础课 / 专业核心课 / 专业实践课  |  厂商课请在「课程来源」标注'],
    [],
    [...COURSE_DETAIL_HEADERS],
    ['1  人工智能应用开发实训室'],
    [1, '人工智能应用开发实训室', '专业基础课', '操作系统原理', 48, '《计算机操作系统》(第4版)', 'Linux虚拟机', '高校核心课', ''],
    [2, '人工智能应用开发实训室', '专业实践课', '昇腾AI行业应用开发综合实训', 64, '《昇腾AI应用开发实战》', '华为Atlas', '厂商课程/华为', '厂商课示例'],
  ], '全部课程明细'), '全部课程明细')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['厂商课程详情（与全部课程明细按 实训室+课程名 关联）'],
    [],
    [...VENDOR_HEADERS],
    [1, '人工智能应用开发实训室', '', '昇腾AI行业应用开发综合实训', '面向昇腾平台的行业 AI 应用开发综合实训。', '专业实践课', '', '是', '华为Atlas 500 Pro', 64, 16, 48, '华为', '模型训练与部署', 'AI应用开发工程师'],
  ], '各个厂商课程体系'), '各个厂商课程体系')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['课程体系总览（可选，系统也会从明细自动统计）'],
    [],
    [...OVERVIEW_HEADERS],
    ['（示例，请按实际填写或留空）'],
  ], '课程体系总览'), '课程体系总览')

  const labRows: unknown[][] = [
    ['标准实训室名称对照表（建议与明细、师资表保持一致）'],
    [],
    [...LAB_NAME_HEADERS],
    ...STANDARD_LABS.map((lab, i) => [i + 1, lab, '']),
  ]
  XLSX.utils.book_append_sheet(wb, aoaSheet(labRows, '实训室名称'), '实训室名称')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['统计汇总（可选，系统会从明细重新计算）'],
    [],
    ['课程类型分布'],
    ['类型', '数量', '占比'],
  ], '统计汇总'), '统计汇总')

  downloadWorkbook(wb, '课程图谱上传模板.xlsx')
}

export function downloadFacultyTemplate() {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['AI 课程图谱 — 师资 Excel 上传模板'],
    [''],
    ['【必填】师资多维分析总表 — 驱动师资分析、综合匹配、大屏'],
    ['【可选】其余 Sheet — 不填则系统从总表自动计算'],
    [''],
    ['表头在第 4 行；「匹配实训室」须与课程 Excel 标准名称一致'],
    ['「推荐优先级」建议：85分-强烈推荐'],
  ], '填写说明'), '填写说明')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['师资多维分析总表'],
    ['第 4 行为表头，第 5 行起填数据'],
    [],
    [...FACULTY_HEADERS],
    [1, '张三', '男', '博士', '某某大学', '计算机科学', '副教授', '高校', '副教授', '高', '10年+高校教学', '华为认证', '可排课', '深度学习', '人工智能', 'PyTorch,昇腾', '人工智能应用开发实训室、具身智能实训室', 2, '有', '兼职', '中', '85分-强烈推荐', '高校', '某某大学', '昇腾AI', 'HCIA-AI', '长期从事 AI 教学……', 'AI模型部署', '有', ''],
  ], '师资多维分析总表'), '师资多维分析总表')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['TOP20 推荐优先级（可选）'],
    [],
    ['排名', '姓名', '推荐优先级', '职称维度', '来源维度', '推荐方类型', '匹配实训室', '关键词'],
  ], 'TOP20推荐优先级'), 'TOP20推荐优先级')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['实训室师资匹配统计（可选）'],
    [],
    ['实训室名称', '匹配师资数量', '匹配率'],
  ], '实训室师资匹配'), '实训室师资匹配')

  downloadWorkbook(wb, '师资多维分析上传模板.xlsx')
}

export function downloadJobMapTemplate() {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['AI 课程图谱 — 岗位映射 Excel 上传模板'],
    [''],
    ['【必填】岗位-实训室映射矩阵 — 驱动岗位列表与实训室关联'],
    ['【必填】岗位能力分层拆解 — 驱动岗位技能图谱展示'],
    ['【建议填】实训室-岗位-课程三对照 — 驱动课程/师资联动区块'],
    ['【可选】信息缺口与补充建议'],
    [''],
    ['映射矩阵实训室列填：● 核心 / ◐ 重要 / ○ 基础，留空表示无关联'],
    ['「核心课程」「推荐课程」多个时用顿号、逗号分隔，须与课程 Excel 名称尽量一致'],
  ], '填写说明'), '填写说明')

  const matrixHeader = [...JOB_MATRIX_HEADERS, ...JOB_MATRIX_LAB_COLUMNS]
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['岗位-实训室映射矩阵'],
    ['实训室列使用简称；关联符号：● 核心 / ◐ 重要 / ○ 基础'],
    [],
    matrixHeader,
    [1, '基础设施类', '智算中心运维工程师', 'Linux,GPU,集群', '高', '○', '●', '◐', ''],
    [2, '核心技术类', 'AI平台工程师', 'K8s,容器,调度', '高', '●', '◐', '●', '○'],
  ], '岗位-实训室映射矩阵'), '岗位-实训室映射矩阵')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['岗位能力分层拆解'],
    [],
    [...JOB_SKILL_HEADERS],
    [1, '智算中心运维工程师', '基础设施类', '系统运维能力', 'Linux基础命令与系统管理', '集群监控与容量规划', '架构设计与自动化运维', '高性能智算实训室', 'Linux系统管理、云计算基础'],
    [2, '智算中心运维工程师', '基础设施类', '故障排查与优化', '硬件故障定位', '性能调优与日志分析', '智能运维体系建设', '高性能智算实训室', 'AI超算集群搭建与运维实训'],
  ], '岗位能力分层拆解'), '岗位能力分层拆解')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['实训室-岗位-课程三对照'],
    [],
    [...JOB_LAB_COURSE_HEADERS],
    [1, '高性能智算实训室', '系统运维', '智算中心运维工程师', 'AI超算集群搭建与运维实训、智算中心资源调度与优化实训', '专业实践课', '●', 'Linux运维/GPU集群/分布式存储', '基础设施类'],
  ], '实训室-岗位-课程三对照'), '实训室-岗位-课程三对照')

  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ['信息缺口与补充建议（可选）'],
    [],
    [...JOB_GAP_HEADERS],
    [1, '能力域覆盖', '部分岗位能力域行数较少', '岗位图谱展示', '中', '在「岗位能力分层拆解」中为岗位增加多行能力域'],
  ], '信息缺口与补充建议'), '信息缺口与补充建议')

  downloadWorkbook(wb, '岗位映射上传模板.xlsx')
}
