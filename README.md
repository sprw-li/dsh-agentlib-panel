# agentlib-panel · agent-library 技能库面板（DSH 插件）

把 **agent-library**（单一来源的本机技能库）搬进 DeepSeek Harness Web UI：入口在**左侧栏「技能库」**
（`sidebar.panellist` → `main` 面板，key `agentlib`）。可以浏览技能目录、按 Agent 看覆盖、直接编辑
变体/忽略、维护 intent，并用一句话实测意图路由。

## 它读的库长什么样

agent-library 是一个「单一来源」的技能库，所有 Agent 都从同一份 `catalog/` 读，不往各 Agent 目录复制：

```text
<AGLIB_STORE>/
  catalog/
    <skill-id>/
      SKILL.md          # 技能正文（frontmatter: name / description / license）
      manifest.json     # 触发条件、intent、keywords、requires、category…
    intents.json        # 意图（patterns / keywords / excludes / examples / skills）
    index.json          # 由 <AGLIB_STORE>/scripts/store.py 生成的索引
  agents.json           # 各 Agent 的可见性名单
  router.py             # 一句话 → intent / skill 的路由器
  scripts/store.py      # 刷新 catalog 索引
```

本仓库只带**一个普通样例技能**：[`examples/sample-skill/`](examples/sample-skill)，即 `md-table-png`
（把中文 Markdown 表格导出成 PNG）。它用来展示 `catalog/<id>/SKILL.md` + `manifest.json` 的结构；
**完整技能库是本机私有数据，不在本仓库里。**

## 功能

- **浏览**：技能/规则条目列表，支持搜索与「技能 / 规则」筛选；详情显示 manifest 字段、用途、正文、
  以及各 Agent 的覆盖情况。
- **Agent 视图**：顶部切换 Agent 后，列表标出该 Agent 的 `变体` / `忽略`，详情里可直接编辑并保存
  `SKILL.<agent>.md` 与 `SKILL.<agent>.ignore`（保存会刷新 catalog 索引）。
- **意图**：编辑 `catalog/intents.json` 的注意力配置——patterns / keywords / excludes / examples / skills，
  支持新建、改名、删除。
- **关键词**：输入一句话，实测命中哪些 intent 的 pattern/keyword/example，以及哪些 skill 的 keywords。
- **路由测试**：真实调用 `<AGLIB_STORE>/router.py route --json`，按当前 Agent 过滤。

## Host 接口

Host 半侧（`index.js`）在 `/agentlib/api/*` 暴露：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/items?agent=` | 条目列表；带 agent 时附 `variant` / `ignore` |
| GET | `/item?rel=&agent=` | 详情 + `agentView`（变体正文、ignore） |
| GET | `/intents` | 完整意图表（含 patterns / keywords / excludes / examples / skills） |
| GET | `/route?q=&agent=` | 实时路由结果 |
| POST | `/overlay/save` | `{ rel, agent, body, ignore }`；正文留空且 `ignore:false` 即删除覆盖 |
| POST | `/intent/save` | 新建/更新意图；`original_id` 用于改名 |
| POST | `/intent/delete` | `{ id }` |

写接口会校验：agent 必须存在于 `agents.json`、路径必须落在 catalog 内、intent id / 分类为 kebab-case、
skills 必须是已知条目、拒绝疑似密钥；写完后自动跑 `scripts/store.py` 刷新索引。

## 安装

在 DSH profile 目录里（例如 `~/.dsh/profiles/desktop`）：

```bash
pnpm add link:/path/to/dsh-agentlib-panel
```

然后把包名加进 profile `package.json` 的 `dsh.profile.bundles`：

```json
"dsh": { "profile": { "bundles": ["@local/agentlib-panel"] } }
```

重启（或让 HMR 重载）后，左侧栏出现「技能库」。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `AGLIB_STORE` | `~/.agent-library` | agent-library 根目录；指向任意符合上面结构的库即可 |

面板依赖库里的 `router.py`（路由测试）与 `scripts/store.py`（刷新索引），以及一个可用的 Python 解释器。

## 已知限制

- 强依赖 agent-library 的目录结构；只换了路径、结构不符时列表/保存都会报错。
- 变体与 ignore 是文件级覆盖（`SKILL.<agent>.md` / `SKILL.<agent>.ignore`），不支持合并多 Agent 的差异。
- 路由测试是同步子进程调用，库很大时首屏会慢一点。
- 样例技能只用于说明结构，不会自动进入你的库；需要时把它复制到 `<AGLIB_STORE>/catalog/` 下再刷新索引。

## 许可

MIT
