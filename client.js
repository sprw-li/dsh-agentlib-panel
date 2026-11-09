window.__ModuleLoader__.load({
  id: '@local/agentlib-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const API = '/agentlib/api'
    const ASCII_KEYWORD = /^[a-z0-9_]+$/

    function keywordTokens(text) {
      return new Set(String(text || '').toLowerCase().match(/[a-z0-9_]+|[\u4e00-\u9fa5]+/g) || [])
    }

    function keywordHit(keyword, needle, needleTokens) {
      const kw = String(keyword || '').trim().toLowerCase()
      if (!kw) return false
      if (ASCII_KEYWORD.test(kw)) return needleTokens.has(kw)
      return needle.includes(kw)
    }

    let zh = /^zh/i.test((typeof navigator !== 'undefined' && navigator.language) || '')

    const TEXT = {
      zh: {
        title: '技能库',
        browse: '浏览',
        intents: '意图',
        match: '关键词',
        route: '路由测试',
        search: '搜名称、用途或分类',
        all: '全部',
        skill: '技能',
        rule: '规则',
        refresh: '刷新',
        loading: '正在读取技能库…',
        empty: '没有匹配的技能',
        pick: '从左边选一条查看详情',
        path: '路径',
        category: '分类',
        mode: '模式',
        agents: '适用 Agent',
        intentsLabel: 'intent',
        keywords: '关键词',
        requires: '需要能力',
        when: '什么时候用',
        whenNot: '什么时候不用',
        body: '正文',
        overlays: '按 Agent 覆盖',
        agentView: 'Agent 视图',
        allAgents: '不限 Agent',
        variant: '变体',
        ignore: '忽略',
        overlayTitle: '按 Agent 覆盖',
        overlayHint: '保存会写 SKILL.<agent>.md /.ignore，并刷新 catalog 索引。',
        fillBase: '用基础正文填充',
        clearOverlay: '删除覆盖',
        save: '保存',
        saving: '保存中…',
        saved: '已保存',
        overlayEmpty: '这个 Agent 还没有变体；正文留空即可删除变体。',
        routeHint: '输入一句话，看会命中哪个 intent / skill。',
        routeQuery: '例如：帮我画出乙醇 / 我需要准备答辩',
        run: '路由',
        intent: 'intent',
        intentCategory: 'intent 分类',
        candidates: '候选',
        noCandidate: '没有候选；先追问用户，或补一条 intent。',
        fallback: '兜底匹配',
        routeFailed: '路由失败',
        count: (n) => `${n} 条`,
        score: '分数',
        intentList: '意图表',
        newIntent: '新建',
        delete: '删除',
        confirmDelete: '再点一次确认删除',
        intentId: 'intent id',
        desc: '说明',
        patterns: 'patterns（每行一个正则）',
        keywordsLine: 'keywords（每行一个）',
        excludes: 'excludes（每行一个）',
        examples: 'examples（每行一句）',
        skillsLine: 'skills（每行一个 skill id）',
        matchHint: '输入一句话或关键词，看命中哪些 intent 的 patterns/keywords，以及哪些 skill 的关键词。',
        matchQuery: '例如：帮我画乙醇 / 引用检查',
        matchRun: '匹配',
        matchIntents: '命中的 intent',
        matchSkills: '命中的 skill',
        matchNone: '没有命中',
        field: '来源',
        fragment: '片段',
        searchIntents: '搜 intent / 关键词',
        intentEmpty: '选择或新建一个 intent',
        indexNote: '保存后自动刷新 catalog 索引',
      },
      en: {
        title: 'Agent Library',
        browse: 'Browse',
        intents: 'Intents',
        match: 'Keywords',
        route: 'Route test',
        search: 'Search name, purpose or category',
        all: 'All',
        skill: 'Skills',
        rule: 'Rules',
        refresh: 'Refresh',
        loading: 'Reading the library…',
        empty: 'No matching entries',
        pick: 'Pick an entry on the left',
        path: 'Path',
        category: 'Category',
        mode: 'Mode',
        agents: 'Agents',
        intentsLabel: 'Intents',
        keywords: 'Keywords',
        requires: 'Requires',
        when: 'When to use',
        whenNot: 'When not to use',
        body: 'Body',
        overlays: 'Per-agent overlays',
        agentView: 'Agent view',
        allAgents: 'All agents',
        variant: 'variant',
        ignore: 'ignore',
        overlayTitle: 'Per-agent overlay',
        overlayHint: 'Saving writes SKILL.<agent>.md / .ignore and refreshes the catalog index.',
        fillBase: 'Fill with base body',
        clearOverlay: 'Remove overlay',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved',
        overlayEmpty: 'No variant for this agent yet; an empty body removes it.',
        routeHint: 'Type a request to see which intent and skill it routes to.',
        routeQuery: 'e.g. draw ethanol / prepare my defense',
        run: 'Route',
        intent: 'intent',
        intentCategory: 'intent category',
        candidates: 'Candidates',
        noCandidate: 'No candidates; ask the user or add an intent.',
        fallback: 'Fallback match',
        routeFailed: 'Routing failed',
        count: (n) => `${n} entries`,
        score: 'score',
        intentList: 'Intents',
        newIntent: 'New',
        delete: 'Delete',
        confirmDelete: 'Click again to delete',
        intentId: 'intent id',
        desc: 'Description',
        patterns: 'patterns (one regex per line)',
        keywordsLine: 'keywords (one per line)',
        excludes: 'excludes (one per line)',
        examples: 'examples (one per line)',
        skillsLine: 'skills (one id per line)',
        matchHint: 'Type a phrase to see which intent patterns/keywords and skill keywords it hits.',
        matchQuery: 'e.g. draw ethanol',
        matchRun: 'Match',
        matchIntents: 'Matched intents',
        matchSkills: 'Matched skills',
        matchNone: 'No hits',
        field: 'field',
        fragment: 'fragment',
        searchIntents: 'Search intent / keyword',
        intentEmpty: 'Select or create an intent',
        indexNote: 'The catalog index is refreshed after saving',
      },
    }

    function text() {
      return zh ? TEXT.zh : TEXT.en
    }

    async function fetchJson(path) {
      const response = await fetch(`${API}${path}`, { headers: { accept: 'application/json' } })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok) throw new Error((payload && payload.error) || `${response.status} ${response.statusText}`)
      if (payload && payload.error) throw new Error(payload.error)
      return payload
    }

    async function postJson(path, body) {
      const response = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok) throw new Error((payload && payload.error) || `${response.status} ${response.statusText}`)
      if (payload && payload.error) throw new Error(payload.error)
      return payload
    }

    const CSS = `
.agentlib-root { display:flex; flex-direction:column; gap:10px; height:100%; max-height:calc(100vh - 96px); min-height:360px; overflow:hidden; padding:16px 20px 18px; box-sizing:border-box; color:var(--dsw-alias-label-primary); font:13px/1.45 "Segoe UI","Microsoft YaHei",sans-serif; }
.agentlib-head { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.agentlib-title { font-size:16px; font-weight:600; }
.agentlib-sub { color:var(--dsw-alias-label-secondary); font-size:12px; word-break:break-all; }
.agentlib-search { flex:1 1 180px; min-width:150px; padding:7px 10px; border-radius:6px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit; font:inherit; outline:none; }
.agentlib-search:focus { border-color:var(--dsw-alias-brand-primary); }
.agentlib-tabs { display:flex; gap:4px; }
.agentlib-tab { padding:6px 12px; border-radius:6px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit; font:inherit; cursor:pointer; }
.agentlib-tab.on { background:var(--dsw-alias-brand-primary); border-color:var(--dsw-alias-brand-primary); color:#fff; }
.agentlib-chips { display:flex; gap:4px; }
.agentlib-chip { padding:4px 9px; border-radius:999px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font:12px/1.2 inherit; cursor:pointer; }
.agentlib-chip.on { background:var(--dsw-alias-bg-layer-2); border-color:var(--dsw-alias-border-l2); color:var(--dsw-alias-label-primary); }
.agentlib-body { display:grid; grid-template-columns:minmax(210px,330px) minmax(0,1fr); gap:10px; flex:1 1 auto; min-height:0; }
.agentlib-list { overflow:auto; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; background:var(--dsw-alias-bg-layer-1); min-height:0; }
.agentlib-row { display:block; width:100%; text-align:left; padding:9px 11px; border:0; border-bottom:1px solid var(--dsw-alias-border-l1); background:transparent; color:inherit; font:inherit; cursor:pointer; }
.agentlib-row:hover { background:var(--dsw-alias-bg-layer-2); }
.agentlib-row.on { background:var(--dsw-alias-bg-layer-2); box-shadow:inset 3px 0 0 var(--dsw-alias-brand-primary); }
.agentlib-row.dim { opacity:.55; }
.agentlib-rowtop { display:flex; gap:6px; align-items:baseline; }
.agentlib-name { font-weight:600; word-break:break-all; }
.agentlib-tags { margin-left:auto; display:flex; gap:4px; flex:none; }
.agentlib-badge { font-size:11px; padding:1px 6px; border-radius:4px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); border:1px solid var(--dsw-alias-border-l1); white-space:nowrap; }
.agentlib-badge.rule { color:var(--dsw-alias-state-warn-primary); }
.agentlib-badge.off { color:var(--dsw-alias-state-error-primary); }
.agentlib-badge.on { color:var(--dsw-alias-state-success-primary); }
.agentlib-purpose { color:var(--dsw-alias-label-secondary); font-size:12px; margin-top:3px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.agentlib-detail { overflow:auto; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:14px 16px; background:var(--dsw-alias-bg-layer-1); min-height:0; }
.agentlib-detail h3 { margin:0; font-size:17px; word-break:break-all; }
.agentlib-detail .agentlib-path { color:var(--dsw-alias-label-secondary); font-size:11px; margin:3px 0 12px; word-break:break-all; }
.agentlib-field { display:grid; grid-template-columns:82px minmax(0,1fr); gap:5px 10px; margin:0 0 12px; }
.agentlib-field dt { color:var(--dsw-alias-label-secondary); font-size:12px; }
.agentlib-field dd { margin:0; word-break:break-word; }
.agentlib-section { margin:0 0 12px; }
.agentlib-section h4 { margin:0 0 4px; font-size:12px; color:var(--dsw-alias-label-secondary); font-weight:600; }
.agentlib-pre { white-space:pre-wrap; word-break:break-word; font:12px/1.55 ui-monospace,Consolas,monospace; background:var(--dsw-alias-bg-layer-2); border-radius:6px; padding:10px 12px; margin:0; max-height:40vh; overflow:auto; }
.agentlib-empty { color:var(--dsw-alias-label-secondary); padding:16px; }
.agentlib-err { color:var(--dsw-alias-state-error-primary); font-size:12px; }
.agentlib-msg { color:var(--dsw-alias-state-success-primary); font-size:12px; }
.agentlib-route { display:flex; flex-direction:column; gap:10px; overflow:auto; min-height:0; }
.agentlib-rowline { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.agentlib-input { width:100%; box-sizing:border-box; padding:8px 11px; border-radius:6px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit; font:inherit; outline:none; }
.agentlib-input:focus, .agentlib-textarea:focus, .agentlib-select:focus { border-color:var(--dsw-alias-brand-primary); }
.agentlib-select { padding:7px 10px; border-radius:6px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit; font:inherit; outline:none; }
.agentlib-btn { padding:7px 14px; border-radius:6px; border:1px solid var(--dsw-alias-brand-primary); background:var(--dsw-alias-brand-primary); color:#fff; font:inherit; cursor:pointer; }
.agentlib-btn.ghost { background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l1); }
.agentlib-btn.danger { background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-state-error-primary); border-color:var(--dsw-alias-state-error-primary); }
.agentlib-btn:disabled { opacity:.55; cursor:default; }
.agentlib-cand { border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:9px 12px; background:var(--dsw-alias-bg-layer-1); }
.agentlib-candtop { display:flex; gap:8px; align-items:baseline; }
.agentlib-candmeta { color:var(--dsw-alias-label-secondary); font-size:12px; }
.agentlib-summary { color:var(--dsw-alias-label-secondary); font-size:12px; margin-top:4px; }
.agentlib-note { color:var(--dsw-alias-label-secondary); font-size:12px; }
.agentlib-split { display:grid; grid-template-columns:minmax(180px,280px) minmax(0,1fr); gap:10px; flex:1 1 auto; min-height:0; }
.agentlib-pane { overflow:auto; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:12px 14px; background:var(--dsw-alias-bg-layer-1); min-height:0; }
.agentlib-pane.narrow { padding:0; }
.agentlib-form { display:grid; gap:10px; }
.agentlib-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.agentlib-label { display:block; font-size:12px; color:var(--dsw-alias-label-secondary); margin-bottom:3px; }
.agentlib-textarea { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit; font:12px/1.55 ui-monospace,Consolas,monospace; resize:vertical; min-height:64px; outline:none; }
.agentlib-check { display:flex; gap:6px; align-items:center; }
.agentlib-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.agentlib-hit { border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:8px 10px; margin-bottom:8px; }
.agentlib-mono { font:12px/1.5 ui-monospace,Consolas,monospace; word-break:break-word; }
`

    function Badge(props) {
      const tone = props.tone ? ` ${props.tone}` : ''
      return h('span', { className: `agentlib-badge${tone}` }, props.children)
    }

    /** Sidebar row icon: an open book drawn with the sidebar's own text color. */
    function LibraryIcon(props) {
      const size = props && props.size ? props.size : 18
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', opacity: props && props.active ? 1 : 0.9 },
        },
        h('path', { d: 'M4 5.4c2.7-1 5.1-.9 8 .7v12.5c-2.9-1.6-5.3-1.7-8-.7z' }),
        h('path', { d: 'M20 5.4c-2.7-1-5.1-.9-8 .7v12.5c2.9-1.6 5.3-1.7 8-.7z' }),
        h('path', { d: 'M12 6.1v12.5' }),
      )
    }

    function Row(props) {
      const item = props.item
      const t = text()
      return h(
        'button',
        { type: 'button', className: `agentlib-row${props.active ? ' on' : ''}${item.ignore ? ' dim' : ''}`, onClick: props.onSelect, title: item.rel },
        h(
          'div',
          { className: 'agentlib-rowtop' },
          h('span', { className: 'agentlib-name' }, item.id),
          h(
            'span',
            { className: 'agentlib-tags' },
            item.kind === 'rule' ? h(Badge, { tone: 'rule' }, t.rule) : h(Badge, null, t.skill),
            item.category ? h(Badge, null, item.category) : null,
            item.ignore ? h(Badge, { tone: 'off' }, t.ignore) : null,
            item.variant ? h(Badge, { tone: 'on' }, t.variant) : null,
          ),
        ),
        h('div', { className: 'agentlib-purpose' }, item.excerpt || item.purpose || item.rel),
      )
    }

    function Field(props) {
      if (!props.values || !props.values.length) return null
      return h('div', { className: 'agentlib-section' }, h('h4', null, props.label), h('div', null, props.values.join(' · ')))
    }

    function AgentPicker(props) {
      const t = text()
      return h(
        'select',
        {
          className: 'agentlib-select',
          value: props.value,
          title: t.agentView,
          onChange: (event) => props.onChange(event.target.value),
        },
        h('option', { value: '' }, t.allAgents),
        props.agents.map((agent) => h('option', { key: agent, value: agent }, agent)),
      )
    }

    /** Variant body + ignore flag for one item/agent pair. */
    function OverlayEditor(props) {
      const t = text()
      const view = props.view || {}
      const [ignore, setIgnore] = React.useState(Boolean(view.ignore))
      const [body, setBody] = React.useState(view.variantBody || '')
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState('')
      const [error, setError] = React.useState('')

      async function save(next) {
        setBusy(true)
        setError('')
        setMessage('')
        const nextBody = next && Object.prototype.hasOwnProperty.call(next, 'body') ? next.body : body
        const nextIgnore = next && Object.prototype.hasOwnProperty.call(next, 'ignore') ? next.ignore : ignore
        try {
          const result = await postJson('/overlay/save', { rel: props.rel, agent: props.agent, body: nextBody, ignore: nextIgnore })
          setBody(nextBody)
          setIgnore(nextIgnore)
          setMessage(result.note || t.saved)
          props.onSaved()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      return h(
        'div',
        { className: 'agentlib-section' },
        h('h4', null, `${t.overlayTitle} · ${props.agent}`),
        h('div', { className: 'agentlib-note', style: { marginBottom: 6 } }, t.overlayHint),
        h(
          'label',
          { className: 'agentlib-check', style: { marginBottom: 6 } },
          h('input', { type: 'checkbox', checked: ignore, onChange: (event) => setIgnore(event.target.checked) }),
          `${t.ignore}（SKILL.${props.agent}.ignore）`,
        ),
        h('textarea', {
          className: 'agentlib-textarea',
          style: { minHeight: 120 },
          value: body,
          placeholder: t.overlayEmpty,
          onChange: (event) => setBody(event.target.value),
        }),
        h(
          'div',
          { className: 'agentlib-actions', style: { marginTop: 8 } },
          h('button', { type: 'button', className: 'agentlib-btn', disabled: busy, onClick: () => save() }, busy ? t.saving : t.save),
          h('button', { type: 'button', className: 'agentlib-btn ghost', onClick: () => setBody(props.baseBody || '') }, t.fillBase),
          h('button', { type: 'button', className: 'agentlib-btn danger', disabled: busy, onClick: () => save({ body: '', ignore: false }) }, t.clearOverlay),
          message ? h('span', { className: 'agentlib-msg' }, message) : null,
          error ? h('span', { className: 'agentlib-err' }, error) : null,
        ),
      )
    }

    function Detail(props) {
      const d = props.detail
      const t = text()
      if (props.error) return h('div', { className: 'agentlib-detail' }, h('div', { className: 'agentlib-err' }, props.error))
      if (!d) return h('div', { className: 'agentlib-detail' }, h('div', { className: 'agentlib-empty' }, props.loading ? t.loading : t.pick))
      const overlays = Object.entries(d.overlays || {})
        .filter(([, value]) => value.variant || value.ignore)
        .map(([agent, value]) => `${agent}${value.ignore ? ' (ignore)' : ''}${value.variant ? ' (variant)' : ''}`)
      return h(
        'div',
        { className: 'agentlib-detail' },
        h(
          'div',
          { className: 'agentlib-rowline' },
          h('h3', null, d.id),
          h(Badge, { tone: d.kind === 'rule' ? 'rule' : '' }, d.kind === 'rule' ? t.rule : t.skill),
          d.category ? h(Badge, null, d.category) : null,
          d.agentView && d.agentView.ignore ? h(Badge, { tone: 'off' }, t.ignore) : null,
        ),
        h('div', { className: 'agentlib-path' }, `${d.rel} · ${d.bodyName} · ${d.mode}`),
        h(
          'dl',
          { className: 'agentlib-field' },
          h('dt', null, t.category),
          h('dd', null, d.category || '—'),
          h('dt', null, t.mode),
          h('dd', null, d.mode),
          h('dt', null, t.agents),
          h('dd', null, (d.agents || []).join(', ') || '—'),
          h('dt', null, t.intentsLabel),
          h('dd', null, (d.intents || []).join(', ') || '—'),
          h('dt', null, t.requires),
          h('dd', null, (d.requires || []).join(', ') || '—'),
          overlays.length ? h('dt', null, t.overlays) : null,
          overlays.length ? h('dd', null, overlays.join(', ')) : null,
        ),
        h(Field, { label: t.keywords, values: d.keywords }),
        h(Field, { label: t.when, values: d.when }),
        h(Field, { label: t.whenNot, values: d.whenNot }),
        h(Field, { label: 'examples', values: d.examples }),
        props.agent
          ? h(OverlayEditor, {
              key: `${d.rel}|${props.agent}`,
              rel: d.rel,
              agent: props.agent,
              view: d.agentView,
              baseBody: d.body,
              onSaved: props.onSaved,
            })
          : null,
        h('div', { className: 'agentlib-section' }, h('h4', null, t.body), h('pre', { className: 'agentlib-pre' }, d.body || '')),
      )
    }

    function Candidates(props) {
      const t = text()
      const result = props.result
      if (!result) return null
      if (!result.ok) return h('div', { className: 'agentlib-err' }, `${t.routeFailed}：${result.error}`)
      const value = result.result || {}
      const candidates = value.candidates || []
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'agentlib-note', style: { marginBottom: 8 } },
          `${t.intent}：${value.intent || '—'}${value.intentCategory ? ` (${value.intentCategory})` : ''}`,
          value.fallback ? ` · ${t.fallback}` : '',
          value.slots && Object.keys(value.slots).length
            ? ` · slots: ${Object.entries(value.slots)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}`
            : '',
        ),
        candidates.length
          ? candidates.map((cand, index) =>
              h(
                'div',
                { className: 'agentlib-cand', key: `${cand.id}-${index}`, style: { marginBottom: 8 } },
                h(
                  'div',
                  { className: 'agentlib-candtop' },
                  h('span', { className: 'agentlib-name' }, `${index + 1}. ${cand.id}`),
                  h(
                    'span',
                    { className: 'agentlib-tags' },
                    h(Badge, { tone: cand.kind === 'rule' ? 'rule' : '' }, cand.kind),
                    cand.category ? h(Badge, null, cand.category) : null,
                  ),
                ),
                h('div', { className: 'agentlib-candmeta' }, `${t.score}: ${cand.score} · ${cand.reason || ''}`),
                cand.path ? h('div', { className: 'agentlib-candmeta' }, cand.path) : null,
                cand.summary ? h('div', { className: 'agentlib-summary' }, cand.summary) : null,
              ),
            )
          : h('div', { className: 'agentlib-empty' }, t.noCandidate),
      )
    }

    function intentDraft(entry) {
      return {
        original: entry ? entry.id : '',
        id: entry ? entry.id : '',
        category: entry ? entry.category : 'meta',
        description: entry ? entry.description : '',
        patterns: entry ? (entry.patterns || []).join('\n') : '',
        keywords: entry ? (entry.keywords || []).join('\n') : '',
        excludes: entry ? (entry.excludes || []).join('\n') : '',
        examples: entry ? (entry.examples || []).join('\n') : '',
        skills: entry ? (entry.skills || []).join('\n') : '',
      }
    }

    function IntentEditor(props) {
      const t = text()
      const data = props.data
      const [query, setQuery] = React.useState('')
      const [draft, setDraft] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState('')
      const [error, setError] = React.useState('')
      const [confirming, setConfirming] = React.useState(false)

      const intents = (data && data.intents) || []
      const filtered = intents.filter((entry) => {
        const needle = query.trim().toLowerCase()
        if (!needle) return true
        return `${entry.id} ${entry.category} ${entry.description} ${(entry.keywords || []).join(' ')}`.toLowerCase().includes(needle)
      })

      function select(entry) {
        setDraft(intentDraft(entry))
        setMessage('')
        setError('')
        setConfirming(false)
      }

      function patch(key, value) {
        setDraft((current) => ({ ...(current || intentDraft(null)), [key]: value }))
      }

      async function save() {
        if (!draft) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
          const payload = {
            original_id: draft.original,
            id: draft.id,
            category: draft.category,
            description: draft.description,
            patterns: draft.patterns,
            keywords: draft.keywords,
            excludes: draft.excludes,
            examples: draft.examples,
            skills: draft.skills,
          }
          const result = await postJson('/intent/save', payload)
          setDraft((current) => ({ ...current, original: current.id }))
          setMessage(result.note || t.saved)
          props.onSaved()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      async function remove() {
        if (!draft || !draft.original) return
        if (!confirming) {
          setConfirming(true)
          return
        }
        setBusy(true)
        setError('')
        try {
          const result = await postJson('/intent/delete', { id: draft.original })
          setMessage(result.note || t.saved)
          setDraft(null)
          setConfirming(false)
          props.onSaved()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      if (!data) return h('div', { className: 'agentlib-empty' }, props.error || t.loading)

      const current = draft || intentDraft(null)
      return h(
        'div',
        { className: 'agentlib-split' },
        h(
          'div',
          { className: 'agentlib-pane narrow', style: { display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
          h('div', { style: { padding: 8, borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
            h('input', { className: 'agentlib-input', type: 'search', value: query, placeholder: t.searchIntents, onChange: (event) => setQuery(event.target.value) }),
          ),
          h(
            'div',
            { style: { overflow: 'auto', flex: 1, minHeight: 0 } },
            filtered.map((entry) =>
              h(
                'button',
                {
                  key: entry.id,
                  type: 'button',
                  className: `agentlib-row${draft && draft.original === entry.id ? ' on' : ''}`,
                  onClick: () => select(entry),
                },
                h('div', { className: 'agentlib-rowtop' }, h('span', { className: 'agentlib-name' }, entry.id), entry.category ? h(Badge, null, entry.category) : null),
                h('div', { className: 'agentlib-purpose' }, entry.description || `${(entry.keywords || []).slice(0, 4).join('、')}`),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'agentlib-pane' },
          draft
            ? h(
                'div',
                { className: 'agentlib-form' },
                h(
                  'div',
                  { className: 'agentlib-grid2' },
                  h('div', null, h('label', { className: 'agentlib-label' }, t.intentId), h('input', { className: 'agentlib-input', value: current.id, onChange: (event) => patch('id', event.target.value) })),
                  h('div', null, h('label', { className: 'agentlib-label' }, t.category), h('input', { className: 'agentlib-input', value: current.category, onChange: (event) => patch('category', event.target.value) })),
                ),
                h('div', null, h('label', { className: 'agentlib-label' }, t.desc), h('textarea', { className: 'agentlib-textarea', value: current.description, onChange: (event) => patch('description', event.target.value) })),
                h('div', null, h('label', { className: 'agentlib-label' }, t.patterns), h('textarea', { className: 'agentlib-textarea', value: current.patterns, onChange: (event) => patch('patterns', event.target.value) })),
                h('div', null, h('label', { className: 'agentlib-label' }, t.keywordsLine), h('textarea', { className: 'agentlib-textarea', value: current.keywords, onChange: (event) => patch('keywords', event.target.value) })),
                h('div', null, h('label', { className: 'agentlib-label' }, t.excludes), h('textarea', { className: 'agentlib-textarea', value: current.excludes, onChange: (event) => patch('excludes', event.target.value) })),
                h('div', null, h('label', { className: 'agentlib-label' }, t.examples), h('textarea', { className: 'agentlib-textarea', value: current.examples, onChange: (event) => patch('examples', event.target.value) })),
                h('div', null, h('label', { className: 'agentlib-label' }, t.skillsLine), h('textarea', { className: 'agentlib-textarea', value: current.skills, onChange: (event) => patch('skills', event.target.value) })),
                h(
                  'div',
                  { className: 'agentlib-actions' },
                  h('button', { type: 'button', className: 'agentlib-btn', disabled: busy, onClick: save }, busy ? t.saving : t.save),
                  h('button', { type: 'button', className: 'agentlib-btn ghost', onClick: () => { setDraft(intentDraft(null)); setMessage(''); setError(''); setConfirming(false) } }, t.newIntent),
                  h('button', { type: 'button', className: 'agentlib-btn danger', disabled: busy || !draft.original, onClick: remove }, confirming ? t.confirmDelete : t.delete),
                  message ? h('span', { className: 'agentlib-msg' }, message) : null,
                  error ? h('span', { className: 'agentlib-err' }, error) : null,
                ),
                h('div', { className: 'agentlib-note' }, t.indexNote),
              )
            : h('div', { className: 'agentlib-empty' }, t.intentEmpty),
        ),
      )
    }

    function MatchView(props) {
      const t = text()
      const [query, setQuery] = React.useState('')
      const intents = (props.data && props.data.intents) || []
      const items = props.items || []
      const result = React.useMemo(() => {
        const needle = query.trim()
        if (!needle) return null
        const lower = needle.toLowerCase()
        const needleTokens = keywordTokens(lower)
        const intentHits = []
        for (const entry of intents) {
          const hits = []
          for (const pattern of entry.patterns || []) {
            try {
              const match = new RegExp(pattern, 'i').exec(needle)
              if (match) hits.push({ field: 'pattern', value: pattern, fragment: match[0] })
            } catch {
              if (lower.includes(String(pattern).toLowerCase())) hits.push({ field: 'pattern', value: pattern, fragment: pattern })
            }
          }
          for (const keyword of entry.keywords || []) {
            if (keywordHit(keyword, lower, needleTokens)) hits.push({ field: 'keyword', value: keyword, fragment: keyword })
          }
          for (const example of entry.examples || []) {
            if (example && lower.includes(String(example).toLowerCase())) hits.push({ field: 'example', value: example, fragment: example })
          }
          if (hits.length) intentHits.push({ entry, hits })
        }
        const skillHits = []
        for (const item of items) {
          const matched = (item.keywords || []).filter((keyword) => keywordHit(keyword, lower, needleTokens))
          if (matched.length) skillHits.push({ item, matched })
        }
        return { intentHits, skillHits }
      }, [query, intents, items])

      return h(
        'div',
        { className: 'agentlib-route' },
        h('div', { className: 'agentlib-note' }, t.matchHint),
        h('input', {
          className: 'agentlib-input',
          type: 'search',
          value: query,
          placeholder: t.matchQuery,
          onChange: (event) => setQuery(event.target.value),
        }),
        result
          ? h(
              'div',
              null,
              h('div', { className: 'agentlib-section' }, h('h4', null, `${t.matchIntents}（${result.intentHits.length}）`)),
              result.intentHits.length
                ? result.intentHits.map((hit) =>
                    h(
                      'div',
                      { className: 'agentlib-hit', key: hit.entry.id },
                      h('div', { className: 'agentlib-candtop' }, h('span', { className: 'agentlib-name' }, hit.entry.id), hit.entry.category ? h(Badge, null, hit.entry.category) : null),
                      hit.hits.map((entry, index) =>
                        h(
                          'div',
                          { className: 'agentlib-candmeta', key: index },
                          `${t.field}: ${entry.field} · ${entry.value}${entry.fragment && entry.fragment !== entry.value ? ` → ${entry.fragment}` : ''}`,
                        ),
                      ),
                      (hit.entry.skills || []).length ? h('div', { className: 'agentlib-summary' }, `skills: ${hit.entry.skills.join(', ')}`) : null,
                    ),
                  )
                : h('div', { className: 'agentlib-empty' }, t.matchNone),
              h('div', { className: 'agentlib-section', style: { marginTop: 14 } }, h('h4', null, `${t.matchSkills}（${result.skillHits.length}）`)),
              result.skillHits.length
                ? result.skillHits.map((hit) =>
                    h(
                      'div',
                      { className: 'agentlib-hit', key: hit.item.rel },
                      h('div', { className: 'agentlib-candtop' }, h('span', { className: 'agentlib-name' }, hit.item.id), hit.item.category ? h(Badge, null, hit.item.category) : null),
                      h('div', { className: 'agentlib-candmeta' }, `keywords: ${hit.matched.join('、')}`),
                    ),
                  )
                : h('div', { className: 'agentlib-empty' }, t.matchNone),
            )
          : null,
      )
    }

    function Panel() {
      const t = text()
      const [tab, setTab] = React.useState('browse')
      const [agent, setAgent] = React.useState('')
      const [q, setQ] = React.useState('')
      const [kind, setKind] = React.useState('all')
      const [reload, setReload] = React.useState(0)
      const [list, setList] = React.useState({ loading: true, error: null, data: null })
      const [selected, setSelected] = React.useState(null)
      const [detail, setDetail] = React.useState({ loading: false, error: null, data: null })
      const [detailReload, setDetailReload] = React.useState(0)
      const [intents, setIntents] = React.useState({ loading: false, error: null, data: null })
      const [intentsReload, setIntentsReload] = React.useState(0)
      const [routeQ, setRouteQ] = React.useState('')
      const [route, setRoute] = React.useState({ loading: false, result: null })

      React.useEffect(() => {
        let alive = true
        setList((current) => ({ ...current, loading: true, error: null }))
        fetchJson(`/items${agent ? `?agent=${encodeURIComponent(agent)}` : ''}`)
          .then((data) => {
            if (alive) setList({ loading: false, error: null, data })
          })
          .catch((error) => {
            if (alive) setList({ loading: false, error: error.message, data: null })
          })
        return () => {
          alive = false
        }
      }, [reload, agent])

      React.useEffect(() => {
        if (!selected) return undefined
        let alive = true
        setDetail({ loading: true, error: null, data: null })
        fetchJson(`/item?rel=${encodeURIComponent(selected)}${agent ? `&agent=${encodeURIComponent(agent)}` : ''}`)
          .then((data) => {
            if (alive) setDetail({ loading: false, error: null, data })
          })
          .catch((error) => {
            if (alive) setDetail({ loading: false, error: error.message, data: null })
          })
        return () => {
          alive = false
        }
      }, [selected, agent, detailReload])

      React.useEffect(() => {
        if (tab !== 'intents' && tab !== 'match') return undefined
        let alive = true
        setIntents((current) => ({ ...current, loading: !current.data, error: null }))
        fetchJson('/intents')
          .then((data) => {
            if (alive) setIntents({ loading: false, error: null, data })
          })
          .catch((error) => {
            if (alive) setIntents({ loading: false, error: error.message, data: null })
          })
        return () => {
          alive = false
        }
      }, [tab, intentsReload])

      const items = (list.data && list.data.items) || []
      const agents = (list.data && list.data.agents) || []
      const filtered = React.useMemo(() => {
        const needle = q.trim().toLowerCase()
        return items.filter((item) => {
          if (kind !== 'all' && item.kind !== kind) return false
          if (!needle) return true
          return `${item.id} ${item.rel} ${item.category} ${item.purpose} ${item.excerpt}`.toLowerCase().includes(needle)
        })
      }, [items, q, kind, agent])

      function runRoute() {
        const query = routeQ.trim()
        if (!query) return
        setRoute({ loading: true, result: null })
        const params = new URLSearchParams({ q: query })
        if (agent) params.set('agent', agent)
        fetchJson(`/route?${params.toString()}`)
          .then((result) => setRoute({ loading: false, result }))
          .catch((error) => setRoute({ loading: false, result: { ok: false, error: error.message } }))
      }

      function reloadAll() {
        setReload((value) => value + 1)
        setIntentsReload((value) => value + 1)
        setDetailReload((value) => value + 1)
      }

      return h(
        'div',
        { className: 'agentlib-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'agentlib-head' },
          h('span', { className: 'agentlib-title' }, t.title),
          h('span', { className: 'agentlib-sub' }, list.data ? list.data.store : ''),
          h(
            'div',
            { className: 'agentlib-tabs' },
            h('button', { type: 'button', className: `agentlib-tab${tab === 'browse' ? ' on' : ''}`, onClick: () => setTab('browse') }, t.browse),
            h('button', { type: 'button', className: `agentlib-tab${tab === 'intents' ? ' on' : ''}`, onClick: () => setTab('intents') }, t.intents),
            h('button', { type: 'button', className: `agentlib-tab${tab === 'match' ? ' on' : ''}`, onClick: () => setTab('match') }, t.match),
            h('button', { type: 'button', className: `agentlib-tab${tab === 'route' ? ' on' : ''}`, onClick: () => setTab('route') }, t.route),
          ),
          h('span', { style: { flex: 1 } }),
          h(AgentPicker, { agents, value: agent, onChange: setAgent }),
          h('button', { type: 'button', className: 'agentlib-btn ghost', onClick: reloadAll }, t.refresh),
        ),
        tab === 'browse'
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 } },
              h(
                'div',
                { className: 'agentlib-head' },
                h('input', { className: 'agentlib-search', type: 'search', value: q, placeholder: t.search, onChange: (event) => setQ(event.target.value) }),
                h(
                  'div',
                  { className: 'agentlib-chips' },
                  ['all', 'skill', 'rule'].map((value) =>
                    h(
                      'button',
                      { key: value, type: 'button', className: `agentlib-chip${kind === value ? ' on' : ''}`, onClick: () => setKind(value) },
                      value === 'all' ? t.all : value === 'skill' ? t.skill : t.rule,
                    ),
                  ),
                ),
                list.data ? h('span', { className: 'agentlib-sub' }, t.count(items.length)) : null,
              ),
              list.error ? h('div', { className: 'agentlib-err' }, list.error) : null,
              h(
                'div',
                { className: 'agentlib-body' },
                h(
                  'div',
                  { className: 'agentlib-list' },
                  list.loading ? h('div', { className: 'agentlib-empty' }, t.loading) : null,
                  !list.loading && !filtered.length ? h('div', { className: 'agentlib-empty' }, t.empty) : null,
                  filtered.map((item) => h(Row, { key: item.rel, item, active: item.rel === selected, onSelect: () => setSelected(item.rel) })),
                ),
                h(Detail, {
                  detail: detail.data,
                  error: detail.error,
                  loading: detail.loading,
                  agent,
                  onSaved: () => {
                    setReload((value) => value + 1)
                    setDetailReload((value) => value + 1)
                  },
                }),
              ),
            )
          : null,
        tab === 'intents'
          ? h(IntentEditor, {
              data: intents.data,
              error: intents.error,
              onSaved: () => {
                setIntentsReload((value) => value + 1)
                setReload((value) => value + 1)
              },
            })
          : null,
        tab === 'match' ? h(MatchView, { data: intents.data, items }) : null,
        tab === 'route'
          ? h(
              'div',
              { className: 'agentlib-route' },
              h('div', { className: 'agentlib-note' }, t.routeHint),
              h('input', {
                className: 'agentlib-input',
                type: 'search',
                value: routeQ,
                placeholder: t.routeQuery,
                onChange: (event) => setRouteQ(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') runRoute()
                },
              }),
              h(
                'div',
                { className: 'agentlib-rowline' },
                h('span', { className: 'agentlib-note' }, agent ? `agent=${agent}` : t.allAgents),
                h('button', { type: 'button', className: 'agentlib-btn', onClick: runRoute, disabled: route.loading }, route.loading ? '…' : t.run),
              ),
              h(Candidates, { result: route.result }),
            )
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          const locale = ctx.get('locale')
          const active = locale && typeof locale.getLocale === 'function' ? String(locale.getLocale().active || '') : ''
          if (active) zh = active.toLowerCase().startsWith('zh')
        } catch {
          /* keep the navigator-language default */
        }
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'agentlib' }, Panel))
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'agentlib',
              order: 5,
              label: text().title,
            },
            LibraryIcon,
          ),
        )
      },
    }
  },
})
