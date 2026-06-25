const { getDeployStore, getStore } = require("@netlify/blobs");

const DAY_MS = 24 * 60 * 60 * 1000;
const STORE_NAME = "ringcx-core-defense-telemetry";
const DEFAULT_ALLOWED_ORIGINS = ["*"];

function nowMs() {
  return Date.now();
}

function text(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const next = String(value).trim();
  return next || fallback;
}

function intValue(value, fallback = 0) {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : fallback;
}

function boolValue(value) {
  return value ? 1 : 0;
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function bodyJson(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return safeJson(raw, {});
}

function allowedOrigins() {
  const configured = text(process.env.RC_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS, "");
  return configured
    ? configured.split(",").map(origin => origin.trim().replace(/\/$/, "")).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
}

function requestOrigin(event) {
  return text(event.headers.origin || event.headers.Origin, "").replace(/\/$/, "");
}

function corsHeaders(event) {
  const allowed = allowedOrigins();
  const origin = requestOrigin(event);
  const allowOrigin = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function response(event, statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(event)
    },
    body: JSON.stringify(payload)
  };
}

function isOriginAllowed(event) {
  const origin = requestOrigin(event);
  const allowed = allowedOrigins();
  return allowed.includes("*") || (!!origin && allowed.includes(origin));
}

function apiPath(event) {
  const raw = event.path || "/";
  const marker = "/.netlify/functions/telemetry";
  const index = raw.indexOf(marker);
  if (index >= 0) return raw.slice(index + marker.length) || "/";
  return raw.replace(/^\/api\/telemetry/, "") || "/";
}

let cachedStore;

function blobOptions() {
  const siteID = text(
    process.env.RC_BLOBS_SITE_ID ||
    process.env.NETLIFY_BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID,
    ""
  );
  const token = text(
    process.env.RC_BLOBS_TOKEN ||
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN,
    ""
  );
  return siteID && token ? { siteID, token } : null;
}

function storageStatus() {
  const options = blobOptions();
  return {
    mode: options ? "site" : "netlify-runtime",
    has_site_id: !!(options && options.siteID),
    has_token: !!(options && options.token)
  };
}

function store() {
  if (cachedStore) return cachedStore;
  const options = blobOptions();
  if (options) {
    cachedStore = getStore(STORE_NAME, options);
    return cachedStore;
  }
  try {
    cachedStore = getStore(STORE_NAME);
  } catch {
    cachedStore = getDeployStore(STORE_NAME, { deployID: text(process.env.DEPLOY_ID || process.env.NETLIFY_DEPLOY_ID, "") });
  }
  return cachedStore;
}

async function getJson(key, fallback = null) {
  try {
    const value = await store().get(key, { type: "json" });
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

async function putJson(key, value) {
  if (store().setJSON) {
    await store().setJSON(key, value);
  } else {
    await store().set(key, JSON.stringify(value));
  }
}

async function listKeys(prefix, limit = 5000) {
  const keys = [];
  let cursor;
  do {
    const page = await store().list({ prefix, cursor });
    for (const item of page.blobs || []) {
      keys.push(item.key);
      if (keys.length >= limit) return keys;
    }
    cursor = page.cursor;
  } while (cursor);
  return keys;
}

async function listJson(prefix, limit = 5000) {
  const keys = await listKeys(prefix, limit);
  const values = [];
  for (const key of keys) {
    const item = await getJson(key, null);
    if (item) values.push(item);
  }
  return values;
}

function common(payload) {
  return {
    anonymous_user_id: text(payload.anonymous_user_id, null),
    deployment_id: text(payload.deployment_id, null),
    source_origin: text(payload.source_origin, null),
    runtime_environment: text(payload.runtime_environment, null),
    access_surface: text(payload.access_surface, null),
    release_channel: text(payload.release_channel, null),
    data_scope: text(payload.data_scope, null),
    telemetry_mode: text(payload.telemetry_mode, null),
    share_id: text(payload.share_id, null),
    browser_family: text(payload.browser_family, null),
    device_type: normalizeDeviceType(payload),
    viewport_width: nullableInt(payload.viewport_width),
    viewport_height: nullableInt(payload.viewport_height),
    ingestion_source: text(payload.ingestion_source, "netlify_blobs")
  };
}

function nullableInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : null;
}

function normalizeDeviceType(payload) {
  const existing = text(payload.device_type, "");
  if (["desktop", "mobile", "tablet"].includes(existing)) return existing;
  const ua = text(payload.user_agent, "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/iphone|ipod|windows phone|mobi/.test(ua)) return "mobile";
  if (/android/.test(ua)) return /mobile/.test(ua) ? "mobile" : "tablet";
  if (/macintosh|windows nt|x11|linux x86_64/.test(ua)) return "desktop";
  const width = nullableInt(payload.viewport_width);
  const height = nullableInt(payload.viewport_height);
  const shortest = Math.min(width || 99999, height || 99999);
  if (shortest < 820) return "mobile";
  if ((width || 0) >= 900) return "desktop";
  return "unknown";
}

async function sessionStart(event) {
  const payload = bodyJson(event);
  const session = {
    ...common(payload),
    session_id: text(payload.session_id),
    schema_version: text(payload.schema_version, "run.v1"),
    build_version: text(payload.build_version, "unknown"),
    baseline_version: text(payload.baseline_version, ""),
    variant: text(payload.variant, "unknown"),
    source_page: text(payload.source_page, ""),
    user_agent: text(payload.user_agent, ""),
    started_at: intValue(payload.started_at, nowMs()),
    ended_at: nullableInt(payload.ended_at),
    end_reason: text(payload.end_reason, "")
  };
  await putJson(`sessions/${session.session_id}.json`, session);
  return response(event, 200, { ok: true });
}

async function sessionEnd(event) {
  const payload = bodyJson(event);
  const key = `sessions/${text(payload.session_id)}.json`;
  const existing = await getJson(key, {});
  await putJson(key, {
    ...existing,
    ...common({ ...existing, ...payload }),
    ended_at: intValue(payload.ended_at, nowMs()),
    end_reason: text(payload.end_reason, "page_exit")
  });
  return response(event, 200, { ok: true });
}

async function runStart(event) {
  const payload = bodyJson(event);
  const run = {
    ...common(payload),
    run_id: text(payload.run_id),
    session_id: text(payload.session_id),
    schema_version: text(payload.schema_version, "run.v1"),
    build_version: text(payload.build_version, "unknown"),
    baseline_version: text(payload.baseline_version, ""),
    variant: text(payload.variant, "unknown"),
    source_page: text(payload.source_page, ""),
    user_agent: text(payload.user_agent, ""),
    started_at: intValue(payload.started_at, nowMs()),
    start_reason: text(payload.start_reason, "implicit"),
    map_id: text(payload.map_id, "sRoute")
  };
  await putJson(`runs/${run.run_id}.json`, run);
  return response(event, 200, { ok: true });
}

async function checkpoint(event) {
  const payload = bodyJson(event);
  const runId = text(payload.run_id);
  const recordedAt = intValue(payload.recorded_at, nowMs());
  await putJson(`checkpoints/${runId}/${recordedAt}-${Math.random().toString(36).slice(2)}.json`, {
    run_id: runId,
    session_id: text(payload.session_id),
    recorded_at: recordedAt,
    stage_index: intValue(payload.stage_index),
    wave_index: intValue(payload.wave_index),
    running: boolValue(payload.running),
    trust: intValue(payload.trust),
    sla: intValue(payload.sla),
    credit: intValue(payload.credit),
    placements_json: payload.placements_json || null,
    role_levels_json: payload.role_levels_json || null,
    build_version: text(payload.build_version),
    source_origin: text(payload.source_origin),
    access_surface: text(payload.access_surface)
  });
  return response(event, 200, { ok: true });
}

async function runEnd(event) {
  const payload = bodyJson(event);
  const key = `runs/${text(payload.run_id)}.json`;
  const existing = await getJson(key, {});
  const run = {
    ...existing,
    ...common({ ...existing, ...payload }),
    run_id: text(payload.run_id),
    session_id: text(payload.session_id, existing.session_id || `orphan-${text(payload.run_id)}`),
    schema_version: text(payload.schema_version, existing.schema_version || "run.v1"),
    build_version: text(payload.build_version, existing.build_version || "unknown"),
    baseline_version: text(payload.baseline_version, existing.baseline_version || ""),
    variant: text(payload.variant, existing.variant || "unknown"),
    source_page: text(payload.source_page, existing.source_page || ""),
    user_agent: text(payload.user_agent, existing.user_agent || ""),
    started_at: intValue(payload.started_at, existing.started_at || nowMs()),
    ended_at: intValue(payload.ended_at, nowMs()),
    duration_ms: intValue(payload.duration_ms),
    end_reason: text(payload.end_reason, "unknown"),
    won: boolValue(payload.won),
    map_id: text(payload.map_id, existing.map_id || "sRoute"),
    stage_reached: intValue(payload.stage_reached),
    wave_reached: intValue(payload.wave_reached),
    completed_wave_count: intValue(payload.completed_wave_count),
    final_score: intValue(payload.final_score),
    trust_end: intValue(payload.trust_end),
    sla_end: intValue(payload.sla_end),
    credit_end: intValue(payload.credit_end),
    defeated_risk_score: intValue(payload.defeated_risk_score),
    clear_bonus: intValue(payload.clear_bonus),
    leak_penalty: intValue(payload.leak_penalty),
    restart_penalty: intValue(payload.restart_penalty),
    mini_game_win_count: intValue(payload.mini_game_win_count),
    mini_game_attempt_count: intValue(payload.mini_game_attempt_count),
    mini_game_fail_count: intValue(payload.mini_game_fail_count),
    mini_game_results_json: payload.mini_game_results_json || null,
    defender_upgrade_count: intValue(payload.defender_upgrade_count),
    manual_restart_count: intValue(payload.manual_restart_count),
    total_leaks: intValue(payload.total_leaks),
    first_fail_stage: nullableInt(payload.first_fail_stage),
    first_fail_wave: nullableInt(payload.first_fail_wave),
    last_alive_stage: nullableInt(payload.last_alive_stage),
    last_alive_wave: nullableInt(payload.last_alive_wave),
    roles_hired_count: intValue(payload.roles_hired_count),
    role_levels_end_json: payload.role_levels_end_json || null,
    placements_end_json: payload.placements_end_json || null,
    wave_damage_by_role_json: payload.wave_damage_by_role_json || null
  };
  await putJson(key, run);
  return response(event, 200, { ok: true });
}

function sourceGroup(run) {
  if (run.access_surface === "public_url") return ["public_web", "Public Web"];
  if (run.access_surface === "localhost" || run.access_surface === "file") return ["local", "Local"];
  if (run.access_surface === "lan") return ["lan", "LAN"];
  if (run.release_channel === "external_playtest") return ["external_playtest", "External Playtest"];
  if (run.ingestion_source === "share_import") return ["external_share", "External Share"];
  return ["other", "Other"];
}

function sourceMatches(run, filter) {
  const [group] = sourceGroup(run);
  return !filter || filter === "all" || group === filter;
}

function avg(rows, key) {
  const values = rows.map(row => Number(row[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function miniGameMetrics(runs) {
  let attempts = 0;
  let correct = 0;
  let fails = 0;
  let legacy = 0;
  const questions = new Map();
  for (const run of runs) {
    const runAttempts = intValue(run.mini_game_attempt_count);
    const runWins = intValue(run.mini_game_win_count);
    const runFails = intValue(run.mini_game_fail_count);
    if (runAttempts) {
      attempts += runAttempts;
      correct += Math.min(runWins, runAttempts);
      fails += runFails || Math.max(0, runAttempts - runWins);
    } else if (runWins) {
      legacy += runWins;
    }
    const results = safeJson(run.mini_game_results_json, []);
    for (const item of Array.isArray(results) ? results : []) {
      const key = text(item.prompt || item.question || item.type || item.id, "Unknown RCX quiz");
      const row = questions.get(key) || { key, attempts: 0, correct: 0, fails: 0 };
      row.attempts += 1;
      if (item.correct || item.won) row.correct += 1;
      else row.fails += 1;
      questions.set(key, row);
    }
  }
  const weak = [...questions.values()].map(row => ({
    ...row,
    correct_rate: row.attempts ? row.correct / row.attempts : 0,
    win_rate: row.attempts ? row.correct / row.attempts : 0
  })).sort((a, b) => a.correct_rate - b.correct_rate || b.fails - a.fails);
  return {
    attempts,
    correct,
    wins: correct,
    fails,
    correct_rate: attempts ? correct / attempts : 0,
    win_rate: attempts ? correct / attempts : 0,
    legacy_wins_without_attempts: legacy,
    by_type: weak.slice(0, 8),
    weak_questions: weak.filter(row => row.fails).slice(0, 5)
  };
}

function sourceBreakdown(runs) {
  const groups = new Map();
  for (const run of runs) {
    const [group, label] = sourceGroup(run);
    const detail = run.source_origin || run.deployment_id || "unknown";
    const row = groups.get(group) || { source_group: group, source_label: label, run_count: 0, wins: 0, wave_total: 0, details: new Map() };
    row.run_count += 1;
    row.wins += run.won ? 1 : 0;
    row.wave_total += intValue(run.completed_wave_count || run.wave_reached);
    row.details.set(detail, (row.details.get(detail) || 0) + 1);
    groups.set(group, row);
  }
  return [...groups.values()].map(row => ({
    source_group: row.source_group,
    source_label: row.source_label,
    run_count: row.run_count,
    clear_rate: row.run_count ? row.wins / row.run_count : 0,
    avg_wave: row.run_count ? Math.round((row.wave_total / row.run_count) * 10) / 10 : 0,
    details: [...row.details.entries()].map(([detail, run_count]) => ({ detail, run_count }))
  })).sort((a, b) => b.run_count - a.run_count);
}

function deviceBreakdown(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = run.device_type || "unknown";
    const row = groups.get(key) || { device_type: key, run_count: 0, wins: 0, wave_total: 0, duration_total: 0 };
    row.run_count += 1;
    row.wins += run.won ? 1 : 0;
    row.wave_total += intValue(run.completed_wave_count || run.wave_reached);
    row.duration_total += intValue(run.duration_ms);
    groups.set(key, row);
  }
  return [...groups.values()].map(row => ({
    device_type: row.device_type,
    run_count: row.run_count,
    clear_rate: row.run_count ? row.wins / row.run_count : 0,
    avg_wave: row.run_count ? Math.round((row.wave_total / row.run_count) * 10) / 10 : 0,
    avg_duration_ms: row.run_count ? Math.round(row.duration_total / row.run_count) : 0
  })).sort((a, b) => b.run_count - a.run_count);
}

function buildCompare(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.build_version || "unknown"}|${run.variant || "unknown"}`;
    const row = groups.get(key) || { build: run.build_version || "unknown", variant: run.variant || "unknown", runs: 0, wins: 0, wave: 0, trust: 0, sla: 0 };
    row.runs += 1;
    row.wins += run.won ? 1 : 0;
    row.wave += intValue(run.completed_wave_count || run.wave_reached);
    row.trust += intValue(run.trust_end);
    row.sla += intValue(run.sla_end);
    groups.set(key, row);
  }
  return [...groups.values()].map(row => ({
    build_version: row.build,
    variant: row.variant,
    run_count: row.runs,
    clear_rate: row.runs ? row.wins / row.runs : 0,
    avg_wave: row.runs ? Math.round((row.wave / row.runs) * 10) / 10 : 0,
    avg_trust: row.runs ? Math.round(row.trust / row.runs) : 0,
    avg_sla: row.runs ? Math.round(row.sla / row.runs) : 0,
    source_group: "netlify_blobs",
    source_label: "Netlify"
  })).sort((a, b) => b.run_count - a.run_count).slice(0, 20);
}

async function commandCenter(event) {
  const filter = text(event.queryStringParameters && event.queryStringParameters.source, "all");
  const allRuns = (await listJson("runs/", 5000)).filter(run => run.ended_at);
  const runs = allRuns.filter(run => sourceMatches(run, filter));
  const checkpoints = await listKeys("checkpoints/", 5000);
  const now = nowMs();
  const mini = miniGameMetrics(runs);
  const totalDuration = runs.reduce((sum, run) => sum + intValue(run.duration_ms), 0);
  const wins = runs.filter(run => run.won).length;
  const recent = runs
    .slice()
    .sort((a, b) => intValue(b.ended_at) - intValue(a.ended_at))
    .slice(0, 25)
    .map(run => ({
      ...run,
      source_group: sourceGroup(run)[0],
      source_label: sourceGroup(run)[1]
    }));
  const activeSessions = new Set(
    runs.filter(run => intValue(run.ended_at) >= now - DAY_MS).map(run => run.session_id).filter(Boolean)
  ).size;
  return response(event, 200, {
    source: "netlify_blobs",
    source_filter: filter,
    generated_at: now,
    sample_size: { runs: runs.length, checkpoints: checkpoints.length },
    mission: {
      run_capture: runs.length,
      active_sessions_24h: activeSessions,
      active_runs_24h: runs.filter(run => intValue(run.ended_at) >= now - DAY_MS).length,
      unique_sessions: new Set(runs.map(run => run.session_id).filter(Boolean)).size,
      total_run_duration_ms: totalDuration,
      total_run_duration_7d_ms: runs.filter(run => intValue(run.ended_at) >= now - 7 * DAY_MS).reduce((sum, run) => sum + intValue(run.duration_ms), 0),
      avg_run_duration_ms: runs.length ? Math.round(totalDuration / runs.length) : 0,
      audience_metric_scope: "anonymous_session",
      active_window_ms: DAY_MS,
      clear_rate: runs.length ? wins / runs.length : 0,
      avg_wave: avg(runs, "completed_wave_count"),
      avg_duration_ms: avg(runs, "duration_ms"),
      avg_trust: avg(runs, "trust_end"),
      avg_sla: avg(runs, "sla_end"),
      total_leaks: runs.reduce((sum, run) => sum + intValue(run.total_leaks), 0),
      total_upgrades: runs.reduce((sum, run) => sum + intValue(run.defender_upgrade_count), 0),
      mini_game_attempts: mini.attempts,
      mini_game_wins: mini.correct,
      mini_game_fails: mini.fails,
      legacy_mini_game_wins: mini.legacy_wins_without_attempts,
      max_completed_wave: Math.max(0, ...runs.map(run => intValue(run.completed_wave_count || run.wave_reached))),
      spike: { map_id: "-", wave: 0, fail_rate: 0, run_count: 0, fail_count: 0 }
    },
    funnel: [
      { name: "Run started", value: runs.length, rate: runs.length ? 1 : 0 },
      { name: "Wave 3+", value: runs.filter(run => intValue(run.completed_wave_count || run.wave_reached) >= 3).length, rate: runs.length ? runs.filter(run => intValue(run.completed_wave_count || run.wave_reached) >= 3).length / runs.length : 0 },
      { name: "Wave 7+", value: runs.filter(run => intValue(run.completed_wave_count || run.wave_reached) >= 7).length, rate: runs.length ? runs.filter(run => intValue(run.completed_wave_count || run.wave_reached) >= 7).length / runs.length : 0 },
      { name: "Cleared", value: wins, rate: runs.length ? wins / runs.length : 0 }
    ],
    wave_rows: [],
    defenders: [],
    slot_usage: { maps: [], active_map_id: "", most_used: {}, metric: "not_available_in_netlify_mvp" },
    mini_games: mini,
    recovery: [],
    qa_issues: runs.length ? [{ severity: "ok", title: "Netlify collector receiving runs", copy: "Telemetry is stored in Netlify Blobs.", tag: "OK" }] : [{ severity: "warn", title: "No public runs yet", copy: "Play a run on the remote site to populate Netlify telemetry.", tag: "DATA" }],
    recent_runs: recent,
    build_compare: buildCompare(runs),
    source_breakdown: sourceBreakdown(allRuns),
    device_breakdown: deviceBreakdown(runs)
  });
}

async function recent(event) {
  const filter = text(event.queryStringParameters && event.queryStringParameters.source, "all");
  const limit = Math.min(100, Math.max(1, intValue(event.queryStringParameters && event.queryStringParameters.limit, 50)));
  const runs = (await listJson("runs/", 5000))
    .filter(run => run.ended_at && sourceMatches(run, filter))
    .sort((a, b) => intValue(b.ended_at) - intValue(a.ended_at))
    .slice(0, limit)
    .map(run => ({ ...run, source_group: sourceGroup(run)[0], source_label: sourceGroup(run)[1] }));
  return response(event, 200, { items: runs, runs });
}

async function leaderboard(event) {
  const filter = text(event.queryStringParameters && event.queryStringParameters.source, "all");
  const limit = Math.min(100, Math.max(1, intValue(event.queryStringParameters && event.queryStringParameters.limit, 20)));
  const rows = (await listJson("runs/", 5000))
    .filter(run => run.ended_at && sourceMatches(run, filter))
    .sort((a, b) => intValue(b.final_score) - intValue(a.final_score))
    .slice(0, limit);
  return response(event, 200, { rows });
}

exports.handler = async event => {
  const path = apiPath(event);
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(event), body: "" };
    if (event.httpMethod === "POST" && !isOriginAllowed(event)) {
      return response(event, 403, { ok: false, error: "Origin not allowed" });
    }
    if (path === "/" || path === "/api/health") {
      return response(event, 200, {
        ok: true,
        service: "ringcx-defense-netlify-collector",
        storage: storageStatus()
      });
    }
    if (event.httpMethod === "POST" && path === "/api/session/start") return sessionStart(event);
    if (event.httpMethod === "POST" && path === "/api/session/end") return sessionEnd(event);
    if (event.httpMethod === "POST" && path === "/api/run/start") return runStart(event);
    if (event.httpMethod === "POST" && path === "/api/run/checkpoint") return checkpoint(event);
    if (event.httpMethod === "POST" && (path === "/api/run/end" || path === "/api/run/beacon-end")) return runEnd(event);
    if (event.httpMethod === "GET" && path === "/api/metrics/command-center") return commandCenter(event);
    if (event.httpMethod === "GET" && path === "/api/runs/recent") return recent(event);
    if (event.httpMethod === "GET" && path === "/api/leaderboard/top-score") return leaderboard(event);
    if (event.httpMethod === "GET" && path === "/api/metrics/build-compare") {
      const runs = (await listJson("runs/", 5000)).filter(run => run.ended_at);
      return response(event, 200, { rows: buildCompare(runs) });
    }
    if (event.httpMethod === "GET" && path === "/api/metrics/fail-by-wave") return response(event, 200, { rows: [] });
    return response(event, 404, { ok: false, error: "Not found", path });
  } catch (error) {
    return response(event, 500, { ok: false, error: error && error.message ? error.message : "Netlify collector error" });
  }
};
