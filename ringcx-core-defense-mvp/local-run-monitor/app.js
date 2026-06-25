const apiParam = new URLSearchParams(location.search).get("api");
const API_KEY = "ringcxCoreDefense.collectorApi.v1";
const DEFAULT_API = "http://127.0.0.1:4328";
const storedApi = localStorage.getItem(API_KEY);
if (apiParam) {
  localStorage.setItem(API_KEY, apiParam);
} else if (!storedApi || storedApi === "http://127.0.0.1:4318") {
  localStorage.setItem(API_KEY, DEFAULT_API);
}
const API = apiParam || localStorage.getItem(API_KEY) || DEFAULT_API;
const TAB_KEY = "ringcxCoreDefense.dashboardTab.v1";
const SOURCE_FILTER_KEY = "ringcxCoreDefense.sourceFilter.v1";
const SOURCE_FILTERS = new Set(["all", "local", "public_web"]);

const byId = id => document.getElementById(id);
const tabButtons = [...document.querySelectorAll("[data-tab]")];
const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];
const roleColors = {
  PM: "#f2b84b",
  QA: "#53d47d",
  SE: "#33c7d8",
  SDET: "#ef5a5a"
};
let selectedSlotMapId = "";
let currentSourceFilter = SOURCE_FILTERS.has(localStorage.getItem(SOURCE_FILTER_KEY))
  ? localStorage.getItem(SOURCE_FILTER_KEY)
  : "all";

function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function fmtDuration(ms) {
  if (!ms) return "-";
  const seconds = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(seconds % 60).padStart(2, "0")}`;
}

function fmtWorkDuration(ms) {
  if (ms === null || ms === undefined) return "-";
  if (ms <= 0) return "0m";
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function fmtPlayDuration(ms) {
  if (ms === null || ms === undefined) return "-";
  if (ms <= 0) return "0m";
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 10) return `${hours}h`;
  if (hours) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  return `${minutes}m`;
}

function fmtPct(value) {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${Math.round(normalized * 100)}%`;
}

function fmtNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function setActiveTab(tab) {
  const nextTab = tab === "work" ? "work" : "gameplay";
  tabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.tab === nextTab);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle("active", panel.dataset.tabPanel === nextTab);
  });
  localStorage.setItem(TAB_KEY, nextTab);
}

function resultPill(row) {
  const label = row.won ? "Win" : (row.end_reason || "Other");
  const cls = row.won ? "win" : (row.end_reason === "fail" ? "fail" : "other");
  return `<span class="result-pill ${cls}">${label}</span>`;
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function usesChinese(text) {
  return /[\u4e00-\u9fff]/.test(text || "");
}

async function fetchJson(path) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${API}${path}${separator}_ts=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function withSource(path) {
  if (currentSourceFilter === "all") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}source=${encodeURIComponent(currentSourceFilter)}`;
}

function sourceFilterLabel(value) {
  if (value === "local") return "Local";
  if (value === "public_web") return "Public Web";
  return "All sources";
}

function setSourceFilter(value, refresh = true) {
  currentSourceFilter = SOURCE_FILTERS.has(value) ? value : "all";
  localStorage.setItem(SOURCE_FILTER_KEY, currentSourceFilter);
  document.querySelectorAll("[data-source-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.sourceFilter === currentSourceFilter);
  });
  const meta = byId("sourceFilterMeta");
  if (meta) meta.textContent = sourceFilterLabel(currentSourceFilter);
  if (refresh) {
    refreshAll().catch(error => handleRefreshError(error, "Unable to refresh filtered data."));
  }
}

function metricClass(type) {
  if (type === "critical") return "critical";
  if (type === "warn") return "warn";
  return "ok";
}

function tooltipText(text) {
  return String(text || "").replace(/"/g, "&quot;");
}

function renderMission(data) {
  const mission = data.mission || {};
  const spike = mission.spike || {};
  const sampleSize = data.sample_size || {};
  const cards = [
    {
      label: "Active Users",
      value: fmtNumber(mission.active_sessions_24h || 0),
      note: `${mission.active_runs_24h || 0} runs in last 24h`,
      type: mission.active_sessions_24h ? "ok" : "warn",
      help: "Unique anonymous sessions with gameplay activity in the last 24 hours. This is a session-level proxy until customer_id and anonymous_user_id are available."
    },
    {
      label: "Time In Game",
      value: fmtPlayDuration(mission.total_run_duration_ms || 0),
      note: `avg run ${fmtDuration(mission.avg_run_duration_ms || 0)}`,
      type: mission.total_run_duration_ms ? "ok" : "warn",
      help: "Total completed-run duration captured by telemetry. Formula: sum(duration_ms) for ended runs."
    },
    {
      label: "Run Capture",
      value: fmtNumber(mission.run_capture || 0),
      note: `${sampleSize.checkpoints || 0} checkpoints`,
      type: mission.run_capture ? "ok" : "critical",
      help: "Number of completed runs captured by the local collector. Checkpoints show how much in-run state was sampled."
    },
    {
      label: "Clear Rate",
      value: fmtPct(mission.clear_rate || 0),
      note: `avg wave ${mission.avg_wave || 0}`,
      type: mission.clear_rate >= .5 ? "ok" : "warn",
      help: "Run win rate. Formula: won runs divided by completed runs. This answers whether players are clearing the game."
    },
    {
      label: "Trust / SLA",
      value: `${Math.round(mission.avg_trust || 0)}/${Math.round(mission.avg_sla || 0)}`,
      note: "average ending health",
      type: (mission.avg_trust || 0) < 30 || (mission.avg_sla || 0) < 30 ? "critical" : "ok",
      help: "Average final Trust and SLA at run end. This is the ending state, not the starting value or lowest value during the run."
    },
    {
      label: "Fail Spike",
      value: spike.wave ? `W${spike.wave}` : "-",
      note: `${spike.map_id || "-"} - ${fmtPct(spike.fail_rate || 0)}`,
      type: (spike.fail_rate || 0) >= .4 ? "critical" : "warn",
      help: "Wave and map with the strongest failure concentration. Use it to find difficulty spikes or unfair pacing."
    },
    {
      label: "Leaks",
      value: fmtNumber(mission.total_leaks || 0),
      note: "total leaked risks",
      type: mission.total_leaks ? "warn" : "ok",
      help: "Total risks that passed the defense line. High leaks usually mean placement, upgrade timing, or wave pressure is too hard."
    },
    {
      label: "Upgrades",
      value: fmtNumber(mission.total_upgrades || 0),
      note: "defender upgrades",
      type: mission.total_upgrades ? "ok" : "warn",
      help: "Total defender upgrade actions captured across completed runs. This indicates whether players are using progression mechanics."
    },
    {
      label: "Mini-games",
      value: mission.mini_game_attempts ? fmtPct((mission.mini_game_wins || 0) / mission.mini_game_attempts) : "N/A",
      note: mission.mini_game_attempts ? `${mission.mini_game_attempts || 0} quiz answers` : `${mission.legacy_mini_game_wins || 0} legacy correct, no attempts`,
      type: mission.mini_game_attempts ? "ok" : (mission.legacy_mini_game_wins ? "warn" : "warn"),
      help: "RCX quiz mini-game answer correctness. Formula: correct answers divided by total answers. Legacy runs may only have correct counts, so their correctness rate is not calculable."
    }
  ];
  byId("missionGrid").innerHTML = cards.map(card => `
    <article class="command-metric ${metricClass(card.type)}">
      <div class="metric-label">
        <span>${card.label}</span>
        <span class="metric-help" tabindex="0" aria-label="${tooltipText(card.help)}" data-help="${tooltipText(card.help)}">i</span>
      </div>
      <div class="metric-value">${card.value}</div>
      <div class="metric-note">${card.note}</div>
    </article>
  `).join("");
}

function renderFunnel(data) {
  const funnel = data.funnel || [];
  byId("funnelList").innerHTML = funnel.map(item => `
    <div class="funnel-step">
      <div class="step-name">${item.name}</div>
      <div class="bar"><div class="bar-fill" style="--w:${Math.max(4, (item.rate || 0) * 100)}%"></div></div>
      <div class="step-val">${item.name === "Run Captured" ? fmtNumber(item.value || 0) : fmtPct(item.rate || 0)}</div>
    </div>
  `).join("");
  const spike = data.mission ? data.mission.spike : null;
  byId("funnelInsight").textContent = spike && spike.wave
    ? `Current strongest signal: ${spike.map_id} Wave ${spike.wave} has ${fmtPct(spike.fail_rate)} fail rate. Use the recent-run table below to inspect the exact run state.`
    : "No wave spike yet. Play more runs with the collector enabled to build confidence.";
}

function cellColor(value) {
  if (value >= .4) return ["#ef5a5a", "82%"];
  if (value >= .25) return ["#f2b84b", "72%"];
  if (value > 0) return ["#33c7d8", "62%"];
  return ["#263643", "48%"];
}

function labelCell(text, className = "hm-label") {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = text;
  return node;
}

function shortMap(map) {
  return String(map || "-").replace("sRoute", "S Route").replace("spiral", "Spiral");
}

function renderHeatmap(data) {
  const heatmap = byId("waveHeatmap");
  const rows = data.wave_rows || [];
  const maxWave = Math.max(12, ...rows.flatMap(row => (row.cells || []).map(cell => cell.wave || 0)));
  heatmap.style.gridTemplateColumns = `76px repeat(${maxWave}, minmax(28px, 1fr))`;
  heatmap.innerHTML = "";
  heatmap.appendChild(labelCell(""));
  for (let wave = 1; wave <= maxWave; wave += 1) heatmap.appendChild(labelCell(`W${wave}`, "hm-wave"));
  rows.forEach(row => {
    heatmap.appendChild(labelCell(shortMap(row.map_id)));
    for (let wave = 1; wave <= maxWave; wave += 1) {
      const cell = (row.cells || []).find(item => item.wave === wave) || { wave, run_count: 0, fail_count: 0, fail_rate: 0 };
      const [color, mix] = cellColor(cell.fail_rate || 0);
      const node = document.createElement("button");
      node.className = "hm-cell";
      node.style.setProperty("--c", color);
      node.style.setProperty("--p", mix);
      node.textContent = Math.round((cell.fail_rate || 0) * 100);
      node.title = `${shortMap(row.map_id)} Wave ${wave}: ${fmtPct(cell.fail_rate || 0)} fail rate`;
      node.addEventListener("click", () => selectWave(row.map_id, cell, node));
      heatmap.appendChild(node);
    }
  });
  const spike = data.mission ? data.mission.spike : null;
  if (spike) selectWave(spike.map_id, spike);
}

function selectWave(mapId, cell, target) {
  if (target) {
    document.querySelectorAll(".hm-cell").forEach(node => node.classList.remove("active"));
    target.classList.add("active");
  }
  byId("selectedWaveMeta").textContent = `${shortMap(mapId)} - W${cell.wave || "-"}`;
  byId("waveFailRate").textContent = fmtPct(cell.fail_rate || 0);
  byId("waveRuns").textContent = fmtNumber(cell.run_count || 0);
  byId("waveFails").textContent = fmtNumber(cell.fail_count || 0);
  byId("waveMap").textContent = shortMap(mapId);
}

function renderSignals(data) {
  const mission = data.mission || {};
  const spike = mission.spike || {};
  const issues = data.qa_issues || [];
  const signals = [
    {
      severity: (spike.fail_rate || 0) >= .4 ? "critical" : "warn",
      title: spike.wave ? `Wave ${spike.wave} fail spike` : "No wave sample",
      copy: spike.wave ? `${shortMap(spike.map_id)} is at ${fmtPct(spike.fail_rate || 0)} fail rate from ${spike.run_count || 0} run(s).` : "Need completed runs to calculate wave health.",
      tag: "Wave"
    },
    {
      severity: (mission.avg_trust || 0) < 30 || (mission.avg_sla || 0) < 30 ? "critical" : "ok",
      title: "Ending health",
      copy: `Average Trust/SLA is ${Math.round(mission.avg_trust || 0)}/${Math.round(mission.avg_sla || 0)}.`,
      tag: "Core"
    },
    {
      severity: (mission.total_upgrades || 0) ? "ok" : "warn",
      title: "Upgrade adoption",
      copy: `${mission.total_upgrades || 0} defender upgrade(s) recorded across captured runs.`,
      tag: "Balance"
    },
    {
      severity: issues.some(issue => issue.severity === "critical") ? "critical" : (issues.some(issue => issue.severity === "warn") ? "warn" : "ok"),
      title: "Collector QA",
      copy: `${issues.length} collector health signal(s) available.`,
      tag: "QA"
    }
  ];
  byId("signalCount").textContent = `${signals.length} signals`;
  byId("signalList").innerHTML = signals.map(signal => `
    <div class="alert-row"><div class="sev ${signal.severity}"></div><div><div class="alert-title">${signal.title}</div><div class="alert-copy">${signal.copy}</div></div><div class="tag">${signal.tag}</div></div>
  `).join("");
}

function renderDefenders(data) {
  const defenders = data.defenders || [];
  byId("defenderMatrix").innerHTML = `
    <div class="axis top">High win rate</div>
    <div class="axis right">High usage</div>
    ${defenders.map(defender => {
      const x = Math.max(14, Math.min(86, (defender.relative_usage || defender.usage_rate || 0) * 76 + 12));
      const y = 88 - Math.max(14, Math.min(76, (defender.win_rate || 0) * 76 + 12));
      const size = 36 + Math.min(22, (defender.damage_share || 0) * 22);
      const color = roleColors[defender.role] || "#33c7d8";
      return `<div class="bubble" style="--x:${x}%;--y:${y}%;--s:${size}px;--color:${color};">${defender.role}</div>`;
    }).join("")}
  `;
  byId("defenderCards").innerHTML = defenders.map(defender => `
    <div class="tower-card">
      <div class="tower-name">${defender.role}</div>
      <div class="tower-stat">Usage ${fmtPct(defender.usage_rate || 0)}<br>Win ${fmtPct(defender.win_rate || 0)}<br>Damage ${fmtNumber(defender.damage || 0)}</div>
    </div>
  `).join("");
}

function pathPoints(path) {
  return (path || []).map(point => point.join(",")).join(" ");
}

function dominantRoleLabel(roles) {
  const entries = Object.entries(roles || {});
  if (!entries.length) return "unused";
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([role, count]) => `${role} ${count}`).join(" / ");
}

function renderSlotUsage(data) {
  const usage = data.slot_usage || {};
  const maps = usage.maps || [];
  if (!maps.length) {
    byId("slotUsageMap").innerHTML = `<div class="command-callout">No map layout available.</div>`;
    return;
  }
  if (!selectedSlotMapId || !maps.some(map => map.map_id === selectedSlotMapId)) {
    selectedSlotMapId = usage.active_map_id || maps[0].map_id;
  }
  byId("slotMapTabs").innerHTML = maps.map(map => `
    <button type="button" class="${map.map_id === selectedSlotMapId ? "active" : ""}" data-slot-map="${map.map_id}">
      ${map.name}
    </button>
  `).join("");
  byId("slotMapTabs").querySelectorAll("[data-slot-map]").forEach(button => {
    button.addEventListener("click", () => {
      selectedSlotMapId = button.dataset.slotMap;
      renderSlotUsage(data);
    });
  });

  const map = maps.find(item => item.map_id === selectedSlotMapId) || maps[0];
  const maxUsed = Math.max(1, map.max_used_count || 0);
  const topSlots = (map.slots || [])
    .filter(slot => (slot.used_count || 0) > 0)
    .sort((a, b) => (b.used_count || 0) - (a.used_count || 0))
    .slice(0, 4);
  const topSlotId = topSlots.length ? topSlots[0].id : "";
  byId("slotUsageMeta").textContent = `${map.run_count || 0} run(s) on ${map.name}`;
  byId("slotUsageMap").innerHTML = `
    <div class="slot-usage-layout">
    <svg class="slot-map" viewBox="0 0 920 650" role="img" aria-label="${map.name} defender slot usage">
      <rect x="0" y="0" width="920" height="650" rx="10" class="map-bg"></rect>
      ${(map.paths || []).map(path => `
        <polyline class="lane-shadow" points="${pathPoints(path)}"></polyline>
        <polyline class="lane-core" points="${pathPoints(path)}"></polyline>
      `).join("")}
      ${(map.slots || []).map(slot => {
        const used = slot.used_count || 0;
        const intensity = used ? Math.max(.18, used / maxUsed) : 0;
        const radius = used ? 13 + intensity * 18 : 8;
        const isTop = slot.id === topSlotId;
        return `
          <g class="slot-node ${used ? "used" : "unused"} ${isTop ? "top-slot" : ""}" style="--i:${intensity};" tabindex="0">
            <circle cx="${slot.x}" cy="${slot.y}" r="${radius}" class="slot-halo"></circle>
            ${isTop ? `<circle cx="${slot.x}" cy="${slot.y}" r="${radius + 10}" class="slot-top-ring"></circle>` : ""}
            <circle cx="${slot.x}" cy="${slot.y}" r="${Math.max(7, radius * .55)}" class="slot-dot"></circle>
            <text x="${slot.x}" y="${slot.y + 4}" class="slot-count">${used}</text>
            ${isTop ? `<text x="${slot.x}" y="${slot.y - radius - 14}" class="slot-top-label">TOP</text>` : ""}
            <title>${slot.name} (${slot.id}): ${used} use(s), ${Math.round((slot.usage_rate || 0) * 100)}% of runs, ${dominantRoleLabel(slot.roles)}</title>
          </g>
        `;
      }).join("")}
    </svg>
    <aside class="slot-rank">
      <div class="slot-rank-head">Most Used Slots</div>
      ${topSlots.length ? topSlots.map((slot, index) => `
        <div class="slot-rank-row ${index === 0 ? "top" : ""}">
          <span>${index + 1}</span>
          <div>
            <strong>${slot.name}</strong>
            <em>${slot.id} / ${dominantRoleLabel(slot.roles)}</em>
          </div>
          <b>${slot.used_count || 0}</b>
        </div>
      `).join("") : `<div class="slot-rank-empty">No slot usage yet</div>`}
      <div class="slot-legend"><span></span> Larger circle = more final placements</div>
    </aside>
    </div>
  `;
  const most = usage.most_used || {};
  byId("slotUsageInsight").textContent = most.used_count
    ? `${most.map_name} / ${most.name} (${most.id}) is the most-used final hire slot: ${most.used_count} use(s), top role ${most.top_role || "unknown"}. Metric counts final defenders present at run end.`
    : "No defender final placements captured yet. Complete runs with defenders placed to populate slot usage.";
}

function renderRecovery(data) {
  const colors = { Trust: "var(--red)", SLA: "var(--amber)", Quit: "var(--cyan)", Retry: "var(--green)" };
  const rows = data.recovery || [];
  byId("recoveryTimeline").innerHTML = rows.map(row => `
    <div class="timeline-row"><span>${row.name}</span><div class="linebar"><span style="--w:${Math.max(3, (row.rate || 0) * 100)}%;--c:${colors[row.name] || "var(--cyan)"}"></span></div><strong>${fmtPct(row.rate || 0)}</strong></div>
  `).join("");
  byId("recoveryInsight").textContent = rows.length
    ? "Failure mix is based on completed run outcomes and restart counts stored by the collector."
    : "No failure outcomes yet.";
}

function renderMiniGames(data) {
  const mini = data.mini_games || {};
  const attempts = mini.attempts || 0;
  const correct = mini.correct || mini.wins || 0;
  const fails = mini.fails || 0;
  byId("miniGameMeta").textContent = attempts ? `${attempts} quiz answers` : "no answer attempts";
  byId("miniGameSummary").innerHTML = `
    <div class="mini-stat"><span>Correct Rate</span><strong>${attempts ? fmtPct(mini.correct_rate || mini.win_rate || 0) : "N/A"}</strong></div>
    <div class="mini-stat"><span>Correct</span><strong>${fmtNumber(correct)}</strong></div>
    <div class="mini-stat"><span>Wrong</span><strong>${fmtNumber(fails)}</strong></div>
  `;
  const rows = mini.weak_questions && mini.weak_questions.length ? mini.weak_questions : (mini.by_type || []);
  if (rows.length) {
    byId("miniGameBreakdown").innerHTML = rows.map(row => `
      <div class="mini-game-row">
        <span>${row.key}</span>
        <div class="linebar"><span style="--w:${Math.max(3, (row.correct_rate || row.win_rate || 0) * 100)}%;--c:${(row.correct_rate || row.win_rate || 0) >= .7 ? "var(--green)" : "var(--amber)"}"></span></div>
        <strong>${fmtPct(row.correct_rate || row.win_rate || 0)} · ${fmtNumber(row.fails || 0)} wrong</strong>
      </div>
    `).join("");
  } else if (mini.legacy_wins_without_attempts) {
    byId("miniGameBreakdown").innerHTML = `
      <div class="command-callout">Legacy data has ${mini.legacy_wins_without_attempts} correct mini-game result(s), but old runs did not capture total answers or wrong answers. New runs will show correctness rate and weak RCX quiz topics.</div>
    `;
  } else {
    byId("miniGameBreakdown").innerHTML = `
      <div class="command-callout">No RCX quiz answer outcomes captured yet. Play waves that trigger mini-games to see correct rate and weak questions.</div>
    `;
  }
}

function renderQA(data) {
  const issues = data.qa_issues || [];
  byId("qaCount").textContent = `${issues.length} signal(s)`;
  byId("qaList").innerHTML = issues.map(issue => `
    <div class="qa-row"><div class="sev ${issue.severity}"></div><div><div class="qa-title">${issue.title}</div><div class="qa-copy">${issue.copy}</div></div><div class="tag">${issue.tag}</div></div>
  `).join("");
}

function sourceBadge(row) {
  const group = row.source_group || "other";
  const label = row.source_label || "Other";
  return `<span class="source-badge ${escapeHtml(group)}">${escapeHtml(label)}</span>`;
}

function deviceBadge(deviceType) {
  const type = deviceType || "unknown";
  const label = type === "desktop" ? "Desktop" : (type === "mobile" ? "Mobile" : (type === "tablet" ? "Tablet" : "Unknown"));
  return `<span class="device-badge ${escapeHtml(type)}">${label}</span>`;
}

function renderSourceMix(data) {
  const rows = data.source_breakdown || [];
  const total = rows.reduce((sum, row) => sum + (row.run_count || 0), 0);
  byId("sourceMixMeta").textContent = total ? `${total} completed runs` : "No completed runs";
  if (!rows.length) {
    byId("sourceMix").innerHTML = `<div class="command-callout">No source-tagged runs yet. Local runs will show as Local; Netlify or domain traffic will show as Public Web after it posts to a reachable collector.</div>`;
    return;
  }
  byId("sourceMix").innerHTML = rows.map(row => {
    const share = total ? (row.run_count || 0) / total : 0;
    const details = (row.details || []).slice(0, 3).map(detail => `${escapeHtml(detail.detail)} (${detail.run_count})`).join(", ");
    return `
      <article class="source-card ${escapeHtml(row.source_group || "other")}">
        <div class="source-card-top">
          ${sourceBadge(row)}
          <strong>${fmtPct(share)}</strong>
        </div>
        <div class="source-count">${fmtNumber(row.run_count || 0)} runs</div>
        <div class="source-bars">
          <span style="--w:${Math.max(3, share * 100)}%"></span>
        </div>
        <div class="source-detail">${details || "No detail"}</div>
        <div class="source-stats">Clear ${fmtPct(row.clear_rate || 0)} · Avg wave ${row.avg_wave || 0}</div>
      </article>
    `;
  }).join("");
}

function renderDeviceMix(data) {
  const rows = data.device_breakdown || [];
  const total = rows.reduce((sum, row) => sum + (row.run_count || 0), 0);
  byId("deviceMixMeta").textContent = total ? `${total} completed runs` : "No device data";
  if (!rows.length) {
    byId("deviceMix").innerHTML = `<div class="command-callout">No device-tagged runs yet. New telemetry will classify each run as desktop, mobile, tablet, or unknown.</div>`;
    return;
  }
  byId("deviceMix").innerHTML = rows.map(row => {
    const share = total ? (row.run_count || 0) / total : 0;
    return `
      <article class="source-card device-card ${escapeHtml(row.device_type || "unknown")}">
        <div class="source-card-top">
          ${deviceBadge(row.device_type)}
          <strong>${fmtPct(share)}</strong>
        </div>
        <div class="source-count">${fmtNumber(row.run_count || 0)} runs</div>
        <div class="source-bars">
          <span style="--w:${Math.max(3, share * 100)}%"></span>
        </div>
        <div class="source-stats">Clear ${fmtPct(row.clear_rate || 0)} · Avg wave ${row.avg_wave || 0} · Avg ${fmtDuration(row.avg_duration_ms || 0)}</div>
      </article>
    `;
  }).join("");
}

function renderCommandCenter(data) {
  const sampleSize = data.sample_size || {};
  byId("collectorStatus").innerHTML = `Connected to <code>${API}</code>. Source: <code>${data.source}</code>. Runs: <code>${sampleSize.runs || 0}</code>, checkpoints: <code>${sampleSize.checkpoints || 0}</code>.`;
  renderMission(data);
  renderSourceMix(data);
  renderDeviceMix(data);
  renderFunnel(data);
  renderHeatmap(data);
  renderSignals(data);
  renderDefenders(data);
  renderSlotUsage(data);
  renderRecovery(data);
  renderMiniGames(data);
  renderQA(data);
}

function workCategoryTotal(summary, category) {
  const row = (summary.by_category || []).find(item => item.category === category);
  return row ? row.total_duration_ms : 0;
}

function workActorTotal(summary, actor) {
  return (summary.by_lens || [])
    .filter(row => row.actor === actor && row.confidence !== "not_tracked")
    .reduce((total, row) => total + (row.total_duration_ms || 0), 0);
}

function renderWorkKpis(data) {
  const items = [
    {
      label: "Codex Total",
      value: fmtWorkDuration(workActorTotal(data, "Codex")),
      note: "Coding/build activity",
      primary: true
    },
    {
      label: "Sven Total",
      value: fmtWorkDuration(workActorTotal(data, "Sven")),
      note: "Testing + review activity",
      primary: true
    },
    {
      label: "All Tracked",
      value: fmtWorkDuration(data.total_duration_ms),
      note: "Codex + Sven tracked time"
    },
    {
      label: "Last 7 Days",
      value: fmtWorkDuration(data.last_7_days_ms),
      note: "Tracked activity window"
    },
    {
      label: "Codex Coding",
      value: fmtWorkDuration(workCategoryTotal(data, "coding")),
      note: "Code/config activity"
    },
    {
      label: "Sven Review",
      value: fmtWorkDuration(workCategoryTotal(data, "codex_review")),
      note: "Codex thread/review work"
    },
    {
      label: "Sven Testing",
      value: fmtWorkDuration(workCategoryTotal(data, "browser_test")),
      note: "Game tab visible time"
    }
  ];
  byId("workKpiGrid").innerHTML = items.map(item => `
    <div class="kpi ${item.primary ? "actor-kpi" : ""}">
      <div class="kpi-label">${item.label}</div>
      <div class="kpi-value">${item.value}</div>
      <div class="kpi-note">${item.note}</div>
    </div>
  `).join("");
  const lensRows = data.by_lens || [];
  byId("workLensGrid").innerHTML = lensRows.map(row => `
    <article class="work-lens-card ${row.confidence === "not_tracked" ? "missing" : ""}">
      <div class="lens-top">
        <span>${row.actor || "-"}</span>
        <em>${row.confidence || "-"}</em>
      </div>
      <strong>${row.activity_class || "-"}</strong>
      <div class="lens-time">${fmtWorkDuration(row.total_duration_ms || 0)}</div>
      <p>${row.evidence || "-"}</p>
    </article>
  `).join("");
}

function renderWorkRecent(rows) {
  byId("workRecentBody").innerHTML = rows.map(row => `
    <tr>
      <td>${fmtDate(row.ended_at)}</td>
      <td>${row.actor || "-"}</td>
      <td>${row.activity_class || "-"}</td>
      <td>${row.confidence || "-"}</td>
      <td>${row.title || row.activity || "-"}</td>
      <td>${row.evidence || row.source || "-"}</td>
      <td>${fmtWorkDuration(row.duration_ms)}</td>
    </tr>
  `).join("");
}

function renderGlobalQueryResult(data) {
  const answer = escapeHtml(data.answer || "No answer available.");
  const chart = data.chart && data.chart.type === "donut"
    ? renderDonutChart(data.chart)
    : (data.chart && data.chart.type === "bar" ? renderBarChart(data.chart) : "");
  const source = data.assumptions && data.assumptions.length
    ? `<div class="query-source">${escapeHtml(data.assumptions.join(" "))}</div>`
    : "";
  byId("globalQueryAnswer").innerHTML = `
    <div class="query-answer-text">${answer}</div>
    ${chart}
    ${source}
  `;
}

function renderBarChart(chart) {
  const items = (chart.items || []).filter(item => (item.count || 0) > 0);
  const max = Math.max(1, ...items.map(item => item.count || 0));
  if (!items.length) return "";
  return `
    <div class="query-bar-chart">
      ${items.map(item => `
        <div class="query-bar-row">
          <strong>${escapeHtml(item.label)}</strong>
          <div class="query-bar-track">
            <span style="--w:${Math.max(4, ((item.count || 0) / max) * 100)}%;--bar:${roleColors[item.label] || "#33c7d8"}"></span>
          </div>
          <em>${fmtNumber(item.count || 0)} / ${fmtPct(item.ratio || 0)}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDonutChart(chart) {
  const items = (chart.items || []).filter(item => (item.count || 0) > 0);
  const total = items.reduce((sum, item) => sum + (item.count || 0), 0);
  if (!total) return "";
  let cursor = 0;
  const segments = items.map(item => {
    const start = cursor;
    const end = cursor + ((item.count || 0) / total) * 100;
    cursor = end;
    const color = roleColors[item.label] || "#33c7d8";
    return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(", ");
  return `
    <div class="query-chart">
      <div class="donut" style="--segments:${segments}">
        <span>${total}</span>
      </div>
      <div class="donut-legend">
        ${items.map(item => `
          <div class="donut-row">
            <span class="donut-swatch" style="--swatch:${roleColors[item.label] || "#33c7d8"}"></span>
            <strong>${escapeHtml(item.label)}</strong>
            <em>${item.count || 0} / ${fmtPct(item.ratio || 0)}</em>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderRecent(rows) {
  byId("recentRunsBody").innerHTML = rows.map(row => `
    <tr>
      <td>${fmtDate(row.ended_at)}</td>
      <td>${row.build_version || "-"}</td>
      <td>${row.variant || "-"}</td>
      <td>${resultPill(row)}</td>
      <td>${row.map_id || "-"}</td>
      <td>${row.stage_reached || "-"}</td>
      <td>${row.wave_reached || "-"}</td>
      <td>${row.final_score || 0}</td>
      <td>${row.trust_end || 0}</td>
      <td>${row.sla_end || 0}</td>
      <td>${fmtDuration(row.duration_ms)}</td>
      <td>${deviceBadge(row.device_type)}</td>
      <td>${sourceBadge(row)}</td>
    </tr>
  `).join("");
}

function renderTop(rows) {
  byId("topRunsBody").innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${row.build_version || "-"}</td>
      <td>${row.variant || "-"}</td>
      <td>${row.final_score || 0}</td>
      <td>${row.completed_wave_count || 0}</td>
      <td>${row.trust_end || 0}</td>
      <td>${row.sla_end || 0}</td>
      <td>${fmtDuration(row.duration_ms)}</td>
    </tr>
  `).join("");
}

function renderBuildCompare(rows) {
  byId("buildCompareBody").innerHTML = rows.map(row => `
    <tr>
      <td>${row.build_version || "-"}</td>
      <td>${row.variant || "-"}</td>
      <td>${row.run_count || 0}</td>
      <td>${fmtPct(row.clear_rate)}</td>
      <td>${row.avg_wave_reached || 0}</td>
      <td>${row.avg_trust_end || 0}</td>
      <td>${row.avg_sla_end || 0}</td>
      <td>${sourceBadge(row)}</td>
    </tr>
  `).join("");
}

function renderFailByWave(rows) {
  byId("failByWaveBody").innerHTML = rows.map(row => `
    <tr>
      <td>${row.map_id || "-"}</td>
      <td>${row.stage_reached || 0}</td>
      <td>${row.wave_reached || 0}</td>
      <td>${row.run_count || 0}</td>
      <td>${row.fail_count || 0}</td>
      <td>${fmtPct(row.fail_rate)}</td>
    </tr>
  `).join("");
}

async function refreshAll() {
  const refreshButton = byId("refreshBtn");
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";
  }
  byId("collectorStatus").innerHTML = `Loading latest data from <code>${API}</code>...`;
  const results = await Promise.allSettled([
    fetchJson(withSource("/api/metrics/command-center")),
    fetchJson(withSource("/api/runs/recent?limit=50")),
    fetchJson(withSource("/api/leaderboard/top-score?limit=20")),
    fetchJson("/api/metrics/fail-by-wave"),
    fetchJson(withSource("/api/metrics/build-compare")),
    fetchJson("/api/work/summary"),
    fetchJson("/api/work/recent?limit=25")
  ]);
  const [command, recent, top, failByWave, buildCompare, workSummary, workRecent] = results;
  if (command.status === "rejected") throw command.reason;
  renderCommandCenter(command.value);
  if (workSummary.status === "fulfilled") {
    renderWorkKpis(workSummary.value);
  } else {
    byId("workKpiGrid").innerHTML = `<div class="kpi"><div class="kpi-label">Project Time</div><div class="kpi-value">Unavailable</div><div class="kpi-note">Refresh after collector sync</div></div>`;
  }
  if (workRecent.status === "fulfilled") renderWorkRecent(workRecent.value.items || []);
  if (recent.status === "fulfilled") renderRecent(recent.value.items || []);
  if (top.status === "fulfilled") renderTop(top.value.items || []);
  if (failByWave.status === "fulfilled") renderFailByWave(failByWave.value.items || []);
  if (buildCompare.status === "fulfilled") renderBuildCompare(buildCompare.value.items || []);
  byId("collectorStatus").innerHTML += ` Last refresh: <code>${new Date().toLocaleTimeString()}</code>.`;
  if (refreshButton) {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh";
  }
}

function handleRefreshError(error, message) {
  console.error(error);
  const refreshButton = byId("refreshBtn");
  if (refreshButton) {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh";
  }
  byId("collectorStatus").innerHTML = message;
}

byId("globalQueryForm").addEventListener("submit", async event => {
  event.preventDefault();
  const query = byId("globalQuery").value.trim();
  if (!query) return;
  byId("globalQueryAnswer").textContent = usesChinese(query) ? "查询中..." : "Querying...";
  try {
    const data = await fetchJson(`/api/query?q=${encodeURIComponent(query)}`);
    renderGlobalQueryResult(data);
  } catch (error) {
    console.error(error);
    byId("globalQueryAnswer").textContent = usesChinese(query) ? "查询失败，请检查 collector 状态。" : "Query failed. Check collector status.";
  }
});

byId("refreshBtn").addEventListener("click", () => {
  refreshAll().catch(error => {
    handleRefreshError(error, `Refresh failed at <code>${API}</code>. Check collector status and try again.`);
  });
});
tabButtons.forEach(button => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});
document.querySelectorAll("[data-source-filter]").forEach(button => {
  button.addEventListener("click", () => setSourceFilter(button.dataset.sourceFilter));
});
setActiveTab(localStorage.getItem(TAB_KEY) || "gameplay");
setSourceFilter(currentSourceFilter, false);

refreshAll().catch(error => {
  handleRefreshError(error, `Collector offline at <code>${API}</code>. Start the collector and refresh.`);
  byId("missionGrid").innerHTML = `<div class="command-metric critical"><div class="metric-label">Collector</div><div class="metric-value">Offline</div><div class="metric-note">No real data available</div></div>`;
  byId("workKpiGrid").innerHTML = `<div class="kpi"><div class="kpi-label">Project Time</div><div class="kpi-value">Offline</div></div>`;
  byId("workLensGrid").innerHTML = "";
  byId("globalQueryAnswer").textContent = "Collector offline. Gameplay analytics and dev-time queries are unavailable.";
});
