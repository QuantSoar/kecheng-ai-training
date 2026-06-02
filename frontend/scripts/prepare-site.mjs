import { cpSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const site = join(root, '..', 'site')
const publicDir = join(root, 'public')

/** 部署时需保留的目录与文件（不会被清理） */
const PRESERVE = new Set([
  'data',
  'templates',
  '.htaccess',
  '_redirects',
  '404.html',
  'file-protocol-notice.html',
])

function syncPublicDir(subdir) {
  const src = join(publicDir, subdir)
  const dest = join(site, subdir)
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    cpSync(join(src, name), join(dest, name), { force: true })
  }
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('请先运行 npm run build')
  process.exit(1)
}

mkdirSync(site, { recursive: true })

// 清理旧构建产物，避免 hash 变更后残留 orphan 文件
if (existsSync(site)) {
  for (const name of readdirSync(site)) {
    if (!PRESERVE.has(name)) {
      rmSync(join(site, name), { recursive: true, force: true })
    }
  }
}

cpSync(dist, site, { recursive: true, force: true })

// 与 frontend/public 对齐：Excel 数据与上传模板
syncPublicDir('data')
syncPublicDir('templates')

console.log('')
console.log('静态站点已就绪：')
console.log(`  ${site}`)
console.log('')
console.log('部署说明：')
console.log('  1. 将 site 目录内全部文件上传到 Web 服务器根目录')
console.log('  2. 首页入口：index.html（路由使用 Hash，如 /#/demo 大屏演示）')
console.log('  3. 云端数据：site/data/courses.xlsx、faculty.xlsx、jobs.xlsx、certs.xlsx、curriculum-design.xlsx')
console.log('  4. 配置：site/data/data-config.json')
console.log('  5. 更新 Excel 后运行 sync-data.bat + build-static.bat')
console.log('')
