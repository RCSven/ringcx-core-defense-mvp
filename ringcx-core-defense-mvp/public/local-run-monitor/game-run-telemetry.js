(function () {
  const QUEUE_KEY = "ringcxCoreDefense.telemetryQueue.v1";
  const ANON_KEY = "ringcxCoreDefense.anonymousUserId.v1";
  const QUEUE_LIMIT = 200;
  const CHANNELS = new Set(["dev", "internal_test", "external_playtest", "production"]);

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function persistedId(key, prefix) {
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const next = uid(prefix);
      localStorage.setItem(key, next);
      return next;
    } catch {
      return uid(prefix);
    }
  }

  function loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  function enqueue(path, payload) {
    const queue = loadQueue();
    queue.push({ path, payload });
    saveQueue(queue.slice(-QUEUE_LIMIT));
  }

  async function postJson(collectorBaseUrl, path, payload) {
    const res = await fetch(`${collectorBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`collector ${res.status}`);
    return res.json().catch(() => ({}));
  }

  function isLocalHostname(hostname) {
    return hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname.endsWith(".localhost");
  }

  function isLanHostname(hostname) {
    return /^10\./.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  }

  function normalizeChannel(value, fallback) {
    const channel = String(value || "").trim().toLowerCase();
    return CHANNELS.has(channel) ? channel : fallback;
  }

  function dataScopeForChannel(channel) {
    if (channel === "production") return "prod";
    if (channel === "internal_test" || channel === "external_playtest") return "test";
    return "dev";
  }

  function browserFamily() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Edge";
    if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return "Chrome";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    if (/Firefox\//.test(ua)) return "Firefox";
    return "Other";
  }

  function deviceType() {
    const ua = navigator.userAgent || "";
    const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const narrowViewport = Math.min(window.innerWidth || 0, window.innerHeight || 0) < 820;
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "tablet";
    if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
    if (coarsePointer && narrowViewport) return "mobile";
    return "desktop";
  }

  function urlOrigin(value) {
    try {
      return new URL(value).origin;
    } catch {
      return "";
    }
  }

  function isAllowedCollector(value, allowedOrigins) {
    if (!value) return false;
    const origin = urlOrigin(value);
    if (!origin) return false;
    if (isLocalHostname(new URL(value).hostname)) return true;
    return (allowedOrigins || []).includes(origin);
  }

  function resolveConfig(config = {}) {
    const params = new URLSearchParams(location.search);
    const protocol = location.protocol;
    const hostname = location.hostname;
    const isFile = protocol === "file:";
    const isLocal = isFile || isLocalHostname(hostname);
    const isLan = !isLocal && isLanHostname(hostname);
    const accessSurface = isFile ? "file" : (isLocal ? "localhost" : (isLan ? "lan" : "public_url"));
    const runtimeEnvironment = isLocal ? "local" : (isLan ? "staging" : "production");
    const publicDefaultChannel = runtimeEnvironment === "production" ? "production" : "dev";
    const releaseChannel = normalizeChannel(params.get("channel"), publicDefaultChannel);
    const dataScope = dataScopeForChannel(releaseChannel);
    const telemetryParam = String(params.get("telemetry") || "").trim().toLowerCase();
    const localCollectorUrl = config.localCollectorUrl || "http://127.0.0.1:4328";
    const defaultRemoteCollectorUrl = config.remoteCollectorUrl || "";
    const collectorParam = params.get("collector") || "";
    const allowedOrigins = config.allowedCollectorOrigins || [];
    let collectorBaseUrl = "";
    let telemetryMode = "disabled";

    if (telemetryParam !== "off") {
      if (isLocal && telemetryParam !== "remote") {
        collectorBaseUrl = localCollectorUrl;
        telemetryMode = telemetryParam === "dual" ? "dual_write" : "local_only";
      }
      if (collectorParam && isAllowedCollector(collectorParam, allowedOrigins)) {
        collectorBaseUrl = collectorParam;
        telemetryMode = isLocal && telemetryParam === "dual" ? "dual_write" : "remote_only";
      } else if (!isLocal && defaultRemoteCollectorUrl && isAllowedCollector(defaultRemoteCollectorUrl, allowedOrigins)) {
        collectorBaseUrl = defaultRemoteCollectorUrl;
        telemetryMode = "remote_only";
      } else if (!isLocal) {
        telemetryMode = "disabled";
      }
    }

    const context = {
      anonymous_user_id: persistedId(ANON_KEY, "anon"),
      game_variant: config.gameVariant || (String(config.buildVersion || "").includes("-HI") ? "hi" : "std"),
      variant_version: config.variantVersion || "",
      build_version: config.buildVersion || "unknown",
      baseline_version: config.baselineVersion || "",
      deployment_id: config.deploymentId || "local",
      source_origin: location.origin || "",
      runtime_environment: runtimeEnvironment,
      access_surface: accessSurface,
      release_channel: releaseChannel,
      data_scope: dataScope,
      telemetry_mode: telemetryMode,
      share_id: params.get("share_id") || "",
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      browser_family: browserFamily(),
      device_type: deviceType(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight
    };

    return {
      collectorBaseUrl,
      telemetryMode,
      enabled: telemetryMode !== "disabled" && !!collectorBaseUrl,
      context
    };
  }

  function create(config) {
    const collectorBaseUrl = config.collectorBaseUrl || "http://127.0.0.1:4328";
    const telemetryContext = config.telemetryContext || {};
    const sessionId = uid("sess");
    let runId = null;
    let runStarted = false;
    let runEnded = false;

    async function post(path, payload) {
      return postJson(collectorBaseUrl, path, payload);
    }

    async function flushQueue() {
      const queue = loadQueue();
      if (!queue.length) return;
      const next = [];
      for (const item of queue) {
        try {
          await post(item.path, item.payload);
        } catch {
          next.push(item);
        }
      }
      saveQueue(next);
    }

    async function safePost(path, payload) {
      try {
        await post(path, payload);
      } catch {
        enqueue(path, payload);
      }
    }

    function withCommon(payload) {
      return {
        session_id: sessionId,
        schema_version: config.schemaVersion || "run.v1",
        build_version: config.buildVersion || "unknown",
        baseline_version: config.baselineVersion || "",
        variant: config.variant || "unknown",
        source_page: config.sourcePage || "",
        user_agent: navigator.userAgent,
        ...telemetryContext,
        ...payload
      };
    }

    async function startSession() {
      await safePost("/api/session/start", withCommon({
        started_at: Date.now()
      }));
    }

    async function endSession(reason) {
      await safePost("/api/session/end", withCommon({
        ended_at: Date.now(),
        end_reason: reason || "page_exit"
      }));
    }

    async function ensureRunStarted(reason, snapshot) {
      if (runStarted) return runId;
      runStarted = true;
      runEnded = false;
      runId = uid("run");
      const payload = withCommon({
        run_id: runId,
        started_at: Date.now(),
        map_id: snapshot && snapshot.map_id,
        start_reason: reason || "implicit"
      });
      await safePost("/api/run/start", payload);
      return runId;
    }

    async function checkpoint(snapshot) {
      if (!runStarted || runEnded || !snapshot) return;
      await safePost("/api/run/checkpoint", withCommon({
        run_id: runId,
        recorded_at: Date.now(),
        stage_index: snapshot.stage_index,
        wave_index: snapshot.wave_index,
        running: snapshot.running,
        trust: snapshot.trust,
        sla: snapshot.sla,
        credit: snapshot.credit,
        placements_json: snapshot.placements_json,
        role_levels_json: snapshot.role_levels_json
      }));
    }

    async function finalize(reason, snapshot) {
      if (!runStarted || runEnded || !snapshot) return;
      runEnded = true;
      await safePost("/api/run/end", withCommon({
        run_id: runId,
        started_at: snapshot.started_at,
        ended_at: Date.now(),
        duration_ms: snapshot.duration_ms,
        end_reason: reason,
        leave_type: snapshot.leave_type || reason,
        won: !!snapshot.won,
        map_id: snapshot.map_id,
        stage_reached: snapshot.stage_reached,
        wave_reached: snapshot.wave_reached,
        completed_wave_count: snapshot.completed_wave_count,
        final_score: snapshot.final_score,
        trust_end: snapshot.trust_end,
        sla_end: snapshot.sla_end,
        credit_end: snapshot.credit_end,
        defeated_risk_score: snapshot.defeated_risk_score,
        clear_bonus: snapshot.clear_bonus,
        leak_penalty: snapshot.leak_penalty,
        restart_penalty: snapshot.restart_penalty,
        mini_game_win_count: snapshot.mini_game_win_count,
        mini_game_attempt_count: snapshot.mini_game_attempt_count,
        mini_game_fail_count: snapshot.mini_game_fail_count,
        mini_game_results_json: snapshot.mini_game_results_json,
        defender_upgrade_count: snapshot.defender_upgrade_count,
        manual_restart_count: snapshot.manual_restart_count,
        total_leaks: snapshot.total_leaks,
        first_fail_stage: snapshot.first_fail_stage,
        first_fail_wave: snapshot.first_fail_wave,
        last_alive_stage: snapshot.last_alive_stage,
        last_alive_wave: snapshot.last_alive_wave,
        roles_hired_count: snapshot.roles_hired_count,
        role_levels_end_json: snapshot.role_levels_end_json,
        placements_end_json: snapshot.placements_end_json,
        wave_damage_by_role_json: snapshot.wave_damage_by_role_json
      }));
    }

    function beaconFinalize(reason, snapshot) {
      if (!runStarted || runEnded || !snapshot || !navigator.sendBeacon) return;
      runEnded = true;
      const payload = withCommon({
        run_id: runId,
        started_at: snapshot.started_at,
        ended_at: Date.now(),
        duration_ms: snapshot.duration_ms,
        end_reason: reason,
        leave_type: snapshot.leave_type || reason,
        won: !!snapshot.won,
        map_id: snapshot.map_id,
        stage_reached: snapshot.stage_reached,
        wave_reached: snapshot.wave_reached,
        completed_wave_count: snapshot.completed_wave_count,
        final_score: snapshot.final_score,
        trust_end: snapshot.trust_end,
        sla_end: snapshot.sla_end,
        credit_end: snapshot.credit_end,
        defeated_risk_score: snapshot.defeated_risk_score,
        clear_bonus: snapshot.clear_bonus,
        leak_penalty: snapshot.leak_penalty,
        restart_penalty: snapshot.restart_penalty,
        mini_game_win_count: snapshot.mini_game_win_count,
        mini_game_attempt_count: snapshot.mini_game_attempt_count,
        mini_game_fail_count: snapshot.mini_game_fail_count,
        mini_game_results_json: snapshot.mini_game_results_json,
        defender_upgrade_count: snapshot.defender_upgrade_count,
        manual_restart_count: snapshot.manual_restart_count,
        total_leaks: snapshot.total_leaks,
        first_fail_stage: snapshot.first_fail_stage,
        first_fail_wave: snapshot.first_fail_wave,
        last_alive_stage: snapshot.last_alive_stage,
        last_alive_wave: snapshot.last_alive_wave,
        roles_hired_count: snapshot.roles_hired_count,
        role_levels_end_json: snapshot.role_levels_end_json,
        placements_end_json: snapshot.placements_end_json,
        wave_damage_by_role_json: snapshot.wave_damage_by_role_json
      });
      enqueue("/api/run/beacon-end", payload);
      saveQueue(loadQueue());
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(`${collectorBaseUrl}/api/run/beacon-end`, blob);
    }

    return {
      sessionId,
      flushQueue,
      startSession,
      endSession,
      ensureRunStarted,
      checkpoint,
      finalize,
      beaconFinalize,
      isRunStarted: () => runStarted,
      isRunEnded: () => runEnded,
      currentRunId: () => runId
    };
  }

  function createWorkTracker(config) {
    const collectorBaseUrl = config.collectorBaseUrl || "http://127.0.0.1:4328";
    const telemetryContext = config.telemetryContext || {};
    const minSegmentMs = config.minSegmentMs || 10000;
    let segmentStartedAt = null;

    async function safePost(path, payload) {
      try {
        await postJson(collectorBaseUrl, path, payload);
      } catch {
        enqueue(path, payload);
      }
    }

    function startSegment() {
      if (segmentStartedAt || document.visibilityState === "hidden") return;
      segmentStartedAt = Date.now();
    }

    function stopSegment(reason) {
      if (!segmentStartedAt) return;
      const endedAt = Date.now();
      const durationMs = endedAt - segmentStartedAt;
      const startedAt = segmentStartedAt;
      segmentStartedAt = null;
      if (durationMs < minSegmentMs) return;
      safePost("/api/work/session", {
        work_session_id: uid("work"),
        category: config.category || "browser_test",
        source: config.source || "browser_activity",
        activity: config.activity || "game_visible_time",
        title: config.title || document.title || "Browser playtest",
        notes: config.notes || `Recorded from browser visibility: ${reason || "visibility_change"}.`,
        build_version: config.buildVersion || "",
        source_page: config.sourcePage || location.pathname,
        ...telemetryContext,
        started_at: startedAt,
        ended_at: endedAt,
        duration_ms: durationMs
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        stopSegment("tab_hidden");
      } else {
        startSegment();
      }
    });
    window.addEventListener("pagehide", () => stopSegment("pagehide"));
    startSegment();

    return {
      stop: stopSegment,
      isTracking: () => !!segmentStartedAt
    };
  }

  window.RC_LOCAL_RUN_TELEMETRY = { create, createWorkTracker, resolveConfig };
})();
