/**
 * Host half of the Agent Library panel bundle.
 *
 * Reads the shared agent-library catalog (`<store>/catalog`) and serves a small
 * JSON API under `/agentlib/api/*`; writes per-agent overlays
 * (`SKILL.<agent>.md`, `SKILL.<agent>.ignore`) and the routing attention
 * configuration (`catalog/intents.json`), refreshing the catalog index after
 * every write. Read-only routing tests are delegated to the library's own
 * Python router.
 */
import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile, unlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'

export const inject = ['webServer']

const DEFAULT_STORE = process.env.AGLIB_STORE || join(homedir(), '.agent-library')
const API_PREFIX = '/agentlib/api'
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SECRET =
  /(sk-(?:proj|ant|live|or)-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|Bearer\s+[A-Za-z0-9._-]{20,})/

function storePath() {
  return resolve(DEFAULT_STORE)
}

function catalogPath() {
  return join(storePath(), 'catalog')
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

/** Strip a leading YAML frontmatter block, matching the Python manage UI. */
function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text
  const end = text.indexOf('\n---', 3)
  if (end === -1) return text
  return text.slice(end + 4)
}

function excerpt(text) {
  const body = stripFrontmatter(text)
  const parts = []
  for (const line of body.split(/\r?\n/)) {
    const raw = line.trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('```') || raw.startsWith('|')) {
      if (parts.length) break
      continue
    }
    let s = raw.replace(/^[> ]+/, '').trim()
    if (s.startsWith('- ') || s.startsWith('* ')) s = s.slice(2).trim()
    s = s.replace(/\*\*/g, '').replace(/`/g, '')
    if (!s) continue
    parts.push(s)
    if (parts.length >= 2 || parts.join(' ').length > 180) break
  }
  return parts.join(' ').slice(0, 240)
}

function bodyFile(folder, kind) {
  return join(folder, kind === 'rule' ? 'RULE.mdc' : 'SKILL.md')
}

function assertNoSecrets(text, label) {
  if (SECRET.test(text)) throw new Error(`发现疑似密钥，已停止：${label}`)
}

async function findManifests(dir, depth = 0, out = []) {
  if (depth > 3) return out
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name.startsWith('_')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await findManifests(path, depth + 1, out)
    else if (entry.name === 'manifest.json') out.push(path)
  }
  return out
}

async function readHead(path, limit = 8000) {
  try {
    const text = await readFile(path, 'utf8')
    return text.slice(0, limit)
  } catch {
    return ''
  }
}

function whenList(item) {
  return (item.when || []).map((x) => String(x).trim()).filter(Boolean)
}

async function collectItems() {
  const catalog = catalogPath()
  const rows = []
  for (const manifestPath of await findManifests(catalog)) {
    let item
    try {
      item = await readJson(manifestPath)
    } catch {
      continue
    }
    if (!item || (item.kind !== 'skill' && item.kind !== 'rule') || !item.id) continue
    rows.push({ item, folder: resolve(manifestPath, '..'), rel: relative(catalog, resolve(manifestPath, '..')).split(sep).join('/') })
  }
  return rows
}

async function listItems(agent) {
  const rows = []
  for (const { item, folder, rel } of await collectItems()) {
    const head = await readHead(bodyFile(folder, item.kind))
    const row = {
      rel,
      id: String(item.id),
      kind: item.kind,
      mode: item.mode || 'on-demand',
      category: item.category || '',
      purpose: whenList(item).join(' '),
      excerpt: excerpt(head),
      intents: (item.intents || []).map(String),
      keywords: (item.keywords || []).map(String),
      requires: (item.requires || []).map(String),
      agents: (item.agents || ['*']).map(String),
    }
    if (agent) {
      row.variant = existsSync(join(folder, `SKILL.${agent}.md`))
      row.ignore = existsSync(join(folder, `SKILL.${agent}.ignore`))
    }
    rows.push(row)
  }
  rows.sort((a, b) => {
    const ka = a.kind === 'rule' ? 0 : 1
    const kb = b.kind === 'rule' ? 0 : 1
    return ka - kb || a.id.toLowerCase().localeCompare(b.id.toLowerCase())
  })
  return rows
}

async function agentsConfig() {
  const path = join(catalogPath(), 'agents.json')
  if (!existsSync(path)) return {}
  try {
    const data = await readJson(path)
    return data.agents || {}
  } catch {
    return {}
  }
}

function safeRel(rel) {
  const catalog = catalogPath()
  const clean = String(rel || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  if (!clean || clean.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error('路径不对')
  }
  const folder = resolve(catalog, clean)
  if (folder !== catalog && !folder.startsWith(catalog + sep)) throw new Error('路径超出技能库')
  return { folder, rel: clean }
}

async function itemDetail(rel, agent) {
  const { folder, rel: clean } = safeRel(rel)
  const manifestPath = join(folder, 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error('找不到这条')
  const item = await readJson(manifestPath)
  if (item.kind !== 'skill' && item.kind !== 'rule') throw new Error('这条不是技能或规则')
  const path = bodyFile(folder, item.kind)
  const body = existsSync(path) ? await readFile(path, 'utf8') : ''
  const overlays = {}
  for (const name of Object.keys(await agentsConfig()).sort()) {
    overlays[name] = {
      variant: existsSync(join(folder, `SKILL.${name}.md`)),
      ignore: existsSync(join(folder, `SKILL.${name}.ignore`)),
    }
  }
  let agentView = null
  if (agent) {
    const variantPath = join(folder, `SKILL.${agent}.md`)
    agentView = {
      agent,
      variant: existsSync(variantPath),
      ignore: existsSync(join(folder, `SKILL.${agent}.ignore`)),
      variantBody: existsSync(variantPath) ? await readFile(variantPath, 'utf8') : '',
    }
  }
  return {
    rel: clean,
    id: String(item.id),
    kind: item.kind,
    mode: item.mode || 'on-demand',
    category: item.category || '',
    tags: (item.tags || []).map(String),
    intents: (item.intents || []).map(String),
    keywords: (item.keywords || []).map(String),
    examples: (item.examples || []).map(String),
    agents: (item.agents || ['*']).map(String),
    when: whenList(item),
    whenNot: (item.whenNot || []).map((x) => String(x).trim()).filter(Boolean),
    requires: (item.requires || []).map(String),
    overlays,
    agentView,
    bodyName: path.split(/[\\/]/).pop(),
    body,
    excerpt: excerpt(body),
  }
}

function loadIntentsFile() {
  const path = join(catalogPath(), 'intents.json')
  if (!existsSync(path)) return Promise.resolve({ schemaVersion: 1, categories: {}, intents: [] })
  return readJson(path).then((data) => ({
    ...data,
    schemaVersion: data.schemaVersion || 1,
    categories: data.categories || {},
    intents: Array.isArray(data.intents) ? data.intents : [],
  }))
}

async function intentsData() {
  const data = await loadIntentsFile()
  return {
    categories: data.categories,
    intents: data.intents.map((entry) => ({
      id: entry.id,
      category: entry.category || '',
      description: entry.description || '',
      patterns: entry.patterns || [],
      keywords: entry.keywords || [],
      excludes: entry.excludes || [],
      examples: entry.examples || [],
      skills: entry.skills || [],
      slots: entry.slots || null,
    })),
  }
}

async function writeIntentsFile(data) {
  const path = join(catalogPath(), 'intents.json')
  const payload = { ...data, schemaVersion: data.schemaVersion || 1 }
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function runPython(args, cwd, timeoutMs = 60000) {
  return new Promise((resolvePromise) => {
    let child
    try {
      child = spawn('py', ['-3', ...args], { cwd, windowsHide: true })
    } catch (error) {
      resolvePromise({ ok: false, error: `无法启动 Python：${error.message}` })
      return
    }
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      resolvePromise({ ok: false, error: `超时（${timeoutMs / 1000}s）` })
    }, timeoutMs)
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise({ ok: false, error: `无法启动 Python：${error.message}` })
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise({ ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim(), code })
    })
  })
}

async function refreshIndex() {
  const store = storePath()
  const outcome = await runPython([join(store, 'scripts', 'store.py'), '--store', store], store, 120000)
  if (!outcome.ok) throw new Error(outcome.stderr || outcome.stdout || '索引刷新失败')
  return outcome.stdout || '索引已刷新'
}

async function saveOverlay(payload) {
  const agent = String(payload.agent || '').trim()
  if (!agent) throw new Error('缺少 agent')
  const agents = await agentsConfig()
  if (!Object.prototype.hasOwnProperty.call(agents, agent)) throw new Error('未知 agent')
  const { folder, rel } = safeRel(payload.rel)
  if (!existsSync(join(folder, 'manifest.json'))) throw new Error('找不到这条')
  const body = String(payload.body ?? '')
  const ignore = Boolean(payload.ignore)
  assertNoSecrets(body, 'overlay 正文')
  const variant = join(folder, `SKILL.${agent}.md`)
  const ignored = join(folder, `SKILL.${agent}.ignore`)
  if (body.trim()) {
    await writeFile(variant, body.endsWith('\n') ? body : body + '\n', 'utf8')
  } else if (existsSync(variant)) {
    await unlink(variant)
  }
  if (ignore) {
    await writeFile(ignored, '', 'utf8')
  } else if (existsSync(ignored)) {
    await unlink(ignored)
  }
  return { rel, note: await refreshIndex() }
}

function lines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

async function saveIntent(payload) {
  const original = String(payload.original_id || '').trim()
  const id = String(payload.id || '').trim()
  if (!KEBAB.test(id)) throw new Error('intent id 必须是小写 kebab-case')
  const data = await loadIntentsFile()
  if (data.intents.some((entry) => String(entry.id) === id && String(entry.id) !== original)) {
    throw new Error('intent id 已存在')
  }
  const category = String(payload.category || 'meta').trim() || 'meta'
  if (!KEBAB.test(category)) throw new Error('分类只能是小写 kebab-case')
  const patterns = lines(payload.patterns)
  const keywords = lines(payload.keywords)
  const excludes = lines(payload.excludes)
  const examples = lines(payload.examples)
  const skills = lines(payload.skills)
  if (!patterns.length && !keywords.length) throw new Error('patterns/keywords 至少写一个')
  const known = new Set((await collectItems()).map((row) => String(row.item.id)))
  const unknown = skills.filter((skill) => !known.has(skill))
  if (unknown.length) throw new Error('未知 skill: ' + unknown.join(', '))
  const intent = {
    id,
    category,
    description: String(payload.description || '').trim(),
    patterns,
    keywords,
    excludes,
    examples,
    skills,
  }
  assertNoSecrets(JSON.stringify(intent), 'intent')
  const index = data.intents.findIndex((entry) => String(entry.id) === (original || id))
  if (index >= 0) {
    const previous = data.intents[index] || {}
    const merged = { ...intent }
    for (const key of Object.keys(previous)) {
      if (!(key in merged)) merged[key] = previous[key]
    }
    data.intents[index] = merged
  } else {
    data.intents.push(intent)
  }
  const categories = data.categories
  if (original && original !== id) {
    for (const key of Object.keys(categories)) {
      if (!Array.isArray(categories[key])) continue
      categories[key] = categories[key].map((value) => (value === original ? id : value))
    }
  }
  if (!Array.isArray(categories[category])) categories[category] = []
  if (!categories[category].includes(id)) categories[category].push(id)
  await writeIntentsFile(data)
  return { note: await refreshIndex() }
}

async function deleteIntent(id) {
  const data = await loadIntentsFile()
  const before = data.intents.length
  data.intents = data.intents.filter((entry) => String(entry.id) !== id)
  if (data.intents.length === before) throw new Error('找不到 intent')
  for (const key of Object.keys(data.categories)) {
    if (Array.isArray(data.categories[key])) {
      data.categories[key] = data.categories[key].filter((value) => value !== id)
    }
  }
  await writeIntentsFile(data)
  return { note: await refreshIndex() }
}

async function routeTest(query, agent) {
  const store = storePath()
  const router = join(store, 'router.py')
  if (!existsSync(router)) throw new Error(`找不到 ${router}`)
  const args = [router, 'route', '--json']
  if (agent) args.push('--agent', agent)
  args.push('--', query)
  const outcome = await runPython(args, store, 30000)
  if (!outcome.ok) return { ok: false, error: outcome.stderr || outcome.stdout || `router.py 退出码 ${outcome.code}` }
  try {
    return { ok: true, result: JSON.parse(outcome.stdout) }
  } catch {
    return { ok: false, error: `router.py 输出不是 JSON：${outcome.stdout.slice(0, 600)}` }
  }
}

function sendJson(res, status, payload) {
  const raw = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(raw)
}

function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 2_000_000) {
        reject(new Error('正文太大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        const data = text ? JSON.parse(text) : {}
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('需要对象')
        resolvePromise(data)
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    req.on('error', reject)
  })
}

async function handleWrite(req, res, path) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    sendJson(res, 400, { error: '只接受 application/json' })
    return
  }
  const payload = await readJsonBody(req)
  if (path === `${API_PREFIX}/overlay/save`) {
    sendJson(res, 200, { ok: true, ...(await saveOverlay(payload)) })
    return
  }
  if (path === `${API_PREFIX}/intent/save`) {
    sendJson(res, 200, { ok: true, ...(await saveIntent(payload)) })
    return
  }
  if (path === `${API_PREFIX}/intent/delete`) {
    sendJson(res, 200, { ok: true, ...(await deleteIntent(String(payload.id || ''))) })
    return
  }
  sendJson(res, 404, { error: '没有这个地址' })
}

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const path = url.pathname.replace(/\/+$/, '') || '/'
  try {
    if (req.method === 'POST') {
      await handleWrite(req, res, path)
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: '只支持 GET/POST' })
      return
    }
    const agent = (url.searchParams.get('agent') || '').trim()
    if (path === `${API_PREFIX}/health`) {
      sendJson(res, 200, { ok: true, store: storePath() })
      return
    }
    if (path === `${API_PREFIX}/items`) {
      const [items, agents, intents] = await Promise.all([listItems(agent), agentsConfig(), intentsData()])
      sendJson(res, 200, {
        store: storePath(),
        items,
        agents: Object.keys(agents).sort(),
        intentCount: intents.intents.length,
      })
      return
    }
    if (path === `${API_PREFIX}/item`) {
      sendJson(res, 200, await itemDetail(url.searchParams.get('rel') || '', agent))
      return
    }
    if (path === `${API_PREFIX}/intents`) {
      sendJson(res, 200, await intentsData())
      return
    }
    if (path === `${API_PREFIX}/route`) {
      const query = (url.searchParams.get('q') || '').trim()
      if (!query) throw new Error('缺少 q')
      sendJson(res, 200, await routeTest(query, agent))
      return
    }
    sendJson(res, 404, { error: '没有这个地址' })
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
  }
}

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: '/agentlib',
      handler: handle,
    }),
  )
}
