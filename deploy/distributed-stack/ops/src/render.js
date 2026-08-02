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
    .error-group { margin-top: 28px; padding: 22px; border: 1px solid #f2d9d7; border-radius: 22px; background: #fffafa; }
    .error-group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .error-group-head h2 { margin: 0; color: #7f2d2a; font-size: 18px; letter-spacing: 0; }
    .error-group-head span { color: #a56b68; font-size: 12px; font-weight: 800; }
    .error-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .error-cards .metric-card { background: #fff; border-color: #f5e1df; }
    .error-breakdown { margin-top: 18px; padding-top: 18px; border-top: 1px solid #f2d9d7; }
    .error-breakdown-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    .error-breakdown-head h3 { margin: 0; color: #7f2d2a; font-size: 15px; }
    .error-breakdown-head span { color: #a56b68; font-size: 12px; font-weight: 800; }
    .error-breakdown-list { display: grid; gap: 10px; }
    .error-breakdown-row { width: 100%; display: grid; grid-template-columns: minmax(130px, .8fr) minmax(120px, 2fr) auto; gap: 12px; align-items: center; padding: 0; border: 0; background: transparent; color: #647084; font-size: 13px; font-weight: 800; text-align: left; cursor: pointer; }
    .error-breakdown-row:hover .error-breakdown-label { color: #7f2d2a; }
    .error-breakdown-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .error-breakdown-track { height: 10px; overflow: hidden; border-radius: 999px; background: #f5e1df; }
    .error-breakdown-bar { height: 100%; min-width: 2px; border-radius: inherit; background: #d9625d; }
    .error-breakdown-value { min-width: 126px; text-align: right; color: #7f2d2a; }
    .error-breakdown-empty { padding: 10px 0 2px; color: #a56b68; font-size: 13px; font-weight: 750; }
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
    @media (max-width: 980px) { .cards, .error-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hero-card { grid-template-columns: 1fr; } .health-panel { border-right: 0; border-bottom: 1px solid var(--line); padding-bottom: 26px; } }
    @media (max-width: 820px) { .shell { width: min(100vw - 20px, 760px); margin-top: 18px; } .dashboard { padding: 18px; border-radius: 22px; } .heading { align-items: flex-start; flex-direction: column; } .controls { justify-content: stretch; width: 100%; gap: 10px; } .select { min-width: 0; width: 100%; } .hero-card { grid-template-columns: 1fr; padding: 26px; min-height: 0; } .health-panel { border-right: 0; border-bottom: 1px solid var(--line); padding-bottom: 26px; } .cards, .small-grid, .error-cards { grid-template-columns: 1fr; } .error-group { padding: 16px; } .error-group-head, .error-breakdown-head { align-items: flex-start; flex-direction: column; gap: 5px; } .error-breakdown-row { grid-template-columns: minmax(100px, .8fr) minmax(80px, 1.5fr) auto; gap: 8px; } .error-breakdown-value { min-width: 92px; font-size: 12px; } .detail-filters { width: 100%; justify-content: stretch; } .filter-input, .filter-select, .modal-refresh { width: 100%; } }
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
          <a class="action-btn" id="errorsLink" href="${escapeHtml(config.pagePath)}/errors">⌁ <span>错误分析</span></a>
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
          ${metricCard('请求时长', 'durationP99', 'ms (P99)', [['P95:', 'durationP95'], ['P90:', 'durationP90'], ['P50:', 'durationP50'], ['Avg:', 'durationAvg'], ['Max:', 'durationMax']], '', false, 'requests')}
          ${metricCard('TTFT', 'ttftP99', 'ms (P99)', [['P95:', 'ttftP95'], ['P90:', 'ttftP90'], ['P50:', 'ttftP50'], ['Avg:', 'ttftAvg'], ['Max:', 'ttftMax']], 'green', false, 'requests')}
        </section>
      </div>
      <div class="section-line"></div>
      <section class="small-grid">${smallCard('CPU', 'cpuValue', '警告 80% · 严重 95%')}${smallCard('内存', 'memoryValue', 'processMemory')}${smallCard('数据库', 'dbValue', 'dbCopy')}${smallCard('REDIS', 'redisValue', 'redisCopy')}${smallCard('协程', 'workerValue', 'workerCopy')}${smallCard('后台任务', 'jobsValue', 'jobsCopy')}</section>
      <section class="error-group" aria-labelledby="errorGroupTitle"><div class="error-group-head"><h2 id="errorGroupTitle">错误面板</h2><span>请求与上游错误</span></div><div class="error-cards">
        ${metricCard('SLA（排除业务限制）', 'sla', '%', [['异常数:', 'slaErrors']], 'red', true, 'errors')}
        ${metricCard('请求错误', 'errorRate', '%', [['错误数:', 'errorCount'], ['业务限制:', 'requestCountSmall']], 'green', false, 'errors')}
        ${metricCard('上游错误', 'upstreamErrorRate', '%', [['错误数（排除429/529）:', 'upstreamErrorCount'], ['429/529:', 'upstream429529']], 'green', false, 'upstream')}
      </div><div class="error-breakdown"><div class="error-breakdown-head"><h3>错误分类占比</h3><span id="errorDistributionMeta">加载中...</span></div><div class="error-breakdown-list" id="errorDistributionList"><div class="error-breakdown-empty">加载中...</div></div></div></section>
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
    function updateTargetLinks() { const target = selectedTarget(); const settings = $('settingsLink'); if (settings && target) settings.href = target.baseUrl + '/admin/settings'; const params = new URLSearchParams(); if (target && target.id) params.set('target', target.id); const logs = $('logsLink'); if (logs) logs.href = apiBase + '/logs' + (params.toString() ? '?' + params.toString() : ''); const errors = $('errorsLink'); if (errors) errors.href = apiBase + '/errors' + (params.toString() ? '?' + params.toString() : ''); }
    function drawSpark(points) { const svg = $('sparkline'); if (!svg) return; const values = (points || []).slice(-32).map(p => Number(p.qps || 0)); const max = Math.max(...values, 0.1); const path = values.map((v, i) => { const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * 420; const y = 38 - (v / max) * 30; return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join(' '); svg.innerHTML = '<path d="' + path + '" fill="none" stroke="#9dbcf8" stroke-width="4" stroke-linecap="round"/>'; }
    function drawTrend(points) { const canvas = $('trendCanvas'); if (!canvas) return; const rect = canvas.parentElement.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr)); canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px'; const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const y = 12 + i * ((rect.height - 24) / 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke(); } const values = (points || []).slice(-48).map(p => Number(p.request_count || 0)); const max = Math.max(...values, 1); ctx.strokeStyle = '#4f7deb'; ctx.lineWidth = 3; ctx.beginPath(); values.forEach((v, i) => { const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * rect.width; const y = rect.height - 14 - (v / max) * (rect.height - 28); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
    function errorStatusLabel(code) {
      const labels = { 400: '请求参数错误', 401: '认证失败', 403: '权限不足', 404: '资源不存在', 408: '请求超时', 409: '请求冲突', 413: '请求内容过大', 422: '请求无法处理', 429: '限流', 499: '客户端取消', 500: '内部错误', 502: '上游网关错误', 503: '服务不可用', 504: '上游超时', 529: '上游过载' };
      return labels[code] || (code >= 500 ? '服务端错误' : code >= 400 ? '客户端错误' : '其他错误');
    }
    function renderErrorDistribution(data) {
      const list = $('errorDistributionList');
      if (!list) return;
      const items = Array.isArray(data && data.items) ? data.items.slice() : [];
      const calculatedTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const total = Number(data && data.total) || calculatedTotal;
      set('errorDistributionMeta', timeRangeLabel() + ' · 共 ' + total + ' 条');
      if (!items.length || total <= 0) {
        list.innerHTML = '<div class="error-breakdown-empty">当前窗口暂无错误</div>';
        return;
      }
      items.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
      list.innerHTML = items.map(item => {
        const code = Number(item.status_code || 0);
        const count = Number(item.total || 0);
        const ratio = total > 0 ? count / total * 100 : 0;
        const detail = 'SLA 错误 ' + Number(item.sla || 0) + '，业务限制 ' + Number(item.business_limited || 0);
        return '<button class="error-breakdown-row" data-error-status="' + esc(code) + '" type="button" title="' + esc(detail) + '"><div class="error-breakdown-label">' + esc(code || '未知') + ' · ' + esc(errorStatusLabel(code)) + '</div><div class="error-breakdown-track" aria-label="占比 ' + ratio.toFixed(2) + '%"><div class="error-breakdown-bar" style="width:' + Math.max(0, Math.min(100, ratio)).toFixed(2) + '%"></div></div><div class="error-breakdown-value">' + count + ' 条 · ' + ratio.toFixed(2) + '%</div></button>';
      }).join('');
    }
    async function loadErrorDistribution() {
      const targetID = $('targetSelect') ? $('targetSelect').value : '';
      const timeRange = $('timeRangeSelect') ? $('timeRangeSelect').value : '1h';
      try {
        const response = await fetch(apiBase + '/api/error-distribution?target=' + encodeURIComponent(targetID) + '&time_range=' + encodeURIComponent(timeRange), { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const payload = await response.json();
        renderErrorDistribution(payload.data || payload);
      } catch {
        set('errorDistributionMeta', timeRangeLabel());
        const list = $('errorDistributionList');
        if (list) list.innerHTML = '<div class="error-breakdown-empty">错误分类暂时无法加载</div>';
      }
    }
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
      await Promise.all([loadRealtime(), loadErrorDistribution()]);
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
      const category = event.target.closest('[data-error-status]');
      if (category) {
        if ($('filterStatusCode')) $('filterStatusCode').value = category.dataset.errorStatus || '';
        if ($('filterStatus')) $('filterStatus').value = '';
        openDetails('errors');
        return;
      }
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
          <a class="action-btn" id="analysisLink" href="${escapeHtml(config.pagePath)}/errors">错误分析</a>
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
      updateAnalysisLink();
    }
    function updateAnalysisLink() {
      const link = $('analysisLink');
      if (!link) return;
      const params = new URLSearchParams();
      const target = selectedTarget();
      if (target && target.id) params.set('target', target.id);
      link.href = apiBase + '/errors' + (params.toString() ? '?' + params.toString() : '');
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
    $('targetSelect')?.addEventListener('change', () => { localStorage.setItem('public_ops_target', $('targetSelect').value); updateAnalysisLink(); state.page = 1; loadLogs().catch(console.error); });
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

function renderErrorsPage(config) {
  const pageTitle = `${config.serviceName} 上游错误分析`
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
    .panel { background: rgba(255,255,255,.92); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow); padding: 22px; }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
    h1 { margin: 0 0 5px; font-size: 22px; line-height: 1.15; letter-spacing: 0; }
    .sub { color: var(--muted); font-size: 13px; font-weight: 750; }
    .controls { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .select, .input, .action-btn { height: 40px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: #334155; font-size: 13px; font-weight: 800; outline: none; }
    .select { min-width: 170px; padding: 0 12px; }
    .input { width: 150px; padding: 0 12px; }
    .input.keyword { width: 260px; }
    .action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 16px; cursor: pointer; text-decoration: none; background: #f5f7fa; }
    .action-btn.primary { color: #2f62dc; background: var(--blue-soft); border-color: transparent; }
    .filters { display: grid; grid-template-columns: repeat(8, minmax(120px, 1fr)); gap: 10px; margin-top: 18px; padding: 14px; border: 1px solid var(--line); border-radius: 16px; background: var(--soft); }
    .filters label { display: grid; gap: 6px; color: #647084; font-size: 12px; font-weight: 900; }
    .filters .wide { grid-column: span 2; }
    .filters .actions { display: flex; align-items: end; gap: 8px; justify-content: flex-end; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .stat { min-height: 94px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
    .stat-label { color: #8a94a6; font-size: 12px; font-weight: 950; margin-bottom: 8px; }
    .stat-value { font-size: 28px; line-height: 1.1; font-weight: 950; color: #111827; }
    .stat-copy { margin-top: 8px; color: #647084; font-size: 12px; font-weight: 800; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 14px; align-items: start; }
    .secondary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
    .wide-panel { grid-column: 1 / -1; }
    .section { min-width: 0; border: 1px solid var(--line); border-radius: 14px; background: #fff; overflow: hidden; }
    .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--line); background: #f8fafc; }
    .section-head h2 { margin: 0; font-size: 15px; letter-spacing: 0; }
    .section-head span { color: #8a94a6; font-size: 12px; font-weight: 850; }
    .account-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: #fff; }
    .account-hint { color: #647084; font-size: 12px; font-weight: 850; }
    .sort-controls { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .sort-controls label { display: inline-flex; align-items: center; gap: 7px; color: #647084; font-size: 12px; font-weight: 900; }
    .sort-controls .select { min-width: 148px; height: 34px; border-radius: 9px; }
    .chart-grid { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, .88fr); gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); background: #fbfdff; }
    .chart { min-width: 0; border: 1px solid var(--line); border-radius: 13px; background: #fff; padding: 12px; }
    .chart-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
    .chart-title { color: #334155; font-size: 13px; font-weight: 950; }
    .chart-sub { color: #8a94a6; font-size: 11px; font-weight: 850; }
    .chart-canvas { display: block; width: 100%; height: 230px; }
    .rows { display: grid; }
    .row { display: grid; grid-template-columns: minmax(220px, 1.25fr) 92px minmax(210px, 1.1fr) minmax(190px, .9fr) 76px; gap: 12px; align-items: center; min-height: 64px; padding: 12px 16px; border-bottom: 1px solid var(--line); color: #647084; font-size: 13px; font-weight: 800; }
    .row:last-child { border-bottom: 0; }
    .row.account { grid-template-columns: minmax(230px, 1.15fr) repeat(4, minmax(96px, .55fr)) minmax(180px, .8fr) minmax(170px, .8fr) 86px; min-height: 76px; }
    .row.compact { grid-template-columns: minmax(170px, 1fr) 82px minmax(160px, 1fr); min-height: 54px; }
    .row.combo { grid-template-columns: minmax(260px, 1.35fr) 92px minmax(260px, 1.1fr) minmax(170px, .8fr); }
    .row.message { grid-template-columns: minmax(360px, 1.7fr) 86px minmax(260px, 1fr); }
    .name { min-width: 0; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .minor { color: #8a94a6; font-size: 12px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .metric { color: #334155; font-size: 16px; font-weight: 950; }
    .metric.warn { color: var(--amber); }
    .metric.danger { color: var(--red); }
    .risk { display: inline-flex; align-items: center; width: max-content; min-height: 25px; padding: 3px 9px; border-radius: 8px; background: #f1f5f9; color: #647084; font-size: 12px; font-weight: 950; }
    .risk.warn { color: var(--amber); background: #fff3d8; }
    .risk.danger { color: var(--red); background: #fde8e8; }
    .type-list { display: grid; gap: 5px; min-width: 0; }
    .type-item { display: grid; grid-template-columns: minmax(96px, 1fr) minmax(70px, .7fr); gap: 8px; align-items: center; min-width: 0; cursor: pointer; border-radius: 7px; }
    .type-item:hover { background: #f1f5f9; }
    .type-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #647084; }
    .type-count { color: #334155; text-align: right; font-weight: 950; }
    .bar-wrap { height: 10px; overflow: hidden; border-radius: 999px; background: #edf2f7; }
    .bar { height: 100%; min-width: 2px; border-radius: inherit; background: var(--blue); }
    .bar.red { background: var(--red); }
    .chips { display: flex; gap: 5px; flex-wrap: wrap; min-width: 0; }
    .chip { max-width: 180px; min-height: 24px; display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 8px; background: #f1f5f9; color: #647084; font-size: 12px; line-height: 1.25; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mini-btn { height: 30px; border: 0; border-radius: 8px; padding: 0 10px; color: #4b5563; background: #f1f5f9; font-size: 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }
    .mini-btn:hover { background: #e2e8f0; }
    .examples { display: grid; gap: 10px; padding: 14px 16px; }
    .example { display: grid; grid-template-columns: 132px minmax(130px, .6fr) minmax(140px, .7fr) minmax(260px, 1.3fr); gap: 12px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--line); color: #647084; font-size: 13px; font-weight: 800; }
    .example:last-child { border-bottom: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .empty { padding: 34px 16px; color: #94a3b8; text-align: center; font-weight: 850; }
    @media (max-width: 1280px) { .filters { grid-template-columns: repeat(4, minmax(0, 1fr)); } .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid, .secondary-grid, .chart-grid { grid-template-columns: 1fr; } }
    @media (max-width: 760px) { .shell { width: min(100vw - 20px, 740px); } .heading { align-items: flex-start; flex-direction: column; } .controls, .select, .input, .action-btn { width: 100%; } .filters { grid-template-columns: 1fr; } .filters .wide { grid-column: span 1; } .summary-grid { grid-template-columns: 1fr; } .row, .row.account, .row.compact, .row.combo, .row.message, .example { grid-template-columns: 1fr; gap: 7px; } }
  </style>
</head>
<body>
  <div class="topbar"><div>运维监控与排障</div><div class="admin-chip"><span class="avatar"></span><span>${escapeHtml(config.authUsername)}</span><form class="logout-form" method="post" action="${escapeHtml(config.pagePath)}/logout"><button class="logout-btn" type="submit">退出</button></form></div></div>
  <main class="shell">
    <section class="panel">
      <header class="heading">
        <div><h1>上游错误分析</h1><div class="sub">第一视角按账号与错误类型定位，再下钻模型和原始错误。</div></div>
        <div class="controls">
          <select class="select" id="targetSelect" aria-label="服务器"></select>
          <a class="action-btn" id="logsLink" href="${escapeHtml(config.pagePath)}/logs?type=upstream">原始上游错误</a>
          <a class="action-btn" href="${escapeHtml(config.pagePath)}">返回监控</a>
          <button class="action-btn primary" id="refreshBtn" type="button">刷新</button>
        </div>
      </header>
      <section class="filters">
        <label>时间范围<select class="select" id="timeRange"><option value="5m">近5分钟</option><option value="30m">近30分钟</option><option value="1h" selected>近1小时</option><option value="6h">近6小时</option><option value="24h">近24小时</option><option value="7d">近7天</option><option value="30d">近30天</option></select></label>
        <label>账号<select class="select" id="filterAccountID"><option value="">全部账号</option></select></label>
        <label>错误类型<select class="select" id="filterErrorClass"><option value="">全部类型</option><option value="上游过载">上游过载</option><option value="限流/配额限制">限流/配额限制</option><option value="额度/计费不足">额度/计费不足</option><option value="上游认证失败">上游认证失败</option><option value="权限/策略限制">权限/策略限制</option><option value="模型不可用">模型不可用</option><option value="上游超时">上游超时</option><option value="网络/连接错误">网络/连接错误</option><option value="上下文过长">上下文过长</option><option value="请求参数错误">请求参数错误</option><option value="上游服务端错误">上游服务端错误</option><option value="上游客户端错误">上游客户端错误</option><option value="未知错误">未知错误</option></select></label>
        <label>模型<select class="select" id="filterModel"><option value="">全部模型</option></select></label>
        <label>平台<select class="select" id="filterPlatform"><option value="">全部平台</option></select></label>
        <label>状态码<select class="select" id="filterStatusCodes"><option value="">全部状态码</option></select></label>
        <label class="wide">关键字<input class="input keyword" id="filterQ" type="search" placeholder="错误消息 / request_id"></label>
        <div class="actions"><button class="action-btn" id="resetBtn" type="button">重置</button><button class="action-btn primary" id="searchBtn" type="button">分析</button></div>
      </section>
      <section class="summary-grid">
        <article class="stat"><div class="stat-label">分析错误数</div><div class="stat-value" id="totalErrors">-</div><div class="stat-copy" id="totalCopy">等待加载</div></article>
        <article class="stat"><div class="stat-label">账号数</div><div class="stat-value" id="accountCount">-</div><div class="stat-copy">出现错误的上游账号</div></article>
        <article class="stat"><div class="stat-label">模型数</div><div class="stat-value" id="modelCount">-</div><div class="stat-copy">出现错误的模型</div></article>
        <article class="stat"><div class="stat-label">主因</div><div class="stat-value" id="topClass">-</div><div class="stat-copy" id="topClassCopy">按错误分类统计</div></article>
      </section>
      <section class="grid">
        <article class="section">
          <div class="section-head"><h2>账号与错误类型</h2><span id="accountsMeta">-</span></div>
          <div class="account-tools">
            <div class="account-hint">重点看“请求量”和“上游错误率”：高错误率账号更像需要探针或降权。</div>
            <div class="sort-controls">
              <label>排序<select class="select" id="accountSort"><option value="risk_score">风险优先</option><option value="upstream_error_rate" selected>上游错误率</option><option value="upstream_error_count">上游错误数</option><option value="request_error_rate">请求错误率</option><option value="request_error_count">请求错误数</option><option value="request_count">请求数</option><option value="latest_at">最近错误</option></select></label>
              <label>方向<select class="select" id="accountSortOrder"><option value="desc" selected>从高到低</option><option value="asc">从低到高</option></select></label>
            </div>
          </div>
          <div class="chart-grid">
            <div class="chart"><div class="chart-head"><div class="chart-title">账号错误率分布</div><div class="chart-sub">横轴请求数，纵轴上游错误率</div></div><canvas class="chart-canvas" id="accountRateChart"></canvas></div>
            <div class="chart"><div class="chart-head"><div class="chart-title">Top 账号排序</div><div class="chart-sub" id="accountBarSub">按当前排序指标</div></div><canvas class="chart-canvas" id="accountBarChart"></canvas></div>
          </div>
          <div class="rows" id="accountsRows"></div>
        </article>
      </section>
      <section class="secondary-grid">
        <article class="section"><div class="section-head"><h2>账号 / 错误类型组合</h2><span id="accountClassesMeta">-</span></div><div class="rows" id="accountClassesRows"></div></article>
        <article class="section"><div class="section-head"><h2>模型与错误类型</h2><span id="modelsMeta">-</span></div><div class="rows" id="modelsRows"></div></article>
        <article class="section wide-panel"><div class="section-head"><h2>账号 / 模型组合</h2><span id="accountModelsMeta">-</span></div><div class="rows" id="accountModelsRows"></div></article>
        <article class="section wide-panel"><div class="section-head"><h2>错误消息指纹</h2><span id="messagesMeta">归一化后聚合相似错误</span></div><div class="rows" id="messagesRows"></div></article>
        <article class="section wide-panel"><div class="section-head"><h2>最新样本</h2><span id="examplesMeta">用于快速确认原始错误</span></div><div class="examples" id="examplesRows"></div></article>
      </section>
    </section>
  </main>
  <script>
    const apiBase = ${JSON.stringify(config.pagePath)};
    const fallbackTargets = ${JSON.stringify(config.publicTargets)};
    const fmt = new Intl.DateTimeFormat('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const $ = id => document.getElementById(id);
    let targets = fallbackTargets;
    let data = null;
    let filterTimer = null;
    const filterOptionCache = {};
    function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
    function set(id, value) { const el = $(id); if (el) el.textContent = value; }
    function compactNumber(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + '亿';
      if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + '万';
      return String(n);
    }
    function pct(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '0.0%';
      return (n * 100).toFixed(1) + '%';
    }
    function formatTime(value) {
      if (!value) return '-';
      const d = new Date(value);
      return Number.isFinite(d.getTime()) ? fmt.format(d).replaceAll('/', '-') : String(value);
    }
    function selectedTarget() { return targets.find(target => target.id === $('targetSelect')?.value) || targets[0]; }
    function ensureSelectOption(id, value, label) {
      const select = $(id);
      const text = String(label || value || '');
      const val = String(value || '');
      if (!select || !val) return;
      if (!Array.from(select.options).some(option => option.value === val)) {
        select.insertAdjacentHTML('beforeend', '<option value="' + esc(val) + '">' + esc(text) + '</option>');
      }
    }
    function fillSelect(id, placeholder, items, valueOf, labelOf) {
      const select = $(id);
      if (!select) return;
      const current = select.value;
      const cache = filterOptionCache[id] || new Map();
      filterOptionCache[id] = cache;
      if (current && !cache.has(current)) cache.set(current, current);
      Array.from(select.options).forEach(option => {
        if (option.value) cache.set(option.value, option.textContent || option.value);
      });
      (Array.isArray(items) ? items : []).forEach(item => {
        const value = String(valueOf(item) || '');
        if (!value) return;
        cache.set(value, String(labelOf(item) || value));
      });
      const options = ['<option value="">' + esc(placeholder) + '</option>'];
      const seen = new Set(['']);
      Array.from(cache.entries()).forEach(([value, label]) => {
        if (!value || seen.has(value)) return;
        seen.add(value);
        options.push('<option value="' + esc(value) + '">' + esc(label) + '</option>');
      });
      select.innerHTML = options.join('');
      if (current) {
        ensureSelectOption(id, current, current);
        select.value = current;
      }
    }
    function fillFilterOptions(dims) {
      const dimensionData = dims || {};
      fillSelect('filterAccountID', '全部账号', dimensionData.accounts, item => item.account_id || item.key, item => item.label + ' · ' + compactNumber(item.count));
      fillSelect('filterModel', '全部模型', dimensionData.models, item => item.model || item.key, item => item.label + ' · ' + compactNumber(item.count));
      fillSelect('filterPlatform', '全部平台', dimensionData.platforms, item => item.key, item => item.label + ' · ' + compactNumber(item.count));
      fillSelect('filterStatusCodes', '全部状态码', dimensionData.status_codes, item => item.key, item => item.label + ' · ' + compactNumber(item.count));
    }
    function readFilters() {
      return {
        timeRange: $('timeRange')?.value || '1h',
        accountID: $('filterAccountID')?.value.trim() || '',
        errorClass: $('filterErrorClass')?.value.trim() || '',
        model: $('filterModel')?.value.trim() || '',
        platform: $('filterPlatform')?.value.trim() || '',
        statusCodes: $('filterStatusCodes')?.value.trim() || '',
        q: $('filterQ')?.value.trim() || ''
      };
    }
    function writeFilters(filters) {
      if ($('timeRange')) $('timeRange').value = filters.timeRange || '1h';
      if ($('filterAccountID')) $('filterAccountID').value = filters.accountID || '';
      if ($('filterErrorClass')) $('filterErrorClass').value = filters.errorClass || '';
      if ($('filterModel')) $('filterModel').value = filters.model || '';
      if ($('filterPlatform')) $('filterPlatform').value = filters.platform || '';
      if ($('filterStatusCodes')) $('filterStatusCodes').value = filters.statusCodes || '';
      if ($('filterQ')) $('filterQ').value = filters.q || '';
    }
    function applyUrlState() {
      const params = new URLSearchParams(location.search);
      ensureSelectOption('filterAccountID', params.get('account_id') || '', params.get('account_id') || '');
      ensureSelectOption('filterModel', params.get('model') || '', params.get('model') || '');
      ensureSelectOption('filterPlatform', params.get('platform') || '', params.get('platform') || '');
      ensureSelectOption('filterStatusCodes', params.get('status_codes') || '', params.get('status_codes') || '');
      writeFilters({
        timeRange: params.get('time_range') || '1h',
        accountID: params.get('account_id') || '',
        errorClass: params.get('error_class') || params.get('internal_error_type') || '',
        model: params.get('model') || '',
        platform: params.get('platform') || '',
        statusCodes: params.get('status_codes') || '',
        q: params.get('q') || ''
      });
    }
    function syncUrl() {
      const target = selectedTarget();
      const filters = readFilters();
      const params = new URLSearchParams();
      if (target && target.id) params.set('target', target.id);
      const map = { timeRange: 'time_range', accountID: 'account_id', errorClass: 'error_class', model: 'model', platform: 'platform', statusCodes: 'status_codes', q: 'q' };
      Object.entries(map).forEach(([key, param]) => {
        const value = filters[key];
        if (value && !(key === 'timeRange' && value === '1h')) params.set(param, value);
      });
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : ''));
      updateLogsLink();
    }
    function updateLogsLink() {
      const link = $('logsLink');
      if (!link) return;
      const filters = readFilters();
      const target = selectedTarget();
      const params = new URLSearchParams({ type: 'upstream', view: 'errors' });
      if (target && target.id) params.set('target', target.id);
      if (filters.timeRange) params.set('time_range', filters.timeRange);
      if (filters.accountID) params.set('account_id', filters.accountID);
      if (filters.errorClass) params.set('error_class', filters.errorClass);
      if (filters.model) params.set('model', filters.model);
      if (filters.platform) params.set('platform', filters.platform);
      if (filters.statusCodes) params.set('status_codes', filters.statusCodes);
      if (filters.q) params.set('q', filters.q);
      link.href = apiBase + '/logs?' + params.toString();
    }
    function topChips(items) {
      return (Array.isArray(items) ? items : []).slice(0, 2).map(item => '<span class="chip" title="' + esc(item.label) + '">' + esc(item.label) + ' · ' + compactNumber(item.count) + '</span>').join('');
    }
    function typeList(items) {
      const rows = (Array.isArray(items) ? items : []).slice(0, 3);
      if (!rows.length) return '<div class="minor">-</div>';
      return '<div class="type-list">' + rows.map(item => '<div class="type-item" data-filter-kind="error_class" data-filter-value="' + esc(item.label) + '"><span class="type-name" title="' + esc(item.label) + '">' + esc(item.label) + '</span><span class="type-count">' + compactNumber(item.count) + '</span></div>').join('') + '</div>';
    }
    function ratioText(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      return (n * 100).toFixed(n >= 0.1 ? 1 : 2) + '%';
    }
    function riskForAccount(account) {
      const upstreamRate = Number(account.upstream_error_rate);
      const requestErrors = Number(account.request_error_count);
      const upstreamErrors = Number(account.upstream_error_count || account.count);
      if ((Number.isFinite(upstreamRate) && upstreamRate >= 0.08 && upstreamErrors >= 5) || upstreamErrors >= 50) return { label: '建议降权', cls: 'danger' };
      if ((Number.isFinite(upstreamRate) && upstreamRate >= 0.03 && upstreamErrors >= 3) || requestErrors >= 20 || upstreamErrors >= 20) return { label: '观察', cls: 'warn' };
      return { label: '正常', cls: '' };
    }
    function riskScore(account) {
      const risk = riskForAccount(account);
      const rate = Number(account.upstream_error_rate);
      const upstreamErrors = Number(account.upstream_error_count || account.count || 0);
      const requestErrors = Number(account.request_error_count || 0);
      const base = risk.cls === 'danger' ? 2000000 : risk.cls === 'warn' ? 1000000 : 0;
      return base + (Number.isFinite(rate) ? rate * 100000 : 0) + upstreamErrors * 10 + requestErrors;
    }
    const accountSortLabels = {
      risk_score: '风险优先',
      upstream_error_rate: '上游错误率',
      upstream_error_count: '上游错误数',
      request_error_rate: '请求错误率',
      request_error_count: '请求错误数',
      request_count: '请求数',
      latest_at: '最近错误'
    };
    function accountMetric(account, key) {
      if (key === 'risk_score') return riskScore(account);
      if (key === 'latest_at') {
        const time = new Date(account.latest_at || 0).getTime();
        return Number.isFinite(time) ? time : null;
      }
      const value = Number(account[key]);
      return Number.isFinite(value) ? value : null;
    }
    function currentAccountSort() {
      return {
        by: $('accountSort')?.value || 'upstream_error_rate',
        order: $('accountSortOrder')?.value === 'asc' ? 'asc' : 'desc'
      };
    }
    function sortedAccounts(items) {
      const sort = currentAccountSort();
      const dir = sort.order === 'asc' ? 1 : -1;
      return (Array.isArray(items) ? items : []).slice().sort((a, b) => {
        const av = accountMetric(a, sort.by);
        const bv = accountMetric(b, sort.by);
        if (av === null && bv === null) return Number(b.count || 0) - Number(a.count || 0);
        if (av === null) return 1;
        if (bv === null) return -1;
        if (av === bv) return Number(b.count || 0) - Number(a.count || 0);
        return av > bv ? dir : -dir;
      });
    }
    function setupCanvas(id) {
      const canvas = $(id);
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const width = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 640));
      const height = Math.max(190, Math.floor(rect.height || canvas.clientHeight || 230));
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      return { canvas, ctx, width, height };
    }
    function drawEmptyChart(id, text) {
      const chart = setupCanvas(id);
      if (!chart) return;
      const { ctx, width, height } = chart;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '800 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text || '暂无数据', width / 2, height / 2);
    }
    function chartColor(account) {
      const risk = riskForAccount(account);
      if (risk.cls === 'danger') return '#d93a35';
      if (risk.cls === 'warn') return '#d97706';
      return '#4f7deb';
    }
    function drawAccountRateChart(items) {
      const rows = (Array.isArray(items) ? items : []).filter(item => Number.isFinite(Number(item.request_count)) && Number(item.request_count) > 0);
      if (!rows.length) return drawEmptyChart('accountRateChart', '暂无账号请求数');
      const chart = setupCanvas('accountRateChart');
      if (!chart) return;
      const { ctx, width, height } = chart;
      const pad = { l: 48, r: 16, t: 18, b: 34 };
      const plotW = width - pad.l - pad.r;
      const plotH = height - pad.t - pad.b;
      const maxX = Math.max(1, ...rows.map(item => Math.log10(Number(item.request_count || 0) + 1)));
      const maxRate = Math.max(0.1, ...rows.map(item => Number(item.upstream_error_rate || 0)));
      const yMax = Math.min(1, Math.max(0.1, maxRate * 1.18));
      const xFor = item => pad.l + (Math.log10(Number(item.request_count || 0) + 1) / maxX) * plotW;
      const yFor = rate => pad.t + (1 - Math.min(yMax, Math.max(0, rate)) / yMax) * plotH;
      ctx.strokeStyle = '#e6eaf0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, pad.t + plotH);
      ctx.lineTo(pad.l + plotW, pad.t + plotH);
      ctx.stroke();
      [0.03, 0.08].forEach(rate => {
        if (rate > yMax) return;
        const y = yFor(rate);
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = rate >= 0.08 ? 'rgba(217,58,53,.35)' : 'rgba(217,119,6,.35)';
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(pad.l + plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = rate >= 0.08 ? '#d93a35' : '#d97706';
        ctx.font = '800 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((rate * 100).toFixed(0) + '%', pad.l + 4, y - 4);
      });
      rows.forEach(item => {
        const x = xFor(item);
        const y = yFor(Number(item.upstream_error_rate || 0));
        const r = Math.max(4, Math.min(13, Math.sqrt(Number(item.upstream_error_count || item.count || 1)) * 1.3));
        ctx.beginPath();
        ctx.fillStyle = chartColor(item);
        ctx.globalAlpha = 0.78;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      const labeled = sortedAccounts(rows).filter(item => Number(item.upstream_error_rate || 0) >= 0.03).slice(0, 5);
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      labeled.forEach(item => {
        const label = String(item.label || item.key || '').slice(0, 18);
        ctx.fillText(label, Math.min(width - 126, xFor(item) + 8), Math.max(16, yFor(Number(item.upstream_error_rate || 0)) - 8));
      });
      ctx.fillStyle = '#647084';
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('请求数（log）', pad.l + plotW / 2, height - 8);
      ctx.save();
      ctx.translate(14, pad.t + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('上游错误率', 0, 0);
      ctx.restore();
    }
    function metricDisplay(key, value, item) {
      if (key === 'risk_score') return riskForAccount(item).label + ' · ' + ratioText(item.upstream_error_rate);
      if (key.includes('rate')) return ratioText(value);
      if (key === 'latest_at') return formatTime(value);
      return compactNumber(value);
    }
    function drawAccountBarChart(items) {
      const sort = currentAccountSort();
      const rows = sortedAccounts(items).filter(item => accountMetric(item, sort.by) !== null).slice(0, 12);
      set('accountBarSub', '按' + (accountSortLabels[sort.by] || sort.by) + '排序');
      if (!rows.length) return drawEmptyChart('accountBarChart', '暂无排序数据');
      const chart = setupCanvas('accountBarChart');
      if (!chart) return;
      const { ctx, width, height } = chart;
      const pad = { l: 132, r: 54, t: 8, b: 14 };
      const rowH = Math.max(13, Math.min(18, (height - pad.t - pad.b) / rows.length));
      const maxValue = Math.max(...rows.map(item => Math.abs(Number(accountMetric(item, sort.by) || 0))), 1);
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      rows.forEach((item, index) => {
        const y = pad.t + index * rowH + 2;
        const value = Math.abs(Number(accountMetric(item, sort.by) || 0));
        const barW = Math.max(2, (value / maxValue) * (width - pad.l - pad.r));
        const label = String(item.label || item.key || '').slice(0, 20);
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'right';
        ctx.fillText(label, pad.l - 8, y + rowH - 5);
        ctx.fillStyle = '#edf2f7';
        ctx.fillRect(pad.l, y + 2, width - pad.l - pad.r, Math.max(7, rowH - 6));
        ctx.fillStyle = chartColor(item);
        ctx.fillRect(pad.l, y + 2, barW, Math.max(7, rowH - 6));
        ctx.fillStyle = '#647084';
        ctx.textAlign = 'left';
        ctx.fillText(metricDisplay(sort.by, accountMetric(item, sort.by), item), pad.l + barW + 6, y + rowH - 5);
      });
    }
    function renderAccountSection(items) {
      const rows = sortedAccounts(items);
      const sort = currentAccountSort();
      set('accountsMeta', compactNumber(rows.length) + ' 个账号 · 按' + (accountSortLabels[sort.by] || sort.by) + (sort.order === 'asc' ? '升序' : '降序'));
      drawAccountRateChart(rows);
      drawAccountBarChart(rows);
      renderAccountRows(rows);
    }
    function metricCell(label, value, options = {}) {
      const cls = options.cls ? 'metric ' + options.cls : 'metric';
      return '<div><div class="' + cls + '">' + esc(value) + '</div><div class="minor">' + esc(label) + '</div></div>';
    }
    function renderAccountRows(items) {
      const el = $('accountsRows');
      if (!el) return;
      const rows = Array.isArray(items) ? items : [];
      if (!rows.length) {
        el.innerHTML = '<div class="empty">暂无数据</div>';
        return;
      }
      el.innerHTML = rows.map(account => {
        const risk = riskForAccount(account);
        const reqCount = account.request_count === null || account.request_count === undefined ? '-' : compactNumber(account.request_count);
        const reqErr = account.request_error_count === null || account.request_error_count === undefined ? '-' : compactNumber(account.request_error_count);
        const upstreamErr = compactNumber(account.upstream_error_count || account.count || 0);
        const upstreamRate = ratioText(account.upstream_error_rate);
        const reqErrRate = account.request_error_rate === null || account.request_error_rate === undefined ? '-' : ratioText(account.request_error_rate);
        const rateCls = Number(account.upstream_error_rate) >= 0.08 ? 'danger' : Number(account.upstream_error_rate) >= 0.03 ? 'warn' : '';
        const title = '<div><div class="name" title="' + esc(account.label) + '">' + esc(account.label) + '</div><div class="minor">最近 ' + esc(formatTime(account.latest_at)) + '</div></div>';
        const action = '<button class="mini-btn" type="button" data-filter-kind="account" data-filter-value="' + esc(account.account_id || account.key) + '">下钻</button>';
        return '<div class="row account">' +
          title +
          metricCell('请求数', reqCount) +
          metricCell('请求错误', reqErr + (reqErrRate !== '-' ? ' · ' + reqErrRate : '')) +
          metricCell('上游错误', upstreamErr) +
          metricCell('上游错误率', upstreamRate, { cls: rateCls }) +
          typeList(account.classes) +
          '<div><div class="chips">' + topChips(account.models) + '</div><div class="risk ' + risk.cls + '">' + risk.label + '</div></div>' +
          action +
          '</div>';
      }).join('');
    }
    function renderBucketRows(id, items, options = {}) {
      const el = $(id);
      if (!el) return;
      const rows = Array.isArray(items) ? items : [];
      const limit = options.limit || 8;
      if (!rows.length) {
        el.innerHTML = '<div class="empty">暂无数据</div>';
        return;
      }
      el.innerHTML = rows.slice(0, limit).map(item => {
        const cls = options.kind === 'message' ? 'row message' : options.kind === 'combo' ? 'row combo' : options.kind === 'compact' ? 'row compact' : 'row';
        const barClass = options.red ? 'bar red' : 'bar';
        const title = '<div><div class="name" title="' + esc(item.label) + '">' + esc(item.label) + '</div><div class="minor">' + esc(item.latest_at ? '最近 ' + formatTime(item.latest_at) : '') + '</div></div>';
        const count = '<div><div class="metric">' + compactNumber(item.count) + '</div><div class="minor">' + pct(item.percent) + '</div></div>';
        const detail = options.detail === 'types'
          ? typeList(item.classes)
          : '<div class="chips">' + topChips(options.chips === 'accounts' ? item.accounts : options.chips === 'models' ? item.models : item.classes) + '</div>';
        const button = options.filter
          ? '<button class="mini-btn" type="button" data-filter-kind="' + esc(options.filter) + '" data-filter-value="' + esc(item[options.filterValue || 'key']) + '">下钻</button>'
          : '<div class="bar-wrap"><div class="' + barClass + '" style="width:' + Math.max(2, Math.min(100, Number(item.percent || 0) * 100)).toFixed(1) + '%"></div></div>';
        if (options.kind === 'compact') return '<div class="' + cls + '">' + title + count + detail + '</div>';
        if (options.kind === 'message') return '<div class="' + cls + '">' + title + count + detail + '</div>';
        if (options.kind === 'combo') return '<div class="' + cls + '">' + title + count + detail + '<div class="bar-wrap"><div class="' + barClass + '" style="width:' + Math.max(2, Math.min(100, Number(item.percent || 0) * 100)).toFixed(1) + '%"></div></div></div>';
        return '<div class="' + cls + '">' + title + count + detail + '<div class="chips">' + topChips(item.models) + '</div>' + button + '</div>';
      }).join('');
    }
    function renderExamples(items) {
      const el = $('examplesRows');
      if (!el) return;
      const rows = Array.isArray(items) ? items : [];
      if (!rows.length) {
        el.innerHTML = '<div class="empty">暂无样本</div>';
        return;
      }
      el.innerHTML = rows.map(item => {
        return '<div class="example"><div>' + esc(formatTime(item.created_at)) + '<div class="minor mono">' + esc(item.request_id || '-') + '</div></div><div><strong>' + esc(item.status_code || '-') + '</strong><div class="minor">' + esc(item.error_class || '-') + '</div></div><div>' + esc(item.account_name || item.account_id || '-') + '<div class="minor">' + esc(item.model || '-') + '</div></div><div>' + esc(item.message || '-') + '</div></div>';
      }).join('');
    }
    function renderAnalysis() {
      const dims = data && data.dimensions ? data.dimensions : {};
      const classes = dims.classes || [];
      fillFilterOptions(dims);
      set('totalErrors', compactNumber(data && data.items_analyzed));
      const filters = readFilters();
      const scannedText = data && data.scanned_total !== undefined ? compactNumber(data.scanned_total) : compactNumber(data && data.remote_total);
      set('totalCopy', filters.errorClass ? '命中 ' + compactNumber(data && data.items_analyzed) + ' / 已读取 ' + scannedText + ' 条' : data && data.limited ? '已读取 ' + compactNumber(data.scanned_total) + ' / 远端 ' + compactNumber(data.remote_total) + ' 条' : '已读取全部 ' + compactNumber(data && data.scanned_total) + ' 条');
      set('accountCount', compactNumber((dims.accounts || []).length));
      set('modelCount', compactNumber((dims.models || []).length));
      set('topClass', classes[0] ? classes[0].label : '-');
      set('topClassCopy', classes[0] ? compactNumber(classes[0].count) + ' 条 · ' + pct(classes[0].percent) : '按错误分类统计');
      set('modelsMeta', compactNumber((dims.models || []).length) + ' 个模型');
      set('accountClassesMeta', compactNumber((dims.account_classes || []).length) + ' 个组合');
      set('accountModelsMeta', compactNumber((dims.account_models || []).length) + ' 个组合');
      renderAccountSection(dims.accounts);
      renderBucketRows('accountClassesRows', dims.account_classes, { kind: 'combo', limit: 10, chips: 'models', red: true });
      renderBucketRows('modelsRows', dims.models, { kind: 'compact', limit: 10, detail: 'types' });
      renderBucketRows('accountModelsRows', dims.account_models, { kind: 'combo', limit: 10, chips: 'classes', red: true });
      renderBucketRows('messagesRows', dims.messages, { kind: 'message', limit: 10, chips: 'accounts', red: true });
      renderExamples(data && data.examples);
    }
    async function loadTargets() {
      try {
        const response = await fetch(apiBase + '/api/targets', { cache: 'no-store' });
        if (response.ok) targets = await response.json();
      } catch {}
      const select = $('targetSelect');
      if (!select) return;
      select.innerHTML = targets.length ? targets.map(target => '<option value="' + esc(target.id) + '">' + esc(target.name) + (target.configured ? '' : '（未配置Key）') + '</option>').join('') : '<option value="">未配置服务器</option>';
      const params = new URLSearchParams(location.search);
      const fromUrl = params.get('target');
      const saved = localStorage.getItem('public_ops_target');
      if (fromUrl && targets.some(target => target.id === fromUrl)) select.value = fromUrl;
      else if (saved && targets.some(target => target.id === saved)) select.value = saved;
      updateLogsLink();
    }
    async function loadAnalysis() {
      syncUrl();
      set('totalErrors', '...');
      set('totalCopy', '正在读取全部上游错误');
      const target = selectedTarget();
      const filters = readFilters();
      const query = new URLSearchParams({
        target: target && target.id ? target.id : '',
        time_range: filters.timeRange,
        page_size: '500',
        view: 'errors',
        phase: 'upstream'
      });
      if (filters.accountID) query.set('account_id', filters.accountID);
      if (filters.errorClass) query.set('error_class', filters.errorClass);
      if (filters.model) query.set('model', filters.model);
      if (filters.platform) query.set('platform', filters.platform);
      if (filters.statusCodes) query.set('status_codes', filters.statusCodes);
      if (filters.q) query.set('q', filters.q);
      try {
        const response = await fetch(apiBase + '/api/upstream-error-analysis?' + query.toString(), { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const payload = await response.json();
        data = payload.data || payload;
        renderAnalysis();
      } catch (err) {
        data = null;
        set('totalErrors', '-');
        set('totalCopy', '加载失败：' + (err && err.message ? err.message : err));
        ['accountsRows', 'modelsRows', 'accountClassesRows', 'accountModelsRows', 'messagesRows', 'examplesRows'].forEach(id => {
          const el = $(id);
          if (el) el.innerHTML = '<div class="empty">加载失败</div>';
        });
      }
    }
    function scheduleLoad() {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => loadAnalysis().catch(console.error), 320);
    }
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-filter-kind]');
      if (!button) return;
      const kind = button.dataset.filterKind;
      const value = button.dataset.filterValue || '';
      if (kind === 'account' && value && value !== 'unknown') $('filterAccountID').value = value;
      if (kind === 'error_class' && value) $('filterErrorClass').value = value;
      if (kind === 'model' && value) $('filterModel').value = value;
      loadAnalysis().catch(console.error);
    });
    $('targetSelect')?.addEventListener('change', () => { localStorage.setItem('public_ops_target', $('targetSelect').value); loadAnalysis().catch(console.error); });
    $('refreshBtn')?.addEventListener('click', () => loadAnalysis().catch(console.error));
    $('searchBtn')?.addEventListener('click', () => loadAnalysis().catch(console.error));
    $('resetBtn')?.addEventListener('click', () => {
      writeFilters({ timeRange: '1h' });
      loadAnalysis().catch(console.error);
    });
    ['timeRange', 'filterAccountID', 'filterErrorClass', 'filterModel', 'filterPlatform', 'filterStatusCodes'].forEach(id => $(id)?.addEventListener('change', scheduleLoad));
    ['accountSort', 'accountSortOrder'].forEach(id => $(id)?.addEventListener('change', () => {
      if (data && data.dimensions) renderAccountSection(data.dimensions.accounts || []);
    }));
    window.addEventListener('resize', () => {
      if (data && data.dimensions) renderAccountSection(data.dimensions.accounts || []);
    });
    $('filterQ')?.addEventListener('input', scheduleLoad);
    applyUrlState();
    loadTargets().then(() => loadAnalysis()).catch(console.error);
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
  renderErrorsPage,
  renderLoginPage,
  renderLogsPage,
  renderPage
}
