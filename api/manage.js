import { buildLogoUrl, formatChannelTitle, getChannelSources, getChannels, normalizeChannels } from '../utils/helpers.js';
import config from '../utils/config.js';

function escapeText(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function generateM3U(channels) {
  let m3u = '#EXTM3U\n';
  channels.forEach((group) => {
    group.channels.forEach((channel) => {
      const logo = buildLogoUrl(channel.logo);
      getChannelSources(channel).forEach((source) => {
        m3u += `#EXTINF:-1 tvg-id="${channel.id || channel.name}" tvg-name="${channel.name}" tvg-logo="${logo}" group-title="${group.group}",${formatChannelTitle(channel.name, source.note)}\n${source.url}\n`;
      });
    });
    if (group.channels.length) m3u += '\n';
  });
  return m3u;
}

function generateTXT(channels) {
  const lines = [];
  channels.forEach((group) => {
    if (!group.channels.length) return;
    lines.push(`${group.group},#genre#`);
    group.channels.forEach((channel) => {
      getChannelSources(channel).forEach((source) => {
        lines.push(`${formatChannelTitle(channel.name, source.note)},${source.url}`);
      });
    });
    lines.push('');
  });
  return lines.join('\n');
}

async function saveToVercel(newData) {
  const { projectId, token } = config.platform;
  if (!projectId || !token) throw new Error('未配置 Vercel 环境变量 DEPLOY_PLATFROM_PROJECT / DEPLOY_PLATFROM_TOKEN');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const projectRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, { headers });
  const projectData = await projectRes.json();
  if (!projectRes.ok) throw new Error(projectData.error?.message || '读取 Vercel 项目信息失败');

  const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, { headers });
  const listData = await listRes.json();
  if (!listRes.ok) throw new Error(listData.error?.message || '读取 Vercel 环境变量失败');

  const targetEnvIds = listData.envs ? listData.envs.filter((env) => env.key === 'CHANNELS_DATA').map((env) => env.id) : [];
  for (const id of targetEnvIds) {
    await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${id}`, { method: 'DELETE', headers });
  }

  const envRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key: 'CHANNELS_DATA',
      value: JSON.stringify(newData),
      type: 'encrypted',
      target: ['production', 'preview', 'development']
    })
  });
  const envData = await envRes.json();
  if (!envRes.ok) throw new Error(envData.error?.message || '保存频道数据失败');

  await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'jptv-update',
      project: projectId,
      target: 'production',
      gitSource: {
        type: projectData.link?.type,
        repoId: projectData.link?.repoId,
        ref: projectData.targets?.production?.gitBranch || 'main'
      }
    })
  });
}

export default async function handler(req, res) {
  const token = req.query.token || '';
  const isAuth = token === config.adminToken;
  const currentVersion = config.currentVersion;
  let channels = getChannels();

  const isJSONReq = req.url.includes('ipv6.json') || req.query.format === 'json';
  const isM3UReq = req.url.includes('ipv6.m3u') || req.query.format === 'm3u';
  const isTXTReq = req.url.includes('ipv6.txt') || req.query.format === 'txt';

  if (isJSONReq) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(channels, null, 2));
  }

  if (isM3UReq || isTXTReq) {
    if (!isAuth) return res.status(401).send('Unauthorized: Invalid Admin Token');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(isM3UReq ? generateM3U(channels) : generateTXT(channels));
  }

  if (req.method === 'POST') {
    if (!isAuth) return res.status(401).json({ error: '无权操作' });

    try {
      const newData = normalizeChannels(req.body?.newData || []);
      await saveToVercel(newData);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JPTV 管理系统</title>
  <link rel="icon" href="/jptv.png" type="image/png">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { transition: background 0.5s ease, color 0.3s ease; }
    body.theme-light {
      --glass-bg: rgba(255, 255, 255, 0.66);
      --glass-bg-strong: rgba(255, 255, 255, 0.78);
      --glass-border: rgba(148, 163, 184, 0.34);
      --source-bg: rgba(255, 255, 255, 0.72);
      --source-bar: rgba(248, 250, 252, 0.82);
      --source-code: #1f2937;
      --source-muted: #94a3b8;
      background:
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 32rem),
        linear-gradient(135deg, #f8fafc 0%, #eef2f7 48%, #e5e7eb 100%);
      color: #1f2937;
    }
    body.theme-dark {
      --glass-bg: rgba(30, 30, 30, 0.68);
      --glass-bg-strong: rgba(30, 30, 30, 0.82);
      --glass-border: rgba(255, 255, 255, 0.13);
      --source-bg: rgba(30, 30, 30, 0.82);
      --source-bar: rgba(37, 37, 38, 0.86);
      --source-code: #d4d4d4;
      --source-muted: #858585;
      background:
        radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
        linear-gradient(135deg, #111827 0%, #171717 48%, #0f172a 100%);
      color: #f1f5f9;
    }
    .glass-panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(22px) saturate(145%);
      -webkit-backdrop-filter: blur(22px) saturate(145%);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.18);
    }
    .card {
      background: var(--glass-bg-strong);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(16px) saturate(135%);
      -webkit-backdrop-filter: blur(16px) saturate(135%);
    }
    .card { cursor: pointer; transition: all 0.2s ease; height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; position: relative; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .channel-logo { height: 64px; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); pointer-events: none; }
    .dragging { opacity: 0.4; border: 2px dashed #3b82f6 !important; }
    .source-editor {
      height: var(--source-height, 360px);
      min-height: 220px;
      max-height: 560px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--source-bg);
      color: var(--source-code);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(22px) saturate(145%);
      -webkit-backdrop-filter: blur(22px) saturate(145%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 14px 36px rgba(15, 23, 42, 0.16);
    }
    .source-titlebar { background: var(--source-bar); border-bottom: 1px solid var(--glass-border); color: var(--source-code); backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); }
    .source-tabs button { border-right: 1px solid currentColor; border-color: rgba(127,127,127,0.24); }
    .source-tabs button { color: var(--source-muted); }
    .source-tabs button.active { background: var(--source-bg); color: var(--source-code); font-weight: 700; }
    .source-codewrap { flex: 1; min-height: 0; overflow: hidden; overscroll-behavior: contain; }
    .source-textarea { width: calc(100% - 44px); min-width: 0; height: 100%; background: transparent; color: inherit; border: 0; outline: none; resize: none; tab-size: 2; line-height: 1.55; overflow: auto; white-space: pre; }
    .source-gutter { width: 44px; min-width: 44px; height: 100%; overflow: hidden; user-select: none; border-right: 1px solid rgba(127,127,127,0.24); }
    .source-gutter { background: var(--source-bg); color: var(--source-muted); }
    .source-action { height: 30px; min-width: 34px; border-radius: 0.5rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; font-weight: 700; border: 1px solid transparent; transition: all 0.15s ease; }
    .source-action.apply { background: #2563eb; color: #ffffff; border-color: rgba(255,255,255,0.18); box-shadow: 0 6px 14px rgba(37, 99, 235, 0.28); }
    .source-action.apply:hover { background: #1d4ed8; }
    .source-action.close { background: rgba(148, 163, 184, 0.18); color: var(--source-code); border-color: var(--glass-border); }
    .source-action.close:hover { background: rgba(239, 68, 68, 0.14); color: #ef4444; border-color: rgba(239, 68, 68, 0.28); }
    .icon-btn { width: 34px; height: 34px; border-radius: 0.65rem; display: inline-flex; align-items: center; justify-content: center; background: rgba(148, 163, 184, 0.14); border: 1px solid var(--glass-border); color: #2563eb; transition: all 0.15s ease; }
    .icon-btn:hover { background: rgba(37, 99, 235, 0.14); color: #1d4ed8; transform: translateY(-1px); }
    .theme-dark .icon-btn { color: #93c5fd; background: rgba(255, 255, 255, 0.08); }
    .theme-dark .icon-btn:hover { color: #bfdbfe; background: rgba(96, 165, 250, 0.16); }
    .icon-btn.danger { color: #ef4444; }
    .icon-btn.danger:hover { background: rgba(239, 68, 68, 0.14); color: #dc2626; }
    .channel-logo-preview { width: 58px; height: 58px; min-width: 58px; border-radius: 0.95rem; object-fit: contain; padding: 0.45rem; background: linear-gradient(145deg, rgba(255,255,255,0.42), rgba(148,163,184,0.12)); border: 1px solid var(--glass-border); backdrop-filter: blur(16px) saturate(145%); -webkit-backdrop-filter: blur(16px) saturate(145%); box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255,255,255,0.26); }
    .theme-dark .channel-logo-preview { background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(15,23,42,0.28)); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.12); }
    .format-choice { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; }
    .format-choice label { cursor: pointer; border: 1px solid rgba(127,127,127,0.28); border-radius: 0.75rem; padding: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
    .format-choice input { accent-color: #2563eb; }
  </style>
</head>
<body class="theme-light min-h-screen p-4 md:p-8">
  <div class="max-w-[1600px] mx-auto">
    <header class="flex flex-col lg:flex-row justify-between items-center mb-8 glass-panel p-6 rounded-2xl gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-gray-100">
          <img src="/jptv.png" class="w-10 h-10 object-contain" alt="JPTV">
        </div>
        <div>
          <h1 class="text-2xl font-bold">JPTV 控制台</h1>
          <div class="flex gap-2 text-xs font-mono mt-1 opacity-70">
            <span id="version-display">v${escapeText(currentVersion)}</span>
            ${isAuth ? '<span class="px-2 py-0.5 bg-green-500/20 text-green-600 rounded">管理员</span>' : '<span class="px-2 py-0.5 bg-gray-500/20 text-gray-500 rounded">只读模式</span>'}
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <button onclick="toggleTheme()" class="w-10 h-10 rounded-full bg-current/10 hover:bg-current/20 flex items-center justify-center transition" title="切换主题">
          <i class="fas fa-sun" id="themeIcon"></i>
        </button>
        ${isAuth ? `
        <div class="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
          <button onclick="openExportDialog()" class="px-3 py-2 hover:bg-current/10 rounded-lg transition flex items-center gap-2 text-xs font-medium"><i class="fas fa-download"></i> 导出</button>
          <div class="w-px h-4 bg-current/10 mx-1"></div>
          <button onclick="globalImport()" class="px-3 py-2 hover:bg-current/10 rounded-lg transition flex items-center gap-2 text-xs font-medium"><i class="fas fa-upload"></i> 导入</button>
        </div>
        <button onclick="saveData()" id="saveBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition flex items-center gap-2">
          <i class="fas fa-cloud-upload-alt"></i> 保存并部署
        </button>` : ''}
      </div>
    </header>

    <div id="app" class="space-y-8 pb-12"></div>
    ${isAuth ? `
    <div class="py-10 text-center">
      <button onclick="addGroup()" class="px-8 py-4 rounded-2xl border-2 border-dashed border-current/20 hover:border-blue-500 text-current/50 hover:text-blue-500 transition font-bold flex items-center gap-2 mx-auto text-lg">
        <i class="fas fa-plus-circle"></i> 添加新分组
      </button>
    </div>` : ''}
  </div>

  <script>
    let raw = ${JSON.stringify(channels)};
    const isAuth = ${isAuth};
    const currentToken = ${JSON.stringify(token)};
    let dragSrc = null;
    let sourceState = { open: null, format: 'json' };
    let currentTheme = localStorage.getItem('jptv_theme') || 'light';

    function normalizeSources(value) {
      const list = Array.isArray(value) ? value : value ? [value] : [];
      return list.map((item) => {
        if (typeof item === 'string') return { url: item.trim(), note: '' };
        if (item && typeof item === 'object') return { url: String(item.url || item.href || '').trim(), note: String(item.note || item.remark || item.name || '').trim() };
        return null;
      }).filter((item) => item && item.url);
    }

    function normalizeChannel(ch) {
      const sources = normalizeSources(ch.sources || ch.urls || ch.url);
      return { name: String(ch.name || '').trim(), id: String(ch.id || ch.name || '').trim(), logo: String(ch.logo || '').trim(), sources, url: sources.map((source) => source.url) };
    }

    function normalizeAll(groups) {
      return (Array.isArray(groups) ? groups : []).map((group) => ({
        group: String(group.group || group.name || '').trim(),
        id: group.id || '',
        channels: Array.isArray(group.channels) ? group.channels.map(normalizeChannel).filter((ch) => ch.name) : []
      })).filter((group) => group.group);
    }

    function html(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }

    function js(value) {
      return String(value ?? '').replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'").replace(/\\n/g, '\\\\n').replace(/\\r/g, '');
    }

    function applyTheme() {
      document.body.className = 'theme-' + currentTheme + ' min-h-screen p-4 md:p-8';
      document.getElementById('themeIcon').className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    function toggleTheme() {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('jptv_theme', currentTheme);
      applyTheme();
    }

    function getLogoUrl(logo) {
      if (!logo) return '/jptv.png';
      return String(logo).startsWith('http') ? logo : 'https://gcore.jsdelivr.net/gh/fanmingming/live/tv/' + encodeURIComponent(logo) + '.png';
    }

    function render() {
      raw = normalizeAll(raw);
      const app = document.getElementById('app');
      if (!raw.length) {
        app.innerHTML = '<div class="text-center py-20 opacity-50">暂无数据</div>';
        return;
      }

      app.innerHTML = raw.map((group, gi) => {
        const sourceOpen = isAuth && sourceState.open === gi;
        return \`
          <div class="glass-panel rounded-2xl p-6">
            <div class="flex items-center justify-between mb-6 border-b border-current/10 pb-4 gap-4">
              \${isAuth
                ? \`<input class="text-xl font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition w-full" value="\${html(group.group)}" onchange="raw[\${gi}].group=this.value" placeholder="分组名称">\`
                : \`<h2 class="text-xl font-bold flex items-center gap-2"><i class="fas fa-layer-group text-blue-500"></i> \${html(group.group)}</h2>\`
              }
              \${isAuth ? \`
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="toggleSource(\${gi})" class="icon-btn" title="源码"><i class="fas fa-code"></i></button>
                  <button onclick="moveGroup(\${gi}, -1)" class="icon-btn \${gi === 0 ? 'opacity-40 pointer-events-none' : ''}" title="上移"><i class="fas fa-arrow-up"></i></button>
                  <button onclick="moveGroup(\${gi}, 1)" class="icon-btn \${gi === raw.length - 1 ? 'opacity-40 pointer-events-none' : ''}" title="下移"><i class="fas fa-arrow-down"></i></button>
                  <button onclick="deleteGroup(\${gi})" class="icon-btn danger" title="删除"><i class="fas fa-trash-alt"></i></button>
                </div>\` : ''}
            </div>
            \${sourceOpen ? renderSourceEditor(group, gi) : renderChannelGrid(group, gi)}
          </div>\`;
      }).join('');
    }

    function renderChannelGrid(group, gi) {
      return \`<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        \${group.channels.map((channel, ci) => \`
          <div class="card rounded-xl"
            \${isAuth ? \`draggable="true" ondragstart="dragStart(event,\${gi},\${ci})" ondragover="event.preventDefault()" ondrop="dragDrop(event,\${gi},\${ci})"\` : ''}
            onclick="\${isAuth ? \`editChannel(\${gi},\${ci})\` : \`openLogo('\${js(getLogoUrl(channel.logo))}')\`}">
            <img src="\${html(getLogoUrl(channel.logo))}" class="channel-logo" onerror="this.src='/jptv.png'" alt="\${html(channel.name)}">
            <div class="text-center w-full px-2"><h3 class="font-bold text-sm truncate">\${html(channel.name)}</h3></div>
          </div>\`).join('')}
        \${isAuth ? \`<div onclick="addChannel(\${gi})" class="card rounded-xl border-dashed border-2 opacity-50 hover:opacity-100 text-blue-500"><i class="fas fa-plus text-3xl mb-2"></i><span class="font-bold text-sm">添加频道</span></div>\` : ''}
      </div>\`;
    }

    function renderSourceEditor(group, gi) {
      const content = getGroupSource(group, sourceState.format);
      const rows = Math.max(12, content.split('\\n').length);
      const lineNumbers = Array.from({ length: rows }, (_, index) => index + 1).join('<br>');
      const cardCount = group.channels.length + 1;
      const columns = window.innerWidth >= 1024 ? 6 : window.innerWidth >= 768 ? 3 : 2;
      const visualRows = Math.max(1, Math.ceil(cardCount / columns));
      const editorHeight = Math.min(560, Math.max(220, visualRows * 180 + (visualRows - 1) * 20));
      return \`
        <div class="source-editor rounded-xl" style="--source-height:\${editorHeight}px">
          <div class="source-titlebar flex items-center justify-between">
            <div class="source-tabs flex">
              \${['json', 'm3u', 'txt'].map((format) => \`<button onclick="switchSourceFormat('\${format}')" class="px-4 py-2 text-xs font-mono \${sourceState.format === format ? 'active' : ''}">\${format.toUpperCase()}</button>\`).join('')}
            </div>
            <div class="flex items-center gap-2 px-3">
              <button onclick="applyGroupSource(\${gi})" class="source-action apply text-xs px-3"><i class="fas fa-check"></i> 应用</button>
              <button onclick="toggleSource(\${gi})" class="source-action close text-xs" title="关闭"><i class="fas fa-xmark"></i></button>
            </div>
          </div>
          <div class="source-codewrap flex font-mono text-sm">
            <div id="source-lines-\${gi}" class="source-gutter text-right px-3 py-3 leading-[1.55]">\${lineNumbers}</div>
            <textarea id="source-editor-\${gi}" rows="\${rows}" oninput="updateLineNumbers(\${gi})" onscroll="syncSourceScroll(\${gi})" class="source-textarea flex-1 p-3" spellcheck="false">\${html(content)}</textarea>
          </div>
        </div>\`;
    }

    function openLogo(url) {
      window.open(url || '/jptv.png', '_blank', 'noopener,noreferrer');
    }

    function formatTitle(name, note) {
      const cleanNote = String(note || '').trim();
      return cleanNote ? name + ' | ' + cleanNote : name;
    }

    function getGroupSource(group, format) {
      if (format === 'json') return JSON.stringify(group, null, 2);
      if (format === 'm3u') {
        let output = '#EXTM3U\\n';
        group.channels.forEach((channel) => {
          normalizeSources(channel.sources || channel.url).forEach((source) => {
            output += \`#EXTINF:-1 tvg-id="\${channel.id || channel.name}" tvg-name="\${channel.name}" tvg-logo="\${getLogoUrl(channel.logo)}" group-title="\${group.group}",\${formatTitle(channel.name, source.note)}\\n\${source.url}\\n\`;
          });
        });
        return output.trimEnd();
      }
      const lines = [group.group + ',#genre#'];
      group.channels.forEach((channel) => {
        normalizeSources(channel.sources || channel.url).forEach((source) => lines.push(formatTitle(channel.name, source.note) + ',' + source.url));
      });
      return lines.join('\\n');
    }

    function updateLineNumbers(gi) {
      const editor = document.getElementById('source-editor-' + gi);
      const gutter = document.getElementById('source-lines-' + gi);
      const count = Math.max(12, editor.value.split('\\n').length);
      gutter.innerHTML = Array.from({ length: count }, (_, index) => index + 1).join('<br>');
      syncSourceScroll(gi);
    }

    function syncSourceScroll(gi) {
      const editor = document.getElementById('source-editor-' + gi);
      const gutter = document.getElementById('source-lines-' + gi);
      if (editor && gutter) gutter.scrollTop = editor.scrollTop;
    }

    function toggleSource(gi) {
      sourceState.open = sourceState.open === gi ? null : gi;
      render();
    }

    function switchSourceFormat(format) {
      sourceState.format = format;
      render();
    }

    function applyGroupSource(gi) {
      const text = document.getElementById('source-editor-' + gi).value;
      try {
        const groups = parseImport(text, sourceState.format, raw[gi].group);
        if (!groups.length) throw new Error('没有解析到频道数据');
        raw[gi] = normalizeAll(groups)[0];
        sourceState.open = null;
        render();
      } catch (error) {
        Swal.fire('解析失败', error.message, 'error');
      }
    }

    async function editChannel(gi, ci, isNew = false) {
      const channel = raw[gi].channels[ci] || { name: '', id: '', logo: '', sources: [{ url: '', note: '' }] };
      const sources = normalizeSources(channel.sources || channel.url);
      const sourceRows = (sources.length ? sources : [{ url: '', note: '' }]).map((source, index) => sourceRow(source, index)).join('');
      const { value, isDenied } = await Swal.fire({
        title: isNew ? '添加频道' : '编辑频道',
        width: 760,
        background: currentTheme === 'dark' ? '#1e293b' : '#fff',
        color: currentTheme === 'dark' ? '#fff' : '#333',
        html: \`<div class="space-y-4 text-left">
          <div class="flex gap-3 items-center">
            <img id="s-logo-preview" src="\${html(getLogoUrl(channel.logo))}" onerror="this.src='/jptv.png'" class="channel-logo-preview" alt="Logo">
            <input id="s-name" placeholder="名称" class="w-full p-2 border rounded bg-transparent" value="\${html(channel.name)}">
          </div>
          <div class="flex gap-2">
            <input id="s-id" placeholder="ID" class="flex-1 p-2 border rounded bg-transparent" value="\${html(channel.id)}">
            <input id="s-logo" placeholder="Logo" class="flex-1 p-2 border rounded bg-transparent" value="\${html(channel.logo)}" oninput="updateChannelLogoPreview()">
          </div>
          <div id="sourceRows" class="space-y-2">\${sourceRows}</div>
          <button type="button" onclick="addSourceRow()" class="px-3 py-2 rounded bg-blue-600 text-white text-sm"><i class="fas fa-plus"></i> 添加链接</button>
        </div>\`,
        showDenyButton: !isNew,
        denyButtonText: '删除',
        confirmButtonText: '保存',
        showCancelButton: true,
        didOpen: () => {
          window.addSourceRow = addSourceRow;
          window.removeSourceRow = removeSourceRow;
          window.updateChannelLogoPreview = updateChannelLogoPreview;
          updateChannelLogoPreview();
        },
        preConfirm: () => {
          const name = document.getElementById('s-name').value.trim();
          const rows = Array.from(document.querySelectorAll('.source-row')).map((row) => ({
            url: row.querySelector('.source-url').value.trim(),
            note: row.querySelector('.source-note').value.trim()
          })).filter((source) => source.url);
          if (!name || !rows.length) return Swal.showValidationMessage('名称和链接不能为空');
          return { name, id: document.getElementById('s-id').value.trim() || name, logo: document.getElementById('s-logo').value.trim(), sources: rows, url: rows.map((source) => source.url) };
        }
      });

      if (value) {
        raw[gi].channels[ci] = value;
        render();
      } else if (isDenied) {
        raw[gi].channels.splice(ci, 1);
        render();
      }
    }

    function sourceRow(source = {}, index = 0) {
      return \`<div class="source-row grid grid-cols-[1fr_180px_36px] gap-2 items-center">
        <input class="source-url p-2 border rounded bg-transparent font-mono text-xs" placeholder="URL" value="\${html(source.url || '')}">
        <input class="source-note p-2 border rounded bg-transparent text-sm" placeholder="备注，可留空" value="\${html(source.note || '')}">
        <button type="button" onclick="removeSourceRow(this)" class="h-9 rounded bg-red-500/10 text-red-500"><i class="fas fa-trash"></i></button>
      </div>\`;
    }

    function updateChannelLogoPreview() {
      const input = document.getElementById('s-logo');
      const preview = document.getElementById('s-logo-preview');
      if (!preview) return;
      preview.src = getLogoUrl(input?.value || '');
    }

    function addSourceRow() {
      document.getElementById('sourceRows').insertAdjacentHTML('beforeend', sourceRow());
    }

    function removeSourceRow(button) {
      const rows = document.querySelectorAll('.source-row');
      if (rows.length === 1) {
        rows[0].querySelector('.source-url').value = '';
        rows[0].querySelector('.source-note').value = '';
        return;
      }
      button.closest('.source-row').remove();
    }

    function dragStart(event, gi, ci) {
      dragSrc = { gi, ci };
      event.currentTarget.classList.add('dragging');
    }

    function dragDrop(event, tgi, tci) {
      if (!dragSrc) return;
      const [item] = raw[dragSrc.gi].channels.splice(dragSrc.ci, 1);
      raw[tgi].channels.splice(tci, 0, item);
      dragSrc = null;
      render();
    }

    function addGroup() {
      raw.push({ group: '新分组', channels: [] });
      render();
    }

    function addChannel(gi) {
      editChannel(gi, raw[gi].channels.length, true);
    }

    function moveGroup(index, direction) {
      if (!raw[index + direction]) return;
      [raw[index], raw[index + direction]] = [raw[index + direction], raw[index]];
      render();
    }

    function deleteGroup(index) {
      Swal.fire({ title: '删除分组？', icon: 'warning', showCancelButton: true }).then((result) => {
        if (result.isConfirmed) {
          raw.splice(index, 1);
          render();
        }
      });
    }

    async function openExportDialog() {
      const { value: format } = await Swal.fire({
        title: '导出频道',
        width: 560,
        background: currentTheme === 'dark' ? '#1e293b' : '#fff',
        color: currentTheme === 'dark' ? '#fff' : '#333',
        html: formatPickerHtml('export-format', 'json'),
        showCancelButton: true,
        confirmButtonText: '导出',
        cancelButtonText: '取消',
        preConfirm: () => document.querySelector('input[name="export-format"]:checked')?.value || 'json'
      });
      if (format) downloadExport(format);
    }

    function formatPickerHtml(name, selected = 'json', includeAuto = false) {
      const items = [
        ...(includeAuto ? [{ value: 'auto', icon: 'fa-wand-magic-sparkles', label: '自动', desc: '识别格式' }] : []),
        { value: 'json', icon: 'fa-database', label: 'JSON', desc: '完整备份' },
        { value: 'm3u', icon: 'fa-list', label: 'M3U', desc: '订阅格式' },
        { value: 'txt', icon: 'fa-file-lines', label: 'TXT', desc: '订阅格式' }
      ];
      return \`<div class="format-choice text-left">\${items.map((item) => \`
        <label>
          <input type="radio" name="\${name}" value="\${item.value}" \${item.value === selected ? 'checked' : ''}>
          <span><i class="fas \${item.icon}"></i></span>
          <span><strong class="block">\${item.label}</strong><small class="opacity-70">\${item.desc}</small></span>
        </label>\`).join('')}</div>\`;
    }

    function downloadExport(format) {
      const content = format === 'json' ? JSON.stringify(normalizeAll(raw), null, 2) : format === 'm3u' ? exportM3U(raw) : exportTXT(raw);
      const mime = format === 'json' ? 'application/json' : 'text/plain';
      const blob = new Blob([content], { type: mime + ';charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'jptv_' + new Date().toISOString().slice(0, 10) + '.' + format;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function exportM3U(groups) {
      return normalizeAll(groups).map((group) => getGroupSource(group, 'm3u')).join('\\n\\n') + '\\n';
    }

    function exportTXT(groups) {
      return normalizeAll(groups).map((group) => getGroupSource(group, 'txt')).join('\\n\\n') + '\\n';
    }

    async function globalImport() {
      const { value } = await Swal.fire({
        title: '导入频道',
        width: 760,
        background: currentTheme === 'dark' ? '#1e293b' : '#fff',
        color: currentTheme === 'dark' ? '#fff' : '#333',
        html: \`<div class="space-y-4 text-left">
          \${formatPickerHtml('import-format', 'auto', true)}
          <input id="import-file" type="file" accept=".json,.m3u,.m3u8,.txt,application/json,text/plain" class="w-full p-2 border rounded bg-transparent">
          <textarea id="import-code" class="w-full p-3 border rounded bg-transparent font-mono text-xs h-56" placeholder="粘贴 JSON / M3U / TXT 代码"></textarea>
        </div>\`,
        showCancelButton: true,
        confirmButtonText: '导入',
        preConfirm: async () => {
          const file = document.getElementById('import-file').files[0];
          const pasted = document.getElementById('import-code').value.trim();
          const selectedFormat = document.querySelector('input[name="import-format"]:checked')?.value || 'auto';
          if (file) return { text: await file.text(), name: file.name, format: selectedFormat };
          if (pasted) return { text: pasted, name: '', format: selectedFormat };
          return Swal.showValidationMessage('请选择文件或粘贴代码');
        }
      });
      if (!value) return;

      try {
        const format = value.format === 'auto' ? detectFormat(value.text, value.name) : value.format;
        const groups = parseImport(value.text, format);
        raw = normalizeAll(groups);
        sourceState.open = null;
        render();
        Swal.fire('导入成功', '已自动识别并载入频道数据', 'success');
      } catch (error) {
        Swal.fire('导入失败', error.message, 'error');
      }
    }

    function detectFormat(text, name = '') {
      const lower = name.toLowerCase();
      if (lower.endsWith('.json')) return 'json';
      if (lower.endsWith('.m3u') || lower.endsWith('.m3u8')) return 'm3u';
      if (lower.endsWith('.txt')) return 'txt';
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
      if (trimmed.startsWith('#EXTM3U') || trimmed.includes('#EXTINF')) return 'm3u';
      return 'txt';
    }

    function parseImport(text, format = detectFormat(text), fallbackGroup = '导入分组') {
      if (format === 'json') {
        const data = JSON.parse(text);
        return normalizeAll(Array.isArray(data) ? data : [data]);
      }
      if (format === 'm3u') return parseM3U(text, fallbackGroup);
      return parseTXT(text, fallbackGroup);
    }

    function parseM3U(text, fallbackGroup) {
      const groups = new Map();
      const lines = text.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);
      let meta = null;
      lines.forEach((line) => {
        if (line.startsWith('#EXTINF')) {
          const name = (line.split(',').pop() || '').trim();
          const attrs = Object.fromEntries([...line.matchAll(/([\\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
          meta = { name, group: attrs['group-title'] || fallbackGroup, id: attrs['tvg-id'] || name, logo: attrs['tvg-logo'] || '' };
          return;
        }
        if (line.startsWith('#') || !meta) return;
        const parsed = splitTitle(meta.name);
        pushParsed(groups, meta.group, { name: parsed.name, id: meta.id || parsed.name, logo: meta.logo, source: { url: line, note: parsed.note } });
        meta = null;
      });
      return [...groups.values()];
    }

    function parseTXT(text, fallbackGroup) {
      const groups = new Map();
      let currentGroup = fallbackGroup;
      text.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
        const comma = line.indexOf(',');
        if (comma === -1) return;
        const left = line.slice(0, comma).trim();
        const right = line.slice(comma + 1).trim();
        if (right === '#genre#') {
          currentGroup = left || fallbackGroup;
          if (!groups.has(currentGroup)) groups.set(currentGroup, { group: currentGroup, channels: [] });
          return;
        }
        const parsed = splitTitle(left);
        pushParsed(groups, currentGroup, { name: parsed.name, id: parsed.name, logo: '', source: { url: right, note: parsed.note } });
      });
      return [...groups.values()];
    }

    function splitTitle(title) {
      const parts = String(title || '').split('|').map((part) => part.trim());
      return { name: parts[0] || '未命名频道', note: parts.slice(1).join(' | ') };
    }

    function pushParsed(groups, groupName, item) {
      if (!groups.has(groupName)) groups.set(groupName, { group: groupName, channels: [] });
      const group = groups.get(groupName);
      let channel = group.channels.find((ch) => ch.name === item.name && ch.logo === item.logo);
      if (!channel) {
        channel = { name: item.name, id: item.id || item.name, logo: item.logo || '', sources: [], url: [] };
        group.channels.push(channel);
      }
      channel.sources.push(item.source);
      channel.url.push(item.source.url);
    }

    async function saveData() {
      const btn = document.getElementById('saveBtn');
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 部署中...';
      btn.disabled = true;
      try {
        const response = await fetch('/api/manage?token=' + encodeURIComponent(currentToken), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newData: normalizeAll(raw) })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || '保存失败');
        Swal.fire({ icon: 'success', title: '部署已触发' });
      } catch (error) {
        Swal.fire('错误', error.message, 'error');
      } finally {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 保存并部署';
        btn.disabled = false;
      }
    }

    applyTheme();
    render();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
