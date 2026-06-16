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
    body.theme-light { background: #f3f4f6; color: #1f2937; }
    .theme-light .glass-panel { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid #e5e7eb; }
    .theme-light .card { background: rgba(255, 255, 255, 0.9); border: 1px solid #e5e7eb; }
    body.theme-dark { background: #0f172a; color: #f1f5f9; }
    .theme-dark .glass-panel { background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px); }
    .theme-dark .card { background: #1e293b; border: 1px solid #334155; }
    .card { cursor: pointer; transition: all 0.2s ease; height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; position: relative; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .channel-logo { height: 64px; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); pointer-events: none; }
    .dragging { opacity: 0.4; border: 2px dashed #3b82f6 !important; }
    .source-editor { background: #1e1e1e; color: #d4d4d4; border: 1px solid #3c3c3c; overflow: hidden; }
    .source-titlebar { background: #252526; border-bottom: 1px solid #3c3c3c; color: #cccccc; }
    .source-tabs button { color: #969696; border-right: 1px solid #3c3c3c; }
    .source-tabs button.active { background: #1e1e1e; color: #ffffff; }
    .source-textarea { background: #1e1e1e; color: #d4d4d4; border: 0; outline: none; resize: vertical; tab-size: 2; line-height: 1.55; }
    .source-gutter { background: #1e1e1e; color: #858585; user-select: none; border-right: 1px solid #2d2d2d; }
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
          <button onclick="downloadExport('json')" class="px-3 py-2 hover:bg-current/10 rounded-lg transition flex items-center gap-2 text-xs font-medium"><i class="fas fa-database"></i> JSON 备份</button>
          <button onclick="downloadExport('m3u')" class="px-3 py-2 hover:bg-current/10 rounded-lg transition flex items-center gap-2 text-xs font-medium"><i class="fas fa-list"></i> M3U 订阅</button>
          <button onclick="downloadExport('txt')" class="px-3 py-2 hover:bg-current/10 rounded-lg transition flex items-center gap-2 text-xs font-medium"><i class="fas fa-file-lines"></i> TXT 订阅</button>
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
                  <button onclick="toggleSource(\${gi})" class="p-2 text-blue-400" title="源码"><i class="fas fa-code"></i></button>
                  <button onclick="moveGroup(\${gi}, -1)" class="p-2 text-blue-400 \${gi === 0 ? 'opacity-20' : ''}" title="上移"><i class="fas fa-arrow-up"></i></button>
                  <button onclick="moveGroup(\${gi}, 1)" class="p-2 text-blue-400 \${gi === raw.length - 1 ? 'opacity-20' : ''}" title="下移"><i class="fas fa-arrow-down"></i></button>
                  <button onclick="deleteGroup(\${gi})" class="text-red-400 p-2" title="删除"><i class="fas fa-trash-alt"></i></button>
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
      return \`
        <div class="source-editor rounded-xl">
          <div class="source-titlebar flex items-center justify-between">
            <div class="source-tabs flex">
              \${['json', 'm3u', 'txt'].map((format) => \`<button onclick="switchSourceFormat('\${format}')" class="px-4 py-2 text-xs font-mono \${sourceState.format === format ? 'active' : ''}">\${format.toUpperCase()}</button>\`).join('')}
            </div>
            <div class="flex items-center gap-2 px-3">
              <button onclick="applyGroupSource(\${gi})" class="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white"><i class="fas fa-check"></i> 应用</button>
              <button onclick="toggleSource(\${gi})" class="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white"><i class="fas fa-xmark"></i></button>
            </div>
          </div>
          <div class="flex font-mono text-sm">
            <div id="source-lines-\${gi}" class="source-gutter text-right px-3 py-3 leading-[1.55]">\${lineNumbers}</div>
            <textarea id="source-editor-\${gi}" rows="\${rows}" oninput="updateLineNumbers(\${gi})" class="source-textarea flex-1 p-3 min-h-[360px]" spellcheck="false">\${html(content)}</textarea>
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
          <input id="s-name" placeholder="名称" class="w-full p-2 border rounded bg-transparent" value="\${html(channel.name)}">
          <div class="flex gap-2">
            <input id="s-id" placeholder="ID" class="flex-1 p-2 border rounded bg-transparent" value="\${html(channel.id)}">
            <input id="s-logo" placeholder="Logo" class="flex-1 p-2 border rounded bg-transparent" value="\${html(channel.logo)}">
          </div>
          <div id="sourceRows" class="space-y-2">\${sourceRows}</div>
          <button type="button" onclick="addSourceRow()" class="px-3 py-2 rounded bg-blue-600 text-white text-sm"><i class="fas fa-plus"></i> 添加链接</button>
        </div>\`,
        showDenyButton: !isNew,
        denyButtonText: '删除',
        confirmButtonText: '保存',
        showCancelButton: true,
        didOpen: () => { window.addSourceRow = addSourceRow; window.removeSourceRow = removeSourceRow; },
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
        html: \`<div class="space-y-4 text-left">
          <input id="import-file" type="file" accept=".json,.m3u,.m3u8,.txt,application/json,text/plain" class="w-full p-2 border rounded bg-transparent">
          <textarea id="import-code" class="w-full p-3 border rounded bg-transparent font-mono text-xs h-56" placeholder="粘贴 JSON / M3U / TXT 代码"></textarea>
        </div>\`,
        showCancelButton: true,
        confirmButtonText: '导入',
        preConfirm: async () => {
          const file = document.getElementById('import-file').files[0];
          const pasted = document.getElementById('import-code').value.trim();
          if (file) return { text: await file.text(), name: file.name };
          if (pasted) return { text: pasted, name: '' };
          return Swal.showValidationMessage('请选择文件或粘贴代码');
        }
      });
      if (!value) return;

      try {
        const groups = parseImport(value.text, detectFormat(value.text, value.name));
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
