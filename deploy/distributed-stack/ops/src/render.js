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
          <a class="action-btn" id="logsLink" href="${escapeHtml(config.pagePath)}/logs">▤ <span>日志面板</span></a>
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
    function renderTargets() { const select = $('targetSelect'); if (!select) return; select.innerHTML = targets.length ? targets.map(target => '<option value="' + target.id + '">' + target.name + (target.configured ? '' : '（未配置Key）') + '</option>').join('') : '<option value="">未配置服务器</option>'; const saved = localStorage.getItem('public_ops_target'); if (saved && targets.some(target => target.id === saved)) select.value = saved; updateTargetLinks(); }
    function updateTargetLinks() { const target = selectedTarget(); const settings = $('settingsLink'); if (settings && target) settings.href = target.baseUrl + '/admin/settings'; const logs = $('logsLink'); if (logs) { const params = new URLSearchParams(); if (target && target.id) params.set('target', target.id); logs.href = apiBase + '/logs' + (params.toString() ? '?' + params.toString() : ''); } }
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
    $('targetSelect')?.addEventListener('change', () => { localStorage.setItem('public_ops_target', $('targetSelect').value); updateTargetLinks(); load().catch(console.error); });
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

function renderLogsPage(config) {
  const pageTitle = `${config.serviceName} 日志面板`
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
      --green: #23945b;
      --red: #d93a35;
      --amber: #d97706;
      --shadow: 0 18px 50px rgba(15, 23, 42, .08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--text); background: linear-gradient(180deg, #f8fbfd 0, var(--bg) 24rem, #f9fafb 100%); }
    button, input, select { font: inherit; }
    .topbar { height: 38px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; border-bottom: 1px solid rgba(226,232,240,.72); background: rgba(255,255,255,.78); backdrop-filter: blur(14px); color: #697386; font-size: 13px; font-weight: 700; }
    .admin-chip { display: flex; gap: 10px; align-items: center; }
    .avatar { width: 30px; height: 30px; border-radius: 999px; background: #49a79b; box-shadow: inset 0 -8px 18px rgba(0,0,0,.1); }
    .logout-form { margin: 0; }
    .logout-btn { height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: #647084; font-size: 12px; font-weight: 900; cursor: pointer; }
    .shell { width: min(1720px, calc(100vw - 48px)); margin: 24px auto 30px; }
    .panel { background: rgba(255,255,255,.9); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow); padding: 22px; }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
    h1 { margin: 0 0 5px; font-size: 22px; line-height: 1.15; letter-spacing: 0; }
    .sub { color: var(--muted); font-size: 13px; font-weight: 750; }
    .controls { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .select, .input, .action-btn { height: 40px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: #334155; font-size: 13px; font-weight: 800; outline: none; }
    .select { min-width: 190px; padding: 0 12px; }
    .input { width: 170px; padding: 0 12px; }
    .input.keyword { width: 260px; }
    .input.datetime { min-width: 210px; }
    .input.short { width: 108px; }
    .action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 0 16px; cursor: pointer; text-decoration: none; background: #f5f7fa; }
    .action-btn.primary { color: #2f62dc; background: var(--blue-soft); border-color: transparent; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; padding: 18px 0 14px; }
    .tab { height: 36px; padding: 0 16px; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: #647084; font-size: 13px; font-weight: 950; cursor: pointer; }
    .tab.active { color: #fff; background: var(--blue); border-color: var(--blue); }
    .filters { display: grid; grid-template-columns: repeat(6, minmax(130px, 1fr)); gap: 10px; padding: 14px; border: 1px solid var(--line); border-radius: 16px; background: var(--soft); }
    .filters label { display: grid; gap: 6px; color: #647084; font-size: 12px; font-weight: 900; }
    .filters .wide { grid-column: span 2; }
    .filters .actions { display: flex; align-items: end; gap: 8px; justify-content: flex-end; }
    .filter-only-error, .filter-only-system { display: none; }
    body[data-log-type="errors"] .filter-only-error, body[data-log-type="upstream"] .filter-only-error { display: grid; }
    body[data-log-type="system"] .filter-only-system { display: grid; }
    .summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 4px 10px; color: #647084; font-size: 13px; font-weight: 850; }
    .table-wrap { border: 0; border-radius: 0; overflow: visible; background: transparent; }
    table { width: 100%; border-collapse: collapse; min-width: 1720px; }
    th, td { padding: 13px 14px; border-bottom: 1px solid var(--line); text-align: left; color: #647084; font-size: 13px; font-weight: 750; vertical-align: top; }
    th { position: sticky; top: 0; z-index: 1; background: #f8fafc; color: #7b8494; font-size: 12px; font-weight: 950; }
    tr:last-child td { border-bottom: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .truncate { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cell-long { min-width: 220px; max-width: 360px; white-space: normal; word-break: break-all; }
    .cell-wide { min-width: 300px; max-width: 520px; white-space: normal; word-break: break-word; }
    .cell-ip { min-width: 130px; white-space: normal; word-break: break-word; }
    .nowrap { white-space: nowrap; }
    .message { max-width: 440px; white-space: normal; word-break: break-word; }
    .list-head { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 4px 10px; color: #7b8494; font-size: 12px; font-weight: 900; }
    .head-chip { padding: 5px 9px; border: 1px solid var(--line); border-radius: 999px; background: #fff; }
    .log-list { display: grid; gap: 12px; }
    .log-card { border: 1px solid var(--line); border-radius: 16px; background: #fff; overflow: hidden; }
    .log-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px; background: #f8fafc; border-bottom: 1px solid var(--line); }
    .log-card-title { min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: #334155; font-size: 13px; font-weight: 950; }
    .log-card-title .mono { word-break: break-all; }
    .log-fields { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; }
    .log-field { min-width: 0; padding: 12px 16px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .log-field:nth-child(4n) { border-right: 0; }
    .log-field.full { grid-column: 1 / -1; border-right: 0; }
    .log-label { margin-bottom: 5px; color: #8a94a6; font-size: 11px; font-weight: 950; text-transform: uppercase; }
    .log-value { color: #647084; font-size: 13px; font-weight: 800; line-height: 1.45; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
    .log-value.mono { word-break: break-all; }
    .log-field.full .log-value { white-space: pre-wrap; }
    .badge { display: inline-flex; align-items: center; min-height: 24px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 950; }
    .badge.ok { color: var(--green); background: #e7f7ed; }
    .badge.error { color: var(--red); background: #fde8e8; }
    .badge.warn { color: var(--amber); background: #fff3d8; }
    .badge.info { color: #2f62dc; background: var(--blue-soft); }
    .row-actions { display: flex; gap: 8px; justify-content: flex-end; white-space: nowrap; }
    .mini-btn { height: 30px; border: 0; border-radius: 8px; padding: 0 10px; color: #4b5563; background: #f1f5f9; font-size: 12px; font-weight: 900; cursor: pointer; }
    .mini-btn.error { color: var(--red); background: #fff1f1; }
    .mini-btn.copied { color: var(--green); background: #e7f7ed; }
    .pager { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 14px; }
    .empty { padding: 42px; color: #94a3b8; text-align: center; font-weight: 850; }
    .modal-backdrop { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: 32px; background: rgba(15, 23, 42, .45); backdrop-filter: blur(6px); z-index: 40; }
    .modal-backdrop.open { display: flex; }
    .modal { width: min(1120px, 94vw); max-height: 92vh; overflow: hidden; display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: 24px; box-shadow: 0 28px 80px rgba(15, 23, 42, .22); }
    .modal-header { height: 82px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 28px; border-bottom: 1px solid var(--line); }
    .modal-title { margin: 0; font-size: 22px; font-weight: 950; }
    .modal-close { width: 46px; height: 46px; border: 2px solid #3167c9; border-radius: 15px; background: #f8fafc; color: #475569; font-size: 30px; line-height: 1; cursor: pointer; }
    .modal-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 28px; color: #647084; font-size: 13px; font-weight: 850; }
    .pre { margin: 0 28px 28px; padding: 18px; max-height: 62vh; overflow: auto; border: 1px solid var(--line); border-radius: 14px; background: #0f172a; color: #dbeafe; font: 12px/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; word-break: break-word; }
    @media (max-width: 1320px) { .log-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } .log-field:nth-child(4n) { border-right: 1px solid var(--line); } .log-field:nth-child(2n) { border-right: 0; } }
    @media (max-width: 1120px) { .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filters .wide { grid-column: span 2; } }
    @media (max-width: 860px) { .log-card-top { align-items: flex-start; flex-direction: column; } .log-fields { grid-template-columns: 1fr; } .log-field, .log-field:nth-child(2n), .log-field:nth-child(4n) { border-right: 0; } .row-actions { justify-content: flex-start; } }
    @media (max-width: 760px) { .shell { width: min(100vw - 20px, 740px); } .heading { align-items: flex-start; flex-direction: column; } .controls, .select, .input, .action-btn { width: 100%; } .filters { grid-template-columns: 1fr; } .filters .wide { grid-column: span 1; } }
  </style>
</head>
<body>
  <div class="topbar"><div>运维监控与排障</div><div class="admin-chip"><span class="avatar"></span><span>${escapeHtml(config.authUsername)}</span><form class="logout-form" method="post" action="${escapeHtml(config.pagePath)}/logout"><button class="logout-btn" type="submit">退出</button></form></div></div>
  <main class="shell">
    <section class="panel">
      <header class="heading">
        <div><h1>日志面板</h1><div class="sub">独立日志入口，可按目标服务器、类型和关键字段筛选。</div></div>
        <div class="controls">
          <select class="select" id="targetSelect" aria-label="服务器"></select>
          <a class="action-btn" href="${escapeHtml(config.pagePath)}">← 返回监控</a>
          <button class="action-btn primary" id="refreshBtn" type="button">刷新</button>
        </div>
      </header>
      <nav class="tabs" aria-label="日志类型">
        <button class="tab" data-type="requests" type="button">请求日志</button>
        <button class="tab" data-type="errors" type="button">请求错误</button>
        <button class="tab" data-type="upstream" type="button">上游错误</button>
        <button class="tab" data-type="system" type="button">系统日志</button>
      </nav>
      <section class="filters">
        <label>时间范围<select class="select" id="timeRange"><option value="5m">近5分钟</option><option value="30m">近30分钟</option><option value="1h" selected>近1小时</option><option value="6h">近6小时</option><option value="24h">近24小时</option><option value="7d">近7天</option><option value="30d">近30天</option></select></label>
        <label>开始时间（可选）<input class="input datetime" id="filterStartTime" type="datetime-local"></label>
        <label>结束时间（可选）<input class="input datetime" id="filterEndTime" type="datetime-local"></label>
        <label>级别<select class="select" id="filterLevel"><option value="">全部</option><option value="debug">debug</option><option value="info">info</option><option value="warn">warn</option><option value="error">error</option></select></label>
        <label>组件<input class="input" id="filterComponent" type="search" placeholder="如 http.access"></label>
        <label>request_id<input class="input" id="filterRequestID" type="search"></label>
        <label>client_request_id<input class="input" id="filterClientRequestID" type="search"></label>
        <label>user_id<input class="input" id="filterUserID" inputmode="numeric"></label>
        <label>account_id<input class="input" id="filterAccountID" inputmode="numeric"></label>
        <label>平台<input class="input" id="filterPlatform" type="search" placeholder="openai"></label>
        <label>模型<input class="input" id="filterModel" type="search" placeholder="gpt-5.5"></label>
        <label class="wide">关键字<input class="input keyword" id="filterQ" type="search" placeholder="消息/request_id"></label>
        <label class="filter-only-error">状态码<input class="input short" id="filterStatusCodes" inputmode="numeric" placeholder="400,503"></label>
        <label class="filter-only-error">视图<select class="select" id="filterView"><option value="errors">错误</option><option value="excluded">排除项</option><option value="all">全部</option></select></label>
        <label>每页<select class="select" id="pageSize"><option value="50">50 条</option><option value="100" selected>100 条</option><option value="200">200 条</option><option value="500">500 条</option></select></label>
        <div class="actions"><button class="action-btn" id="resetBtn" type="button">重置</button><button class="action-btn primary" id="searchBtn" type="button">查询</button></div>
      </section>
      <div class="summary"><span id="summaryText">准备加载</span><span id="pageText">第 1 页</span></div>
      <div class="table-wrap"><div class="list-head" id="tableHead"></div><div class="log-list" id="tableBody"></div><div class="empty" id="empty" hidden>暂无日志</div></div>
      <div class="pager"><button class="action-btn" id="prevPage" type="button">上一页</button><button class="action-btn" id="nextPage" type="button">下一页</button></div>
    </section>
  </main>
  <div class="modal-backdrop" id="detailModal" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
    <section class="modal">
      <header class="modal-header"><h2 class="modal-title" id="detailTitle">日志详情</h2><button class="modal-close" id="detailClose" aria-label="关闭">×</button></header>
      <div class="modal-toolbar"><div id="detailSummary">完整内容</div><button class="mini-btn" id="copyDetail" type="button">复制</button></div>
      <pre class="pre" id="detailContent"></pre>
    </section>
  </div>
  <script>
    const apiBase = ${JSON.stringify(config.pagePath)};
    const fallbackTargets = ${JSON.stringify(config.publicTargets)};
    const fmt = new Intl.DateTimeFormat('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const $ = id => document.getElementById(id);
    const typeLabels = { requests: '请求日志', errors: '请求错误', upstream: '上游错误', system: '系统日志' };
    let targets = fallbackTargets;
    let state = { type: 'requests', page: 1, pageSize: 100 };
    let rows = [];
    let total = 0;
    let currentDetailText = '';
    let filterTimer = null;
    function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
    function set(id, value) { const el = $(id); if (el) el.textContent = value; }
    function selectedTarget() { return targets.find(target => target.id === $('targetSelect')?.value) || targets[0]; }
    function readPath(source, path) {
      if (!source || !path) return undefined;
      return String(path).split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), source);
    }
    function rowValue(row, keys, fallback = '-') {
      for (const key of keys) {
        const value = key.includes('.') ? readPath(row, key) : row && row[key];
        if (value !== undefined && value !== null && value !== '') return value;
      }
      return fallback;
    }
    function extraValue(row, keys, fallback = '-') {
      const extra = row && row.extra && typeof row.extra === 'object' ? row.extra : {};
      return rowValue(extra, keys, fallback);
    }
    function requestIP(row) {
      return rowValue(row, ['client_ip', 'ip', 'ip_address', 'request_client_ip', 'extra.client_ip', 'extra.ip', 'extra.ip_address', 'extra.request_client_ip'], '-');
    }
    function userAgent(row) {
      return rowValue(row, ['user_agent', 'request_user_agent', 'extra.user_agent', 'extra.request_user_agent'], '-');
    }
    function clientRequestID(row) {
      return rowValue(row, ['client_request_id', 'extra.client_request_id'], '-');
    }
    function requestID(row) {
      return rowValue(row, ['request_id', 'upstream_request_id', 'id', 'extra.request_id'], '-');
    }
    function shortID(value) { const text = String(value || '-'); return text.length > 34 ? text.slice(0, 30) + '...' : text; }
    function formatTime(value) { if (!value) return '-'; const d = new Date(typeof value === 'number' ? value : value); return Number.isFinite(d.getTime()) ? fmt.format(d).replaceAll('/', '-') : String(value); }
    function toDateTimeLocal(value) {
      if (!value) return '';
      const d = new Date(value);
      if (!Number.isFinite(d.getTime())) return '';
      const pad = number => String(number).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function toRFC3339FromLocal(value) {
      if (!value) return '';
      const d = new Date(value);
      return Number.isFinite(d.getTime()) ? d.toISOString() : '';
    }
    function pretty(value) { if (value === undefined || value === null || value === '') return '-'; if (typeof value === 'string') { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } } try { return JSON.stringify(value, null, 2); } catch { return String(value); } }
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
    function markCopied(button) {
      if (!button) return;
      const original = button.textContent || '复制';
      button.textContent = '已复制';
      button.classList.add('copied');
      button.disabled = true;
      setTimeout(() => { button.textContent = original; button.classList.remove('copied'); button.disabled = false; }, 1100);
    }
    function statusBadge(row) {
      const code = Number(rowValue(row, ['status_code', 'upstream_status_code'], 0));
      if (!Number.isFinite(code) || code <= 0) return '<span class="badge info">-</span>';
      return '<span class="badge ' + (code >= 500 ? 'error' : code >= 400 ? 'warn' : 'ok') + '">' + esc(code) + '</span>';
    }
    function levelBadge(level) {
      const v = String(level || '').toLowerCase();
      const cls = v === 'error' || v === 'fatal' ? 'error' : v === 'warn' || v === 'warning' ? 'warn' : v === 'info' ? 'info' : 'ok';
      return '<span class="badge ' + cls + '">' + esc(level || '-') + '</span>';
    }
    function systemDetail(row) {
      const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
      const parts = [row.message].filter(Boolean);
      ['method', 'path', 'status_code', 'latency_ms', 'client_ip', 'ip', 'ip_address', 'user_agent', 'request_user_agent', 'protocol', 'err', 'error'].forEach(key => {
        const value = extra[key];
        if (value !== undefined && value !== null && value !== '') parts.push(key + '=' + value);
      });
      return parts.join('  ');
    }
    function rowSearchPayload(row) {
      return row || '';
    }
    function readFilters() {
      return {
        timeRange: $('timeRange')?.value || '1h',
        startTime: $('filterStartTime')?.value || '',
        endTime: $('filterEndTime')?.value || '',
        q: $('filterQ')?.value.trim() || '',
        platform: $('filterPlatform')?.value.trim() || '',
        model: $('filterModel')?.value.trim() || '',
        statusCodes: $('filterStatusCodes')?.value.trim() || '',
        view: $('filterView')?.value || 'errors',
        level: $('filterLevel')?.value || '',
        component: $('filterComponent')?.value.trim() || '',
        requestID: $('filterRequestID')?.value.trim() || '',
        clientRequestID: $('filterClientRequestID')?.value.trim() || '',
        accountID: $('filterAccountID')?.value.trim() || '',
        userID: $('filterUserID')?.value.trim() || ''
      };
    }
    function writeFilters(filters) {
      if ($('timeRange')) $('timeRange').value = filters.timeRange || '1h';
      if ($('filterStartTime')) $('filterStartTime').value = filters.startTime || '';
      if ($('filterEndTime')) $('filterEndTime').value = filters.endTime || '';
      if ($('filterQ')) $('filterQ').value = filters.q || '';
      if ($('filterPlatform')) $('filterPlatform').value = filters.platform || '';
      if ($('filterModel')) $('filterModel').value = filters.model || '';
      if ($('filterStatusCodes')) $('filterStatusCodes').value = filters.statusCodes || '';
      if ($('filterView')) $('filterView').value = filters.view || 'errors';
      if ($('filterLevel')) $('filterLevel').value = filters.level || '';
      if ($('filterComponent')) $('filterComponent').value = filters.component || '';
      if ($('filterRequestID')) $('filterRequestID').value = filters.requestID || '';
      if ($('filterClientRequestID')) $('filterClientRequestID').value = filters.clientRequestID || '';
      if ($('filterAccountID')) $('filterAccountID').value = filters.accountID || '';
      if ($('filterUserID')) $('filterUserID').value = filters.userID || '';
      if ($('pageSize')) $('pageSize').value = String(state.pageSize || 100);
    }
    function syncUrl() {
      const filters = readFilters();
      const params = new URLSearchParams();
      const target = selectedTarget();
      if (target && target.id) params.set('target', target.id);
      params.set('type', state.type);
      if (state.page > 1) params.set('page', String(state.page));
      if (state.pageSize !== 100) params.set('page_size', String(state.pageSize));
      const map = { timeRange: 'time_range', startTime: 'start_time', endTime: 'end_time', q: 'q', platform: 'platform', model: 'model', statusCodes: 'status_codes', view: 'view', level: 'level', component: 'component', requestID: 'request_id', clientRequestID: 'client_request_id', accountID: 'account_id', userID: 'user_id' };
      Object.entries(map).forEach(([key, param]) => {
        const value = key === 'startTime' || key === 'endTime' ? toRFC3339FromLocal(filters[key]) : filters[key];
        if (value && !(key === 'timeRange' && value === '1h') && !(key === 'view' && value === 'errors')) params.set(param, value);
      });
      history.replaceState(null, '', location.pathname + '?' + params.toString());
    }
    function applyUrlState() {
      const params = new URLSearchParams(location.search);
      const type = params.get('type');
      if (['requests', 'errors', 'upstream', 'system'].includes(type)) state.type = type;
      state.page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
      state.pageSize = Math.min(500, Math.max(20, Number.parseInt(params.get('page_size') || '100', 10) || 100));
      writeFilters({
        timeRange: params.get('time_range') || '1h',
        startTime: toDateTimeLocal(params.get('start_time') || ''),
        endTime: toDateTimeLocal(params.get('end_time') || ''),
        q: params.get('q') || '',
        platform: params.get('platform') || '',
        model: params.get('model') || '',
        statusCodes: params.get('status_codes') || '',
        view: params.get('view') || 'errors',
        level: params.get('level') || '',
        component: params.get('component') || '',
        requestID: params.get('request_id') || '',
        clientRequestID: params.get('client_request_id') || '',
        accountID: params.get('account_id') || '',
        userID: params.get('user_id') || ''
      });
    }
    function setActiveType() {
      document.body.dataset.logType = state.type;
      document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.type === state.type));
      set('summaryText', typeLabels[state.type] + ' · 准备加载');
    }
    function renderTargets() {
      const select = $('targetSelect');
      if (!select) return;
      select.innerHTML = targets.length ? targets.map(target => '<option value="' + esc(target.id) + '">' + esc(target.name) + (target.configured ? '' : '（未配置Key）') + '</option>').join('') : '<option value="">未配置服务器</option>';
      const params = new URLSearchParams(location.search);
      const fromUrl = params.get('target');
      const saved = localStorage.getItem('public_ops_target');
      if (fromUrl && targets.some(target => target.id === fromUrl)) select.value = fromUrl;
      else if (saved && targets.some(target => target.id === saved)) select.value = saved;
    }
    async function loadTargets() {
      try {
        const response = await fetch(apiBase + '/api/targets', { cache: 'no-store' });
        if (response.ok) targets = await response.json();
      } catch {}
      renderTargets();
    }
    function buildQuery() {
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const filters = readFilters();
      state.pageSize = Number($('pageSize')?.value || state.pageSize || 100);
      const query = new URLSearchParams({
        target: targetID,
        time_range: filters.timeRange,
        page: String(state.page),
        page_size: String(state.pageSize)
      });
      const startTime = toRFC3339FromLocal(filters.startTime);
      const endTime = toRFC3339FromLocal(filters.endTime);
      if (startTime) query.set('start_time', startTime);
      if (endTime) query.set('end_time', endTime);
      if (filters.q) query.set('q', filters.q);
      if (filters.platform) query.set('platform', filters.platform);
      if (filters.model) query.set('model', filters.model);
      if (filters.requestID) query.set('request_id', filters.requestID);
      if (filters.clientRequestID) query.set('client_request_id', filters.clientRequestID);
      if (filters.accountID) query.set('account_id', filters.accountID);
      if (filters.userID) query.set('user_id', filters.userID);
      if (filters.component) query.set('component', filters.component);
      if (filters.level) query.set('level', filters.level);
      if (state.type !== 'system') {
        if (filters.statusCodes) query.set('status_codes', filters.statusCodes);
        if (state.type !== 'requests' && filters.view) query.set('view', filters.view);
      }
      return query;
    }
    function field(label, value, className = '') {
      const valueClass = className.includes('mono') ? 'log-value mono' : 'log-value';
      return '<div class="log-field ' + className + '"><div class="log-label">' + esc(label) + '</div><div class="' + valueClass + '">' + esc(value) + '</div></div>';
    }
    function fieldHtml(label, html, className = '') {
      return '<div class="log-field ' + className + '"><div class="log-label">' + esc(label) + '</div><div class="log-value">' + html + '</div></div>';
    }
    function rowActions(index, mode) {
      const detail = mode === 'error'
        ? '<button class="mini-btn error" data-error-row="' + index + '" type="button">错误</button>'
        : '<button class="mini-btn" data-open-row="' + index + '" type="button">详情</button>';
      return '<div class="row-actions"><button class="mini-btn" data-copy-row="' + index + '" type="button">复制</button>' + detail + '</div>';
    }
    function logCard(titleHtml, fields, index, mode = 'detail') {
      return '<article class="log-card"><div class="log-card-top"><div class="log-card-title">' + titleHtml + '</div>' + rowActions(index, mode) + '</div><div class="log-fields">' + fields.join('') + '</div></article>';
    }
    function headersForType() {
      if (state.type === 'system') return ['时间', '级别', '组件', 'request_id', 'client_request_id', '平台', '模型', '状态', 'IP', 'User-Agent', '内容', '操作'];
      if (state.type === 'upstream') return ['时间', '类型', '端点', 'request_id', 'client_request_id', '平台', '模型', '分组', '用户', '账号', 'IP', '状态码', '响应内容', '操作'];
      if (state.type === 'errors') return ['时间', '阶段', '端点', 'request_id', 'client_request_id', '平台', '模型', '分组', '用户', 'API KEY', '账号', 'IP', '状态码', '响应内容', '操作'];
      return ['时间', '类型', '平台', '模型', '耗时', '状态码', 'request_id', 'client_request_id', 'IP', 'User-Agent', '用户', '账号', '操作'];
    }
    function renderRows() {
      const head = $('tableHead');
      const body = $('tableBody');
      const empty = $('empty');
      if (!head || !body || !empty) return;
      head.innerHTML = headersForType().filter(item => item !== '操作').map(item => '<span class="head-chip">' + esc(item) + '</span>').join('');
      empty.hidden = rows.length > 0;
      if (state.type === 'system') {
        body.innerHTML = rows.map((row, index) => {
          const status = rowValue(row, ['status_code', 'extra.status_code'], extraValue(row, ['status'], '-'));
          const title = '<span>' + esc(formatTime(row.created_at)) + '</span>' + levelBadge(row.level) + '<span>' + esc(row.component || '-') + '</span>';
          return logCard(title, [
            field('request_id', requestID(row), 'mono'),
            field('client_request_id', clientRequestID(row), 'mono'),
            field('平台', row.platform || '-'),
            field('模型', row.model || '-'),
            field('状态', status),
            field('IP', requestIP(row)),
            field('User-Agent', userAgent(row), 'full'),
            field('内容', systemDetail(row), 'full')
          ], index);
        }).join('');
      } else if (state.type === 'upstream') {
        body.innerHTML = rows.map((row, index) => {
          const title = '<span>' + esc(formatTime(rowValue(row, ['created_at', 'at', 'at_unix_ms']))) + '</span>' + statusBadge(row) + '<span>' + esc(rowValue(row, ['phase', 'kind'])) + '</span>';
          return logCard(title, [
            field('端点', rowValue(row, ['upstream_endpoint', 'inbound_endpoint']), 'mono'),
            field('request_id', requestID(row), 'mono'),
            field('client_request_id', clientRequestID(row), 'mono'),
            field('平台', rowValue(row, ['platform'])),
            field('模型', rowValue(row, ['upstream_model', 'requested_model', 'model'])),
            field('分组', rowValue(row, ['group_name', 'group_id'])),
            field('用户', rowValue(row, ['user_email', 'user_id'])),
            field('账号', rowValue(row, ['account_name', 'account_id'])),
            field('IP', requestIP(row)),
            field('响应内容', rowValue(row, ['message', 'detail', 'error_message']), 'full')
          ], index, 'error');
        }).join('');
      } else if (state.type === 'errors') {
        body.innerHTML = rows.map((row, index) => {
          const title = '<span>' + esc(formatTime(rowValue(row, ['created_at', 'at']))) + '</span>' + statusBadge(row) + '<span>' + esc(rowValue(row, ['phase', 'error_owner'])) + '</span>';
          return logCard(title, [
            field('端点', rowValue(row, ['inbound_endpoint', 'upstream_endpoint']), 'mono'),
            field('request_id', requestID(row), 'mono'),
            field('client_request_id', clientRequestID(row), 'mono'),
            field('平台', rowValue(row, ['platform'])),
            field('模型', rowValue(row, ['requested_model', 'model', 'upstream_model'])),
            field('分组', rowValue(row, ['group_name', 'group_id'])),
            field('用户', rowValue(row, ['user_email', 'user_id'])),
            field('API KEY', rowValue(row, ['api_key_name', 'api_key_id'])),
            field('账号', rowValue(row, ['account_name', 'account_id'])),
            field('IP', requestIP(row)),
            field('响应内容', rowValue(row, ['message', 'detail', 'error_message']), 'full')
          ], index, 'error');
        }).join('');
      } else {
        body.innerHTML = rows.map((row, index) => {
          const code = rowValue(row, ['status_code'], '-');
          const isError = String(rowValue(row, ['kind'], '')).toLowerCase() === 'error' || Number(code) >= 400;
          const title = '<span>' + esc(formatTime(rowValue(row, ['created_at', 'at']))) + '</span><span class="badge ' + (isError ? 'error' : 'ok') + '">' + (isError ? '失败' : '成功') + '</span><span>' + esc(rowValue(row, ['platform'])) + '</span><span>' + esc(rowValue(row, ['model', 'requested_model'])) + '</span>';
          return logCard(title, [
            field('耗时', rowValue(row, ['duration_ms'])),
            field('状态码', code),
            field('request_id', requestID(row), 'mono'),
            field('client_request_id', clientRequestID(row), 'mono'),
            field('IP', requestIP(row)),
            field('User-Agent', userAgent(row), 'full'),
            field('用户', rowValue(row, ['user_id'])),
            field('账号', rowValue(row, ['account_id']))
          ], index, isError ? 'error' : 'detail');
        }).join('');
      }
    }
    async function loadLogs() {
      setActiveType();
      syncUrl();
      set('summaryText', typeLabels[state.type] + ' · 加载中...');
      set('pageText', '第 ' + state.page + ' 页');
      const query = buildQuery();
      let url = apiBase + '/api/system-logs?' + query.toString();
      if (state.type !== 'system') {
        const remoteType = state.type === 'upstream' ? 'upstream-errors' : state.type === 'errors' ? 'request-errors' : 'requests';
        query.set('type', remoteType);
        url = apiBase + '/api/details?' + query.toString();
      }
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const payload = await response.json();
        const data = payload.data || payload;
        rows = Array.isArray(data.items) ? data.items : [];
        total = Number(data.total || rows.length || 0);
        renderRows();
        set('summaryText', typeLabels[state.type] + ' · 本页 ' + rows.length + ' 条 / 总计 ' + total + ' 条');
        set('pageText', '第 ' + state.page + ' 页');
      } catch (err) {
        rows = [];
        total = 0;
        renderRows();
        $('empty').hidden = false;
        $('empty').textContent = '加载失败：' + (err && err.message ? err.message : err);
        set('summaryText', typeLabels[state.type] + ' · 加载失败');
      }
    }
    async function openErrorDetail(index) {
      const row = rows[Number(index)];
      if (!row) return;
      let payload = rowSearchPayload(row);
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const errorID = rowValue(row, state.type === 'upstream' ? ['id', 'error_id'] : ['error_id', 'id'], '');
      if (errorID && String(errorID) !== '-' && state.type !== 'system') {
        const remoteType = state.type === 'upstream' ? 'upstream-errors' : 'request-errors';
        try {
          const response = await fetch(apiBase + '/api/error-detail?target=' + encodeURIComponent(targetID) + '&type=' + encodeURIComponent(remoteType) + '&id=' + encodeURIComponent(errorID), { cache: 'no-store' });
          if (response.ok) {
            const result = await response.json();
            payload = result.data || result;
          }
        } catch {}
      }
      currentDetailText = pretty(payload);
      set('detailSummary', 'request_id：' + requestID(row) + ' · client_request_id：' + clientRequestID(row));
      set('detailContent', currentDetailText);
      $('detailModal')?.classList.add('open');
    }
    function scheduleReload() {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => { state.page = 1; loadLogs().catch(console.error); }, 320);
    }
    document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
      state.type = button.dataset.type || 'requests';
      state.page = 1;
      loadLogs().catch(console.error);
    }));
    $('targetSelect')?.addEventListener('change', () => { localStorage.setItem('public_ops_target', $('targetSelect').value); state.page = 1; loadLogs().catch(console.error); });
    $('refreshBtn')?.addEventListener('click', () => loadLogs().catch(console.error));
    $('searchBtn')?.addEventListener('click', () => { state.page = 1; loadLogs().catch(console.error); });
    $('resetBtn')?.addEventListener('click', () => {
      writeFilters({ timeRange: '1h', startTime: '', endTime: '', view: 'errors' });
      state.page = 1;
      loadLogs().catch(console.error);
    });
    $('pageSize')?.addEventListener('change', () => { state.pageSize = Number($('pageSize').value || 100); state.page = 1; loadLogs().catch(console.error); });
    $('prevPage')?.addEventListener('click', () => { if (state.page <= 1) return; state.page -= 1; loadLogs().catch(console.error); });
    $('nextPage')?.addEventListener('click', () => { if (rows.length < state.pageSize && total <= state.page * state.pageSize) return; state.page += 1; loadLogs().catch(console.error); });
    ['timeRange', 'filterStartTime', 'filterEndTime', 'filterQ', 'filterPlatform', 'filterModel', 'filterStatusCodes', 'filterView', 'filterLevel', 'filterComponent', 'filterRequestID', 'filterClientRequestID', 'filterAccountID', 'filterUserID'].forEach(id => $(id)?.addEventListener(id === 'timeRange' || id === 'filterStartTime' || id === 'filterEndTime' || id === 'filterView' || id === 'filterLevel' ? 'change' : 'input', scheduleReload));
    document.addEventListener('click', event => {
      const copy = event.target.closest('[data-copy-row]');
      if (copy) {
        const row = rows[Number(copy.dataset.copyRow)];
        copyText(pretty(rowSearchPayload(row))).then(() => markCopied(copy)).catch(console.error);
        return;
      }
      const open = event.target.closest('[data-open-row]');
      if (open) openErrorDetail(open.dataset.openRow).catch(console.error);
      const error = event.target.closest('[data-error-row]');
      if (error) openErrorDetail(error.dataset.errorRow).catch(console.error);
    });
    $('detailClose')?.addEventListener('click', () => $('detailModal')?.classList.remove('open'));
    $('detailModal')?.addEventListener('click', event => { if (event.target === $('detailModal')) $('detailModal')?.classList.remove('open'); });
    $('copyDetail')?.addEventListener('click', event => copyText(currentDetailText).then(() => markCopied(event.currentTarget)).catch(console.error));
    applyUrlState();
    loadTargets().then(() => { setActiveType(); loadLogs(); }).catch(console.error);
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
  renderLogsPage,
  renderPage
}
