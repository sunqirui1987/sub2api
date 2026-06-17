const { escapeHtml } = require('./format')

function renderPage(config) {
  const pageTitle = `${config.serviceName} 运维监控`
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      --bg: #eef8f8;
      --panel: #fff;
      --soft: #f8fafc;
      --line: #e6eaf0;
      --text: #111827;
      --muted: #7b8494;
      --blue: #4f7deb;
      --blue-soft: #dbeafe;
      --green: #48a868;
      --red: #d93a35;
      --shadow: 0 18px 50px rgba(15, 23, 42, .08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background: radial-gradient(circle at 18% -10%, rgba(120,210,198,.22), transparent 34rem), radial-gradient(circle at 100% 10%, rgba(156,192,245,.20), transparent 30rem), linear-gradient(180deg, #f8fbfd 0, var(--bg) 22rem, #f9fafb 100%);
    }
    button, input, select { font: inherit; }
    .topbar { height: 38px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; border-bottom: 1px solid rgba(226,232,240,.72); background: rgba(255,255,255,.78); backdrop-filter: blur(14px); color: #697386; font-size: 13px; font-weight: 700; }
    .admin-chip { display: flex; gap: 10px; align-items: center; }
    .avatar { width: 30px; height: 30px; border-radius: 999px; background: #49a79b; box-shadow: inset 0 -8px 18px rgba(0,0,0,.1); }
    .logout-form { margin: 0; }
    .logout-btn { height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: #647084; font-size: 12px; font-weight: 900; cursor: pointer; }
    .shell { width: min(1680px, calc(100vw - 56px)); margin: 26px auto 30px; }
    .dashboard { background: rgba(255,255,255,.86); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow); padding: 24px; }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
    .title-wrap { display: flex; align-items: flex-start; gap: 15px; min-width: 250px; }
    .mark { width: 30px; height: 30px; color: var(--blue); flex: 0 0 auto; }
    h1 { margin: 0 0 5px; font-size: 22px; line-height: 1.15; letter-spacing: 0; }
    .statusline { color: var(--muted); font-size: 13px; font-weight: 700; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #50c767; display: inline-block; }
    .dot.bad { background: var(--red); }
    .controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
    .select, .icon-btn, .action-btn { height: 42px; border: 1px solid var(--line); border-radius: 11px; background: #fff; color: #334155; font-size: 14px; font-weight: 800; box-shadow: 0 2px 4px rgba(15,23,42,.03); }
    .select { min-width: 230px; padding: 0 15px; }
    .icon-btn { width: 42px; display: grid; place-items: center; cursor: pointer; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 0 18px; cursor: pointer; background: #f5f7fa; text-decoration: none; }
    .action-btn.primary { background: var(--blue-soft); color: #2f62dc; border-color: transparent; }
    .divider { width: 1px; height: 28px; background: var(--line); }
    .main-grid { display: grid; grid-template-columns: minmax(0, .78fr) minmax(0, 1.42fr); gap: 18px; padding-top: 20px; align-items: stretch; }
    .hero-card, .metric-card, .small-card { background: var(--soft); border-radius: 22px; border: 1px solid rgba(241,245,249,.8); }
    .hero-card, .cards { min-width: 0; }
    .hero-card { min-height: 330px; padding: 24px 28px; display: grid; grid-template-columns: minmax(160px, .78fr) minmax(240px, 1.22fr); align-items: center; gap: 22px; }
    .health-panel { height: 200px; border-right: 1px solid #e2e8f0; display: grid; place-items: center; text-align: center; min-width: 0; }
    .ring { width: 104px; height: 104px; border: 10px solid #a6adb8; border-radius: 50%; display: grid; place-items: center; color: #9aa3b2; margin-bottom: 16px; }
    .ring.good { border-color: #71c58b; color: var(--green); }
    .ring.warn { border-color: #f0aa30; color: #e6a51f; }
    .ring.bad { border-color: #d9625d; color: var(--red); }
    .ring strong { display: block; font-size: 27px; line-height: 1; letter-spacing: 0; }
    .ring span { display: block; margin-top: 6px; font-size: 12px; font-weight: 800; }
    .health-label { color: #687386; font-weight: 900; font-size: 14px; }
    .health-label small { color: #8993a3; display: block; margin-top: 5px; font-size: 13px; }
    .live-title { display: flex; gap: 8px; align-items: center; color: #9aa3b2; font-size: 14px; font-weight: 900; margin-bottom: 12px; white-space: nowrap; }
    .blue-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--blue); }
    .segments { display: flex; gap: 7px; margin-bottom: 16px; flex-wrap: wrap; }
    .seg { border: 0; height: 25px; min-width: 46px; padding: 0 9px; border-radius: 5px; background: #e4e8ee; color: #647084; font-size: 12px; font-weight: 900; }
    .seg.active { background: var(--blue); color: white; }
    .label { color: #a0a9b7; font-size: 12px; font-weight: 900; }
    .current { display: grid; grid-template-columns: repeat(2, minmax(0, max-content)); gap: 24px; align-items: baseline; margin: 8px 0 24px; }
    .big { font-size: clamp(23px, 1.5vw, 30px); font-weight: 950; letter-spacing: 0; color: #111827; }
    .unit { font-size: 12px; color: #667085; font-weight: 900; margin-left: 5px; white-space: nowrap; }
    .substats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 30px; margin-bottom: 24px; }
    .substats strong { color: #111827; font-size: 15px; margin-right: 5px; }
    .spark { width: 100%; height: 38px; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(185px, 1fr)); gap: 16px; align-content: stretch; }
    .metric-card { min-height: 150px; padding: 17px; overflow: hidden; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 9px; color: #a0a9b7; font-size: 13px; line-height: 1.3; font-weight: 900; margin-bottom: 11px; }
    .card-head > span:first-child { min-width: 0; }
    .card-link { border: 0; background: transparent; padding: 0; color: var(--blue); font-size: 13px; font-weight: 950; white-space: nowrap; flex: 0 0 auto; cursor: pointer; } .card-link:hover { text-decoration: underline; }
    .metric-main { display: flex; align-items: baseline; flex-wrap: nowrap; min-width: 0; font-size: clamp(24px, 1.5vw, 31px); font-weight: 950; letter-spacing: 0; margin-bottom: 10px; white-space: nowrap; }
    .metric-card .unit { font-size: 11px; margin-left: 4px; }
    .green { color: var(--green); }
    .red { color: var(--red); }
    .progress { height: 13px; background: #e2e5eb; border-radius: 999px; overflow: hidden; margin: 18px 0 24px; }
    .bar { height: 100%; background: var(--red); width: 0; border-radius: inherit; }
    .kv { display: grid; gap: 5px; color: #7a8493; font-size: 12px; line-height: 1.32; font-weight: 750; }
    .kv div { display: flex; justify-content: space-between; gap: 20px; }
    .section-line { border-top: 1px solid var(--line); margin: 30px 0 22px; }
    .small-grid { display: grid; grid-template-columns: repeat(6, minmax(150px, 1fr)); gap: 20px; }
    .small-card { min-height: 108px; padding: 16px; }
    .small-title { color: #a0a9b7; font-size: 12px; font-weight: 950; letter-spacing: .06em; margin-bottom: 9px; display: flex; gap: 8px; align-items: center; }
    .small-value { font-size: 21px; color: var(--green); font-weight: 950; margin-bottom: 8px; }
    .small-copy { color: #7a8493; font-size: 12px; font-weight: 750; line-height: 1.4; }
    .below { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 26px; margin-top: 36px; }
    .panel { background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: 28px; padding: 26px; min-height: 240px; }
    .panel h2 { margin: 0 0 18px; font-size: 20px; letter-spacing: 0; }
    .check { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); color: #647084; font-weight: 750; }
    .check:last-child { border-bottom: 0; }
    .canvas-wrap { height: 155px; }
    .modal-backdrop { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: 32px; background: rgba(15, 23, 42, .45); backdrop-filter: blur(6px); z-index: 40; }
    .modal-backdrop.open { display: flex; }
    .modal { width: min(1880px, 96vw); max-height: 92vh; overflow: hidden; display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: 26px; box-shadow: 0 28px 80px rgba(15, 23, 42, .22); }
    .modal-header { height: 96px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 34px; border-bottom: 1px solid var(--line); }
    .modal-title { margin: 0; font-size: 24px; font-weight: 950; }
    .modal-close { width: 54px; height: 54px; border: 3px solid #3167c9; border-radius: 18px; background: #f8fafc; color: #475569; font-size: 34px; line-height: 1; cursor: pointer; }
    .modal-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 34px; color: #7b8494; font-weight: 800; }
    .details-toolbar { align-items: flex-end; flex-wrap: wrap; }
    .details-meta { min-width: 180px; display: grid; gap: 5px; font-size: 13px; }
    .detail-filters { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
    .filter-input, .filter-select { height: 42px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: #334155; font-size: 13px; font-weight: 800; outline: none; }
    .filter-input { width: 160px; padding: 0 12px; }
    .filter-input.keyword { width: 220px; }
    .filter-input.code { width: 98px; }
    .filter-select { min-width: 112px; padding: 0 10px; }
    .modal-refresh { height: 42px; padding: 0 20px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: #334155; font-weight: 900; cursor: pointer; box-shadow: 0 3px 10px rgba(15, 23, 42, .06); }
    .modal-refresh.secondary { color: #647084; background: #f8fafc; }
    .table-wrap { margin: 0 34px 34px; border: 1px solid var(--line); border-radius: 16px; overflow: auto; }
    .detail-table { width: 100%; border-collapse: collapse; min-width: 1180px; }
    .detail-table th, .detail-table td { padding: 18px 24px; border-bottom: 1px solid var(--line); text-align: left; color: #647084; font-size: 16px; font-weight: 750; white-space: nowrap; }
    .detail-table th { background: #f8fafc; color: #7b8494; font-weight: 950; }
    .detail-table tr:last-child td { border-bottom: 0; }
    .badge { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-weight: 950; }
    .badge.error { color: #d93a35; background: #fde8e8; }
    .badge.ok { color: #23945b; background: #e7f7ed; }
    .copy-btn, .error-btn { height: 32px; border: 0; border-radius: 8px; font-weight: 900; cursor: pointer; position: relative; }
    .copy-btn { padding: 0 12px; color: #4b5563; background: #f1f5f9; user-select: none; }
    .copy-btn:hover { background: #e2e8f0; color: #1f2937; }
    .copy-btn.copied { color: #23945b; background: #e7f7ed; }
    .error-btn { padding: 0 16px; color: #d93a35; background: #fff1f1; }
    .error-detail-modal { width: min(1120px, 94vw); }
    .error-pre { margin: 0 34px 34px; padding: 18px; max-height: 58vh; overflow: auto; border: 1px solid var(--line); border-radius: 14px; background: #0f172a; color: #dbeafe; font: 12px/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; word-break: break-word; }
    .empty { padding: 46px; text-align: center; color: #94a3b8; font-weight: 850; }
    @media (max-width: 1500px) { .main-grid { grid-template-columns: 1fr; } .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } .small-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .below { grid-template-columns: 1fr; } }
    @media (max-width: 980px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hero-card { grid-template-columns: 1fr; } .health-panel { border-right: 0; border-bottom: 1px solid var(--line); padding-bottom: 26px; } }
    @media (max-width: 820px) { .shell { width: min(100vw - 20px, 760px); margin-top: 18px; } .dashboard { padding: 18px; border-radius: 22px; } .heading { align-items: flex-start; flex-direction: column; } .controls { justify-content: stretch; width: 100%; gap: 10px; } .select { min-width: 0; width: 100%; } .hero-card { grid-template-columns: 1fr; padding: 26px; min-height: 0; } .health-panel { border-right: 0; border-bottom: 1px solid var(--line); padding-bottom: 26px; } .cards, .small-grid { grid-template-columns: 1fr; } .detail-filters { width: 100%; justify-content: stretch; } .filter-input, .filter-select, .modal-refresh { width: 100%; } }
  </style>
</head>
<body>
  <div class="topbar"><div>运维监控与排障</div><div class="admin-chip"><span class="avatar"></span><span>${escapeHtml(config.authUsername)}</span><form class="logout-form" method="post" action="${escapeHtml(config.pagePath)}/logout"><button class="logout-btn" type="submit">退出</button></form></div></div>
  <main class="shell">
    <section class="dashboard">
      <header class="heading">
        <div class="title-wrap">
          <svg class="mark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 19V10.5a2 2 0 0 1 2-2h2V19H6Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 19V6.5a2 2 0 0 1 2-2h2V19h-4Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 19V3.5a2 2 0 0 1 2-2h2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
          <div><h1>运维监控</h1><div class="statusline"><span class="dot" id="statusDot"></span><span id="healthText">就绪</span><span>·</span><span>刷新: <span id="updatedAt">-</span></span></div></div>
        </div>
        <div class="controls">
          <select class="select" id="targetSelect" aria-label="服务器"></select>
          <span class="divider"></span>
          <select class="select" id="timeRangeSelect" aria-label="时间范围"><option value="5m">近5分钟</option><option value="30m">近30分钟</option><option value="1h" selected>近1小时</option><option value="6h">近6小时</option><option value="24h">近24小时</option></select>
          <button class="icon-btn" id="refreshBtn" title="刷新">↻</button>
          <span class="divider"></span>
          <a class="action-btn primary" id="settingsLink" target="_blank" rel="noreferrer">⚙ <span>后台设置</span></a>
          <button class="icon-btn" id="fullscreenBtn" title="全屏">⛶</button>
        </div>
      </header>
      <div class="main-grid">
        <section class="hero-card">
          <div class="health-panel"><div><div class="ring" id="healthRing"><div><strong id="ringText">待机</strong><span id="ringSub">健康</span></div></div><div class="health-label">健康状况 <span title="服务健康评分">ⓘ</span><small id="healthSmall">待机</small></div></div></div>
          <div>
            <div class="live-title"><span class="blue-dot"></span><span>实时信息</span><span title="来自选中服务器的聚合指标">ⓘ</span></div>
            <div class="segments"><button class="seg active" data-window="1min">1min</button><button class="seg" data-window="5min">5min</button><button class="seg" data-window="30min">30min</button><button class="seg" data-window="1h">1h</button></div>
            <div class="label">当前</div>
            <div class="current"><div><span class="big" id="qps">0.0</span><span class="unit">QPS</span></div><div><span class="big" id="tps">0.0</span><span class="unit">TPS</span></div></div>
            <div class="substats"><div><div class="label">峰值</div><strong id="peakQps">0.0</strong><span class="unit">QPS</span></div><div><div class="label">平均</div><strong id="avgQps">0.0</strong><span class="unit">QPS</span></div><div><strong id="peakTps">0.0</strong><span class="unit">TPS</span></div><div><strong id="avgTps">0.0</strong><span class="unit">TPS</span></div></div>
            <svg class="spark" id="sparkline" viewBox="0 0 420 46" preserveAspectRatio="none"></svg>
          </div>
        </section>
        <section class="cards">
          ${metricCard('请求', 'requestCount', '', [['Token数:', 'tokenCount'], ['平均 QPS:', 'avgQpsCard'], ['平均 TPS:', 'avgTpsCard']], '', false, 'requests')}
          ${metricCard('SLA（排除业务限制）', 'sla', '%', [['异常数:', 'slaErrors']], 'red', true, 'errors')}
          ${metricCard('请求错误', 'errorRate', '%', [['错误数:', 'errorCount'], ['业务限制:', 'requestCountSmall']], 'green', false, 'errors')}
          ${metricCard('请求时长', 'durationP99', 'ms (P99)', [['P95:', 'durationP95'], ['P90:', 'durationP90'], ['P50:', 'durationP50'], ['Avg:', 'durationAvg'], ['Max:', 'durationMax']], '', false, 'requests')}
          ${metricCard('TTFT', 'ttftP99', 'ms (P99)', [['P95:', 'ttftP95'], ['P90:', 'ttftP90'], ['P50:', 'ttftP50'], ['Avg:', 'ttftAvg'], ['Max:', 'ttftMax']], 'green', false, 'requests')}
          ${metricCard('上游错误', 'upstreamErrorRate', '%', [['错误数（排除429/529）:', 'upstreamErrorCount'], ['429/529:', 'upstream429529']], 'green', false, 'upstream')}
        </section>
      </div>
      <div class="section-line"></div>
      <section class="small-grid">${smallCard('CPU', 'cpuValue', '警告 80% · 严重 95%')}${smallCard('内存', 'memoryValue', 'processMemory')}${smallCard('数据库', 'dbValue', 'dbCopy')}${smallCard('REDIS', 'redisValue', 'redisCopy')}${smallCard('协程', 'workerValue', 'workerCopy')}${smallCard('后台任务', 'jobsValue', 'jobsCopy')}</section>
      <section class="below"><div class="panel"><h2>吞吐趋势</h2><div class="canvas-wrap"><canvas id="trendCanvas"></canvas></div></div><div class="panel"><h2>健康检查</h2><div id="checks"></div></div><div class="panel"><h2>运行信息</h2><div id="runtime"></div></div></section>
    </section>
  </main>
  <div class="modal-backdrop" id="detailsModal" role="dialog" aria-modal="true" aria-labelledby="detailsTitle">
    <section class="modal">
      <header class="modal-header"><h2 class="modal-title" id="detailsTitle">请求明细</h2><button class="modal-close" id="detailsClose" aria-label="关闭">×</button></header>
      <div class="modal-toolbar details-toolbar">
        <div class="details-meta"><div id="detailsWindow">窗口：1 小时</div><div id="detailsCount">条目：0</div></div>
        <div class="detail-filters">
          <input class="filter-input keyword" id="filterKeyword" type="search" placeholder="关键字 / 请求ID">
          <input class="filter-input" id="filterPlatform" type="search" placeholder="平台">
          <input class="filter-input" id="filterModel" type="search" placeholder="模型">
          <input class="filter-input code" id="filterStatusCode" inputmode="numeric" placeholder="状态码">
          <select class="filter-select" id="filterStatus" aria-label="状态"><option value="">全部状态</option><option value="success">成功</option><option value="error">失败</option></select>
          <select class="filter-select" id="detailsPageSize" aria-label="条目数"><option value="50">50 条</option><option value="100" selected>100 条</option><option value="200">200 条</option><option value="500">500 条</option></select>
          <button class="modal-refresh secondary" id="detailsClear" type="button">清空</button>
          <button class="modal-refresh" id="detailsRefresh" type="button">筛选</button>
        </div>
      </div>
      <div class="table-wrap"><table class="detail-table"><thead id="detailsHead"></thead><tbody id="detailsBody"></tbody></table><div class="empty" id="detailsEmpty" hidden>暂无数据</div></div>
    </section>
  </div>
  <div class="modal-backdrop" id="errorModal" role="dialog" aria-modal="true" aria-labelledby="errorTitle">
    <section class="modal error-detail-modal">
      <header class="modal-header"><h2 class="modal-title" id="errorTitle">错误详情</h2><button class="modal-close" id="errorClose" aria-label="关闭">×</button></header>
      <div class="modal-toolbar"><div id="errorSummary">完整错误内容</div><button class="modal-refresh" id="copyErrorDetail">复制错误</button></div>
      <pre class="error-pre" id="errorDetailContent"></pre>
    </section>
  </div>
  <script>
    const apiBase = ${JSON.stringify(config.pagePath)};
    const refreshMs = ${config.refreshSeconds * 1000};
    const fallbackTargets = ${JSON.stringify(config.publicTargets)};
    const fmt = new Intl.DateTimeFormat('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const $ = id => document.getElementById(id);
    let targets = fallbackTargets;
    let detailState = { type: 'requests', title: '请求明细', page: 1, pageSize: 100, filters: {} };
    let detailItems = [];
    let currentErrorText = '';
    let detailsFilterTimer = null;
    function num(v, digits = 1) { return Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '-'; }
    function set(id, value) { const el = $(id); if (el) el.textContent = value; }
    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }
    function pretty(value) {
      if (value === undefined || value === null || value === '') return '-';
      if (typeof value === 'string') {
        try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
      }
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    }
    function errorPayloadForRow(row) {
      if (!row || typeof row !== 'object') return row || '';
      const fields = ['message', 'detail', 'error_message', 'error', 'response_body', 'upstream_body', 'request_id', 'upstream_request_id', 'status_code', 'upstream_status_code'];
      const payload = {};
      for (const key of fields) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') payload[key] = row[key];
      }
      return Object.keys(payload).length ? payload : row;
    }
    function copyText(text) {
      const value = String(text || '');
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      return Promise.resolve();
    }
    function percent(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '0.000';
      const pct = Math.abs(n) <= 1 ? n * 100 : n;
      return pct.toFixed(3);
    }
    function compactNumber(v, digits = 1) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '-';
      const abs = Math.abs(n);
      if (abs >= 100000000) return (n / 100000000).toFixed(digits) + '亿';
      if (abs >= 10000) return (n / 10000).toFixed(digits) + '万';
      return Number.isInteger(n) ? String(n) : n.toFixed(digits);
    }
    function plainNumber(v, digits = 1) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '-';
      if (Math.abs(n) >= 100000) return compactNumber(n, digits);
      return Number.isInteger(n) ? String(n) : n.toFixed(digits);
    }
    function mbText(v, digits = 1) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '-';
      if (Math.abs(n) >= 1024) return (n / 1024).toFixed(digits) + ' GB';
      return (Number.isInteger(n) ? String(n) : n.toFixed(digits)) + ' MB';
    }
    function statusText(ok) {
      if (ok === true) return '正常';
      if (ok === false) return '异常';
      return '未知';
    }
    function usagePercent(used, total) {
      const u = Number(used);
      const t = Number(total);
      if (!Number.isFinite(u) || !Number.isFinite(t) || t <= 0) return null;
      return (u / t) * 100;
    }
    function ms(v) { return Number.isFinite(Number(v)) ? num(v, 1) + ' ms' : '- ms'; }
    function msCompact(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '- ms';
      return compactNumber(Math.round(n), 1) + ' ms';
    }
    function metricMs(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '-';
      return Math.round(n).toString();
    }
    function healthText(score, fallbackOk) {
      const n = Number(score);
      if (!Number.isFinite(n)) return fallbackOk ? '健康' : '异常';
      if (n >= 80) return '健康';
      if (n >= 60) return '风险';
      return '异常';
    }
    function selectedTarget() { return targets.find(target => target.id === $('targetSelect')?.value) || targets[0]; }
    function selectedWindow() { return document.querySelector('.seg.active')?.dataset.window || '1min'; }
    function timeRangeLabel() { const select = $('timeRangeSelect'); return select ? select.options[select.selectedIndex].textContent : '近1小时'; }
    function renderTargets() { const select = $('targetSelect'); if (!select) return; select.innerHTML = targets.length ? targets.map(target => '<option value="' + target.id + '">' + target.name + (target.configured ? '' : '（未配置Key）') + '</option>').join('') : '<option value="">未配置服务器</option>'; const saved = localStorage.getItem('public_ops_target'); if (saved && targets.some(target => target.id === saved)) select.value = saved; updateSettingsLink(); }
    function updateSettingsLink() { const target = selectedTarget(); const link = $('settingsLink'); if (link && target) link.href = target.baseUrl + '/admin/settings'; }
    function drawSpark(points) { const svg = $('sparkline'); if (!svg) return; const values = (points || []).slice(-32).map(p => Number(p.qps || 0)); const max = Math.max(...values, 0.1); const path = values.map((v, i) => { const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * 420; const y = 38 - (v / max) * 30; return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join(' '); svg.innerHTML = '<path d="' + path + '" fill="none" stroke="#9dbcf8" stroke-width="4" stroke-linecap="round"/>'; }
    function drawTrend(points) { const canvas = $('trendCanvas'); if (!canvas) return; const rect = canvas.parentElement.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr)); canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px'; const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const y = 12 + i * ((rect.height - 24) / 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke(); } const values = (points || []).slice(-48).map(p => Number(p.request_count || 0)); const max = Math.max(...values, 1); ctx.strokeStyle = '#4f7deb'; ctx.lineWidth = 3; ctx.beginPath(); values.forEach((v, i) => { const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * rect.width; const y = rect.height - 14 - (v / max) * (rect.height - 28); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
    function renderList(id, rows) { const el = $(id); if (!el) return; el.innerHTML = rows.map(row => '<div class="check"><span>' + row[0] + '</span><strong>' + row[1] + '</strong></div>').join(''); }
    async function loadTargets() { try { const response = await fetch(apiBase + '/api/targets', { cache: 'no-store' }); if (response.ok) targets = await response.json(); } catch {} renderTargets(); }
    async function load() {
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const timeRange = $('timeRangeSelect') ? $('timeRangeSelect').value : '1h';
      const response = await fetch(apiBase + '/api/snapshot?target=' + encodeURIComponent(targetID) + '&time_range=' + encodeURIComponent(timeRange), { cache: 'no-store' });
      if (!response.ok) throw new Error('snapshot failed');
      const data = await response.json();
      const o = data.overview || {};
      const s = data.system_metrics || {};
      const targetOk = !data.target_status || data.target_status.ok !== false;
      const score = Number(o.health_score);
      const hasScore = Number.isFinite(score);
      const scoreText = healthText(score, targetOk);
      const ring = $('healthRing');
      $('statusDot')?.classList.toggle('bad', !targetOk);
      ring?.classList.remove('good', 'warn', 'bad');
      ring?.classList.add(hasScore && score < 60 ? 'bad' : hasScore && score < 80 ? 'warn' : targetOk ? 'good' : 'bad');
      set('updatedAt', fmt.format(new Date(data.generated_at)).replaceAll('/', '-'));
      set('healthText', targetOk ? '就绪' : '告警');
      set('ringText', hasScore ? Math.round(score) : targetOk ? '待机' : '告警');
      set('ringSub', scoreText);
      set('healthSmall', scoreText);
      set('qps', plainNumber(o.qps && o.qps.current));
      set('tps', plainNumber(o.tps && o.tps.current));
      set('peakQps', plainNumber(o.qps && o.qps.peak));
      set('avgQps', plainNumber(o.qps && o.qps.avg));
      set('peakTps', plainNumber(o.tps && o.tps.peak));
      set('avgTps', plainNumber(o.tps && o.tps.avg));
      set('requestCount', compactNumber(o.request_count_total || 0, 0));
      set('tokenCount', compactNumber(o.token_consumed || 0, 1));
      set('avgQpsCard', plainNumber(o.qps && o.qps.avg));
      set('avgTpsCard', plainNumber(o.tps && o.tps.avg));
      set('sla', percent(o.sla));
      set('slaErrors', o.error_count_sla || 0);
      set('errorRate', percent(o.error_rate));
      set('errorCount', o.error_count_sla || 0);
      set('requestCountSmall', o.business_limited_count || 0);
      set('durationP99', metricMs(o.duration && o.duration.p99_ms));
      set('durationP95', msCompact(o.duration && o.duration.p95_ms));
      set('durationP90', msCompact(o.duration && o.duration.p90_ms));
      set('durationP50', msCompact(o.duration && o.duration.p50_ms));
      set('durationAvg', msCompact(o.duration && o.duration.avg_ms));
      set('durationMax', msCompact(o.duration && o.duration.max_ms));
      set('ttftP99', metricMs(o.ttft && o.ttft.p99_ms));
      set('ttftP95', msCompact(o.ttft && o.ttft.p95_ms));
      set('ttftP90', msCompact(o.ttft && o.ttft.p90_ms));
      set('ttftP50', msCompact(o.ttft && o.ttft.p50_ms));
      set('ttftAvg', msCompact(o.ttft && o.ttft.avg_ms));
      set('ttftMax', msCompact(o.ttft && o.ttft.max_ms));
      set('upstreamErrorRate', percent(o.upstream_error_rate));
      set('upstreamErrorCount', o.upstream_error_count_excl_429_529 || 0);
      set('upstream429529', (o.upstream_429_count || 0) + '/' + (o.upstream_529_count || 0));
      const memPct = Number.isFinite(Number(s.memory_usage_percent)) ? Number(s.memory_usage_percent) : usagePercent(s.memory_used_mb, s.memory_total_mb);
      const redisPct = usagePercent(s.redis_conn_total, s.redis_pool_size);
      const goroutines = Number(s.goroutine_count ?? s.worker_current ?? 0);
      const workerWarn = Number(s.worker_warning ?? 8000);
      const workerCritical = Number(s.worker_critical ?? 15000);
      const heartbeats = Array.isArray(o.job_heartbeats) ? o.job_heartbeats : [];
      const jobWarnings = heartbeats.filter(job => job && (job.last_error || (job.last_error_at && job.last_success_at && new Date(job.last_error_at) > new Date(job.last_success_at)))).length;
      set('cpuValue', num(s.cpu_usage_percent) + '%');
      set('memoryValue', Number.isFinite(memPct) ? num(memPct) + '%' : '-');
      set('processMemory', '已用 ' + mbText(s.memory_used_mb) + ' / 总 ' + mbText(s.memory_total_mb));
      set('dbValue', statusText(s.db_ok));
      set('dbCopy', '连接 ' + (s.db_conn_active ?? '-') + ' / ' + (s.db_max_open_conns ?? '-') + ' · 空闲 ' + (s.db_conn_idle ?? '-'));
      set('redisValue', Number.isFinite(redisPct) ? Math.round(redisPct) + '%' : statusText(s.redis_ok));
      set('redisCopy', '连接 ' + (s.redis_conn_total ?? '-') + ' / ' + (s.redis_pool_size ?? '-') + ' · 活跃 ' + Math.max(0, Number(s.redis_conn_total || 0) - Number(s.redis_conn_idle || 0)) + ' · 空闲 ' + (s.redis_conn_idle ?? '-'));
      set('workerValue', goroutines >= workerCritical ? '严重' : goroutines >= workerWarn ? '告警' : '正常');
      set('workerCopy', '当前 ' + (goroutines || '-') + ' · 警告 ' + workerWarn + ' · 严重 ' + workerCritical);
      set('jobsValue', jobWarnings > 0 ? '告警' : '正常');
      set('jobsCopy', '总计 ' + (heartbeats.length || s.background_jobs_total || 0) + ' · 警告 ' + jobWarnings);
      renderList('checks', data.health && data.health.checks ? data.health.checks.map(item => [item.name, item.ok ? '正常' : (item.error || '异常')]) : [['target', '未配置']]);
      renderList('runtime', [['服务', data.service], ['当前服务器', data.target ? data.target.name : '未配置'], ['API 状态', data.target_status && data.target_status.ok ? '正常 ' + (data.target_status.latency_ms || 0) + 'ms' : (data.target_status && data.target_status.error || '异常')], ['运行时长', Math.floor((data.uptime_seconds || 0) / 60) + ' 分钟'], ['刷新间隔', data.refresh_seconds + ' 秒'], ['负载', s.loadavg_1m || '-']]);
      drawSpark(data.trend || []);
      drawTrend(data.trend || []);
      await loadRealtime();
    }
    async function loadRealtime() {
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const response = await fetch(apiBase + '/api/realtime?target=' + encodeURIComponent(targetID) + '&window=' + encodeURIComponent(selectedWindow()), { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const summary = payload && payload.data && payload.data.summary ? payload.data.summary : payload.data && payload.data.enabled !== undefined ? payload.data.summary : payload.summary;
      if (!summary) return;
      const qps = summary.qps || {};
      const tps = summary.tps || {};
      set('qps', plainNumber(qps.current));
      set('tps', plainNumber(tps.current));
      set('peakQps', plainNumber(qps.peak));
      set('avgQps', plainNumber(qps.avg));
      set('peakTps', plainNumber(tps.peak));
      set('avgTps', plainNumber(tps.avg));
    }
    function detailConfig(type) {
      const configs = {
        requests: { title: '请求明细', columns: ['时间', '类型', '平台', '模型', '耗时', '状态码', '请求ID', '操作'] },
        errors: { title: '请求错误明细', columns: ['时间', '类型', '平台', '模型', '状态码', '消息', '请求ID', '操作'] },
        upstream: { title: '上游错误明细', columns: ['时间', '平台', '账号', '状态码', '类型', '消息', '请求ID', '操作'] }
      };
      return configs[type] || configs.requests;
    }
    function rowValue(row, keys, fallback = '-') {
      for (const key of keys) {
        const value = row && row[key];
        if (value !== undefined && value !== null && value !== '') return value;
      }
      return fallback;
    }
    function formatTime(value) {
      if (!value) return '-';
      const date = new Date(typeof value === 'number' ? value : value);
      return Number.isFinite(date.getTime()) ? fmt.format(date).slice(5).replaceAll('/', '-') : String(value);
    }
    function shortID(value) {
      const text = String(value || '-');
      return text.length > 28 ? text.slice(0, 24) + '...' : text;
    }
    function readDetailFilters() {
      return {
        keyword: $('filterKeyword')?.value.trim() || '',
        platform: $('filterPlatform')?.value.trim() || '',
        model: $('filterModel')?.value.trim() || '',
        statusCode: $('filterStatusCode')?.value.trim() || '',
        status: $('filterStatus')?.value || ''
      };
    }
    function syncDetailControls() {
      const filters = detailState.filters || {};
      if ($('filterKeyword')) $('filterKeyword').value = filters.keyword || '';
      if ($('filterPlatform')) $('filterPlatform').value = filters.platform || '';
      if ($('filterModel')) $('filterModel').value = filters.model || '';
      if ($('filterStatusCode')) $('filterStatusCode').value = filters.statusCode || '';
      if ($('filterStatus')) $('filterStatus').value = filters.status || '';
      if ($('detailsPageSize')) $('detailsPageSize').value = String(detailState.pageSize || 100);
    }
    function detailStatus(row) {
      const statusCode = Number(rowValue(row, ['status_code', 'upstream_status_code'], 0));
      const kind = String(rowValue(row, ['kind'], '')).toLowerCase();
      return kind === 'error' || statusCode >= 400 ? 'error' : 'success';
    }
    function rowSearchText(row) {
      const fields = ['request_id', 'upstream_request_id', 'id', 'platform', 'model', 'requested_model', 'status_code', 'upstream_status_code', 'message', 'detail', 'error_message', 'account_name', 'account_id', 'kind', 'phase'];
      return fields.map(key => row && row[key] !== undefined && row[key] !== null ? String(row[key]) : '').join(' ').toLowerCase();
    }
    function filterDetailItems(items) {
      const filters = detailState.filters || {};
      return (Array.isArray(items) ? items : []).filter(row => {
        if (filters.status && detailStatus(row) !== filters.status) return false;
        if (filters.statusCode && String(rowValue(row, ['status_code', 'upstream_status_code'], '')).trim() !== filters.statusCode) return false;
        const platform = String(rowValue(row, ['platform'], '')).toLowerCase();
        if (filters.platform && !platform.includes(filters.platform.toLowerCase())) return false;
        const model = String(rowValue(row, ['model', 'requested_model'], '')).toLowerCase();
        if (filters.model && !model.includes(filters.model.toLowerCase())) return false;
        const keyword = String(filters.keyword || '').toLowerCase();
        if (keyword && !rowSearchText(row).includes(keyword)) return false;
        return true;
      });
    }
    function scheduleDetailsReload() {
      if (!$('detailsModal')?.classList.contains('open')) return;
      clearTimeout(detailsFilterTimer);
      detailsFilterTimer = setTimeout(() => {
        detailState.filters = readDetailFilters();
        detailState.page = 1;
        loadDetails().catch(console.error);
      }, 300);
    }
    function markCopied(button) {
      if (!button) return;
      const original = button.textContent || '复制';
      button.textContent = '已复制';
      button.classList.add('copied');
      button.disabled = true;
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('copied');
        button.disabled = false;
      }, 1100);
    }
    function renderDetailsRows(type, items) {
      const body = $('detailsBody');
      const empty = $('detailsEmpty');
      if (!body || !empty) return;
      const loadedItems = Array.isArray(items) ? items : [];
      detailItems = filterDetailItems(loadedItems);
      empty.hidden = detailItems.length > 0;
      set('detailsCount', '条目：' + detailItems.length + ' / 已拉取 ' + loadedItems.length);
      body.innerHTML = detailItems.map((row, index) => {
        const requestID = rowValue(row, ['request_id', 'upstream_request_id', 'id']);
        const statusCode = rowValue(row, ['status_code', 'upstream_status_code']);
        const errorID = rowValue(row, ['error_id', 'id'], '');
        const copyButton = '<button class="copy-btn" type="button" data-copy-row="' + index + '" title="复制完整请求ID">复制</button>';
        const errorButton = '<button class="error-btn" data-error-row="' + index + '">查看错误</button>';
        if (type === 'upstream') {
          return '<tr><td>' + esc(formatTime(rowValue(row, ['created_at', 'at', 'at_unix_ms']))) + '</td><td>' + esc(rowValue(row, ['platform'])) + '</td><td>' + esc(rowValue(row, ['account_name', 'account_id'])) + '</td><td>' + esc(statusCode) + '</td><td>' + esc(rowValue(row, ['kind', 'phase'])) + '</td><td>' + esc(shortID(rowValue(row, ['message', 'detail']))) + '</td><td>' + esc(shortID(requestID)) + ' ' + copyButton + '</td><td>' + errorButton + '</td></tr>';
        }
        const kind = rowValue(row, ['kind'], Number(statusCode) >= 400 ? 'error' : 'success');
        const isError = kind === 'error' || Number(statusCode) >= 400;
        if (type === 'errors') {
          return '<tr><td>' + esc(formatTime(rowValue(row, ['created_at', 'at']))) + '</td><td><span class="badge error">失败</span></td><td>' + esc(rowValue(row, ['platform'])) + '</td><td>' + esc(rowValue(row, ['model', 'requested_model'])) + '</td><td>' + esc(statusCode) + '</td><td>' + esc(shortID(rowValue(row, ['message', 'detail', 'error_message']))) + '</td><td>' + esc(shortID(requestID)) + ' ' + copyButton + '</td><td>' + errorButton + '</td></tr>';
        }
        return '<tr><td>' + esc(formatTime(rowValue(row, ['created_at', 'at']))) + '</td><td><span class="badge ' + (isError ? 'error' : 'ok') + '">' + (isError ? '失败' : '成功') + '</span></td><td>' + esc(rowValue(row, ['platform'])) + '</td><td>' + esc(rowValue(row, ['model', 'requested_model'])) + '</td><td>' + esc(rowValue(row, ['duration_ms'], '-')) + '</td><td>' + esc(statusCode) + '</td><td>' + esc(shortID(requestID)) + ' ' + copyButton + '</td><td>' + (errorID ? errorButton : '-') + '</td></tr>';
      }).join('');
    }
    async function loadDetails() {
      const config = detailConfig(detailState.type);
      detailState.filters = readDetailFilters();
      detailState.pageSize = Number($('detailsPageSize')?.value || detailState.pageSize || 100);
      set('detailsTitle', config.title);
      set('detailsWindow', '窗口：' + timeRangeLabel());
      set('detailsCount', '加载中...');
      $('detailsHead').innerHTML = '<tr>' + config.columns.map(item => '<th>' + item + '</th>').join('') + '</tr>';
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const timeRange = $('timeRangeSelect') ? $('timeRangeSelect').value : '1h';
      const remoteType = detailState.type === 'upstream' ? 'upstream-errors' : detailState.type === 'errors' ? 'request-errors' : 'requests';
      const filters = detailState.filters || {};
      const query = new URLSearchParams({
        target: targetID,
        type: remoteType,
        time_range: timeRange,
        page: String(detailState.page || 1),
        page_size: String(detailState.pageSize || 100)
      });
      const kind = detailState.type === 'errors' ? 'error' : filters.status || '';
      if (kind) query.set('kind', kind);
      if (filters.status) query.set('status', filters.status);
      if (filters.statusCode) query.set('status_code', filters.statusCode);
      if (filters.platform) query.set('platform', filters.platform);
      if (filters.model) query.set('model', filters.model);
      if (filters.keyword) {
        query.set('keyword', filters.keyword);
      }
      const response = await fetch(apiBase + '/api/details?' + query.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('details failed');
      const payload = await response.json();
      const data = payload.data || payload;
      renderDetailsRows(detailState.type, Array.isArray(data.items) ? data.items : []);
    }
    function openDetails(type) {
      detailState = { type, page: 1, pageSize: Number($('detailsPageSize')?.value || 100), filters: readDetailFilters() };
      syncDetailControls();
      $('detailsModal')?.classList.add('open');
      loadDetails().catch(err => {
        $('detailsBody').innerHTML = '';
        $('detailsEmpty').hidden = false;
        $('detailsEmpty').textContent = err.message || '加载失败';
        set('detailsCount', '加载失败');
      });
    }
    async function openErrorDetail(index) {
      const row = detailItems[Number(index)];
      if (!row) return;
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const errorID = rowValue(row, detailState.type === 'upstream' ? ['id', 'error_id'] : ['error_id', 'id'], '');
      let payload = errorPayloadForRow(row);
      if (errorID && String(errorID) !== '-') {
        const remoteType = detailState.type === 'upstream' ? 'upstream-errors' : 'request-errors';
        try {
          const response = await fetch(apiBase + '/api/error-detail?target=' + encodeURIComponent(targetID) + '&type=' + encodeURIComponent(remoteType) + '&id=' + encodeURIComponent(errorID), { cache: 'no-store' });
          if (response.ok) {
            const result = await response.json();
            payload = result.data || result;
          }
        } catch {}
      }
      currentErrorText = pretty(payload);
      set('errorSummary', '请求ID：' + rowValue(row, ['request_id', 'upstream_request_id', 'id']));
      set('errorDetailContent', currentErrorText);
      $('errorModal')?.classList.add('open');
    }
    $('targetSelect')?.addEventListener('change', () => { localStorage.setItem('public_ops_target', $('targetSelect').value); updateSettingsLink(); load().catch(console.error); });
    $('timeRangeSelect')?.addEventListener('change', () => load().catch(console.error));
    document.querySelectorAll('.seg').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.seg').forEach(item => item.classList.remove('active')); button.classList.add('active'); loadRealtime().catch(console.error); }));
    document.addEventListener('click', event => {
      const detail = event.target.closest('[data-detail]');
      if (detail) openDetails(detail.dataset.detail);
      const copy = event.target.closest('[data-copy-row]');
      if (copy) {
        event.preventDefault();
        event.stopPropagation();
        const row = detailItems[Number(copy.dataset.copyRow)];
        const requestID = rowValue(row, ['request_id', 'upstream_request_id', 'id'], '');
        copyText(requestID).then(() => markCopied(copy)).catch(console.error);
        return;
      }
      const error = event.target.closest('[data-error-row]');
      if (error) openErrorDetail(error.dataset.errorRow).catch(console.error);
    });
    $('detailsClose')?.addEventListener('click', () => $('detailsModal')?.classList.remove('open'));
    $('detailsModal')?.addEventListener('click', event => { if (event.target === $('detailsModal')) $('detailsModal')?.classList.remove('open'); });
    $('detailsRefresh')?.addEventListener('click', () => { detailState.filters = readDetailFilters(); detailState.page = 1; loadDetails().catch(console.error); load().catch(console.error); });
    $('detailsClear')?.addEventListener('click', () => {
      detailState.filters = {};
      detailState.page = 1;
      syncDetailControls();
      loadDetails().catch(console.error);
    });
    $('detailsPageSize')?.addEventListener('change', () => {
      detailState.pageSize = Number($('detailsPageSize').value || 100);
      detailState.page = 1;
      loadDetails().catch(console.error);
    });
    ['filterKeyword', 'filterPlatform', 'filterModel', 'filterStatusCode'].forEach(id => $(id)?.addEventListener('input', scheduleDetailsReload));
    $('filterStatus')?.addEventListener('change', () => {
      detailState.filters = readDetailFilters();
      detailState.page = 1;
      loadDetails().catch(console.error);
    });
    $('errorClose')?.addEventListener('click', () => $('errorModal')?.classList.remove('open'));
    $('errorModal')?.addEventListener('click', event => { if (event.target === $('errorModal')) $('errorModal')?.classList.remove('open'); });
    $('copyErrorDetail')?.addEventListener('click', () => copyText(currentErrorText).catch(console.error));
    $('refreshBtn')?.addEventListener('click', () => load().catch(console.error));
    $('fullscreenBtn')?.addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); });
    loadTargets().then(() => load()).catch(console.error);
    setInterval(() => load().catch(console.error), refreshMs);
    addEventListener('resize', () => load().catch(console.error));
  </script>
</body>
</html>`
}

function renderLoginPage(config, hasError = false) {
  const pageTitle = `${config.serviceName} 登录`
  const action = `${config.pagePath}/login`
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      --bg: #eef8f8;
      --panel: #fff;
      --line: #e6eaf0;
      --text: #111827;
      --muted: #7b8494;
      --blue: #4f7deb;
      --red: #d93a35;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      color: var(--text);
      background: linear-gradient(180deg, #f8fbfd 0, var(--bg) 52%, #f9fafb 100%);
    }
    .login-panel {
      width: min(420px, 100%);
      border: 1px solid var(--line);
      border-radius: 22px;
      background: rgba(255,255,255,.92);
      box-shadow: 0 18px 50px rgba(15, 23, 42, .10);
      padding: 30px;
    }
    h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.2; letter-spacing: 0; }
    p { margin: 0 0 24px; color: var(--muted); font-size: 14px; font-weight: 750; }
    label { display: grid; gap: 8px; margin-top: 16px; color: #475569; font-size: 13px; font-weight: 900; }
    input {
      width: 100%;
      height: 46px;
      padding: 0 13px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      color: var(--text);
      font: inherit;
      font-weight: 750;
      outline: none;
    }
    input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(79,125,235,.14); }
    .error { margin-top: 14px; color: var(--red); font-size: 13px; font-weight: 900; }
    button {
      width: 100%;
      height: 46px;
      margin-top: 22px;
      border: 0;
      border-radius: 10px;
      background: var(--blue);
      color: #fff;
      font: inherit;
      font-weight: 950;
      cursor: pointer;
    }
    .foot { margin-top: 18px; color: #94a3b8; font-size: 12px; font-weight: 800; text-align: center; }
  </style>
</head>
<body>
  <form class="login-panel" method="post" action="${escapeHtml(action)}">
    <h1>${escapeHtml(config.serviceName)}</h1>
    <p>登录后查看运维监控与请求日志。</p>
    <label>账号<input name="username" autocomplete="username" autofocus required></label>
    <label>密码<input name="password" type="password" autocomplete="current-password" required></label>
    ${hasError ? '<div class="error">账号或密码不正确</div>' : ''}
    <button type="submit">登录</button>
    <div class="foot">Ops Dashboard</div>
  </form>
</body>
</html>`
}

function metricCard(title, id, suffix, rows, color = '', progress = false, detailType = 'requests') {
  const mainClass = color ? `metric-main ${color}` : 'metric-main'
  return `<article class="metric-card"><div class="card-head"><span>${title} <span title="${title}">ⓘ</span></span><button class="card-link" data-detail="${detailType}" type="button">明细</button></div><div class="${mainClass}"><span id="${id}">0</span>${suffix ? `<span class="unit">${suffix}</span>` : ''}</div>${progress ? '<div class="progress"><div class="bar"></div></div>' : ''}<div class="kv">${rows.map(row => `<div><span>${row[0]}</span><strong id="${row[1]}">0</strong></div>`).join('')}</div></article>`
}

function smallCard(title, id, copyId) {
  return `<article class="small-card"><div class="small-title">${title} <span title="${title}">ⓘ</span></div><div class="small-value" id="${id}">-</div><div class="small-copy" id="${copyId}">-</div></article>`
}

module.exports = {
  renderLoginPage,
  renderPage
}
