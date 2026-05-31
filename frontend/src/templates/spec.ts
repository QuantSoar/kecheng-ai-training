/** Excel 模板列定义 — 与 backend/generate_templates.py 保持同步 */

export const COURSE_SHEETS = {
  guide: '填写说明',
  courses: '全部课程明细',
  vendor: '各个厂商课程体系',
  overview: '课程体系总览',
  labs: '实训室名称',
  stats: '统计汇总',
} as const

export const COURSE_DETAIL_HEADERS = [
  '序号',
  '实训室名称',
  '课程类型',
  '课程名称',
  '建议学时',
  '推荐教材',
  '实训平台',
  '课程来源',
  '备注',
] as const

export const COURSE_TYPES = ['通识课程', '专业基础课', '专业核心课', '专业实践课'] as const

export const VENDOR_HEADERS = [
  '序号',
  '归属实训室（标准）',
  '原始实训室名称',
  '课程名称',
  '课程描述',
  '课程类型（标准）',
  '原始课程类型',
  '是否绑定硬件',
  '配套硬件',
  '参考课时（总）',
  '参考课时（理论）',
  '参考课时（实训）',
  '所属厂商',
  '培养能力',
  '岗位辐射',
] as const

export const OVERVIEW_HEADERS = [
  '序号',
  '实训室名称',
  '通识课程',
  '专业基础课',
  '专业核心课',
  '专业实践课',
  '课程总数',
  '备注',
] as const

export const LAB_NAME_HEADERS = ['序号', '实训室名称', '原Excel中名称'] as const

/** 24 个标准实训室名称（与现有课程体系一致） */
export const STANDARD_LABS = [
  '人工智能应用开发实训室',
  '机器视觉和VLM实训室',
  '智能边缘计算应用开发实训室',
  '视频语音智能体实训室',
  '鸿蒙智联实训室',
  '低空智能实训室',
  '具身智能实训室',
  '电子数据调查分析实训室',
  'AI+网络空间安全实训室',
  '互联网舆情监测与管控实验室',
  '智能体实训室',
  '高性能智算实训室',
  'AIGC视觉传达实训室',
  'AI for science实训室',
  '空天地一体实训室',
  '洁净实验室',
  '集成电路与电子信息实训室',
  'TPU异构算力与软硬协同实训室',
  '卫星互联网实训室',
  'AI高端装备制造实训室',
  '智能交通行业应用开发实训室',
  '智能制造行业开发实训室',
  '电子数据取证司法鉴定实训室',
  '数据标注实训室',
] as const

export const FACULTY_SHEETS = {
  guide: '填写说明',
  main: '师资多维分析总表',
  top: 'TOP20推荐优先级',
  labMatch: '实训室师资匹配',
  source: '来源维度统计',
  recommender: '推荐方统计',
  matrix: '实训室推荐方交叉',
} as const

/** 第 4 行表头，列顺序与解析器 MAIN_COLUMNS 一致 */
export const FACULTY_HEADERS = [
  '序号',
  '姓名',
  '性别',
  '学历',
  '毕业院校',
  '专业',
  '职级',
  '来源维度',
  '职称维度',
  '级别维度',
  '经验维度',
  '厂商认证',
  '可用性',
  '核心能力',
  '专业领域',
  '关键词',
  '匹配实训室',
  '匹配实训室数',
  '教学管理经验',
  '合作模式',
  '费用等级',
  '推荐优先级',
  '推荐方类型',
  '推荐方',
  '技术方向',
  '厂商认证证书',
  '讲师简介',
  '可授课程',
  '教师资格证',
  '备注',
] as const

export const JOB_MAP_SHEETS = {
  guide: '填写说明',
  matrix: '岗位-实训室映射矩阵',
  skills: '岗位能力分层拆解',
  labCourse: '实训室-岗位-课程三对照',
  gaps: '信息缺口与补充建议',
} as const

export const JOB_MATRIX_HEADERS = [
  '序号',
  '岗位大类',
  '岗位名称',
  '核心关键词',
  '市场热度',
] as const

/** 映射矩阵中实训室列使用简称，系统会自动归一为标准实训室名 */
export const JOB_MATRIX_LAB_COLUMNS = [
  '人工智能应用开发',
  '高性能智算',
  '智能体',
  '数据标注',
] as const

export const JOB_SKILL_HEADERS = [
  '序号',
  '岗位名称',
  '岗位大类',
  '能力域',
  '初级技能点',
  '中级技能点',
  '高级技能点',
  '关联实训室',
  '推荐课程',
] as const

export const JOB_LAB_COURSE_HEADERS = [
  '序号',
  '实训室名称',
  '能力域分组',
  '辐射岗位',
  '核心课程',
  '课程类型',
  '关联等级',
  '培养能力',
  '岗位大类',
] as const

export const JOB_GAP_HEADERS = [
  '序号',
  '缺口类别',
  '缺口描述',
  '影响范围',
  '严重程度',
  '补充建议',
] as const

/** 关联等级符号：● 核心 / ◐ 重要 / ○ 基础 */
export const JOB_LINK_SYMBOLS = ['●', '◐', '○'] as const

const base = import.meta.env.BASE_URL

export const TEMPLATE_DOWNLOADS = {
  course: `${base}templates/课程图谱上传模板.xlsx`,
  faculty: `${base}templates/师资多维分析上传模板.xlsx`,
  jobMap: `${base}templates/岗位映射上传模板.xlsx`,
} as const

export const TEMPLATE_FILENAMES = {
  course: '课程图谱上传模板.xlsx',
  faculty: '师资多维分析上传模板.xlsx',
  jobMap: '岗位映射上传模板.xlsx',
} as const
