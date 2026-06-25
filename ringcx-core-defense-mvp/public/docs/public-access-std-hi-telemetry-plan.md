# STD / HI Public Access and Telemetry Plan

## 1. 背景与问题

RingCX Core Defense 需要同时支持 STD 和 HI 两个版本的外网访问。这个能力不能只做成两个可打开的静态链接，因为本地开发、内部测试、外部测试、正式公网都会持续产生数据。如果这些数据没有统一分层，最终 dashboard 会出现三类问题：

- STD / HI 数据混在一起，无法判断 HI 视觉升级是否带来体验提升。
- 本地开发和测试数据污染 production KPI。
- 测试分享链接无法按测试轮次、渠道、版本回溯。

因此，本功能应定义为：

> Public Access Mode for STD and HI with Environment-Aware Telemetry.

核心目标是：STD 和 HI 都可以外网访问，同时所有数据都能按 variant、environment、release channel、build version、deployment 和 share campaign 被 dashboard 正确拆分。

## 2. 当前入口评估

| 类型 | 当前候选入口 | 结论 |
|---|---|---|
| STD | `ringcx-core-defense-mvp/index.html` | 当前主入口，版本为 `0.Y26.0620-STD.034`，应作为 STD 外网入口基础 |
| STD review | `ringcx-core-defense-review-0.Y26.0620-STD.034.html` | 历史 review artifact，不建议作为长期公网入口 |
| HI | `hi/index.html` | 最新 HI 候选，版本为 `0.Y26.0625-HI1.070`，需要提升为固定 HI 入口 |
| HI demos | `high-*.html` | 动画/视觉 demo，不是完整游戏入口 |
| Local monitor | `local-run-monitor/index.html` | 继续用于本地/内部 dashboard，不作为玩家入口 |

推荐将入口稳定化为：

| 公网路径 | 本地文件来源 | Variant |
|---|---|---|
| `/std/` | 基于 `index.html` | `std` |
| `/hi/` | 基于 `hi/index.html` | `hi` |

短期可以通过复制或生成入口目录实现，长期应抽象共享 shell/config，避免 STD/HI 两份大 HTML 长期漂移。

## 3. 目标与成功指标

| 目标 | 成功指标 | 默认 dashboard 口径 |
|---|---|---|
| STD 外网可玩 | STD `Load Success Rate >= 95%` | `game_variant=std` |
| HI 外网可玩 | HI `Load Success Rate >= 95%` | `game_variant=hi` |
| 本地和公网数据可拆分 | 100% 事件包含 `runtime_environment` 和 `data_scope` | 全量数据质量检查 |
| STD / HI 可比较 | 100% 事件包含 `game_variant` 和 `variant_version` | STD vs HI Compare |
| 测试和正式不混淆 | Production dashboard 默认只看 `data_scope=prod` | Production Overview |
| 分享效果可归因 | 带 `share_id` 或 `utm_*` 的 session 可查询 | Share Campaign dashboard |

## 4. 用户画像与场景

| 用户 | 场景 | 需要的数据能力 |
|---|---|---|
| PM | 分享 STD 给普通试玩用户 | 看 activation、completion、fail wave |
| PM / Designer | 分享 HI 给视觉评审或外部试玩用户 | 看 HI 是否提高 engagement，同时检查性能代价 |
| Developer | 本地持续开发 STD/HI | 本地数据可看，但默认不进入 production KPI |
| QA | 使用测试链接验证 build | 按 `release_channel=internal_test` 和 `build_version` 查询 |
| 外部测试用户 | 打开公网链接试玩 | 无需本地 server，collector 不可用时不影响游戏 |

## 5. 功能范围

### P0

| 功能 | 说明 |
|---|---|
| STD public entry | 提供稳定 `/std/` 入口 |
| HI public entry | 提供稳定 `/hi/` 入口 |
| Variant-aware telemetry context | 所有事件包含 `game_variant`、`variant_version` |
| Runtime-aware telemetry mode | 支持 `local_only`、`remote_only`、`dual_write`、`disabled` |
| Public collector fallback | 公网访问时不默认请求 `127.0.0.1` |
| URL attribution parser | 支持 `channel`、`share_id`、`utm_source`、`utm_medium`、`utm_campaign` |
| Dashboard filters | 支持按 `game_variant`、`release_channel`、`data_scope`、`build_version` 过滤 |

### P1

| 功能 | 说明 |
|---|---|
| Remote telemetry collector | HTTPS API、CORS origin allowlist、schema validation |
| STD vs HI dashboard | 对比 activation、run completion、wave fail、performance |
| HI performance telemetry | 加载时间、asset failure、FPS stability、error rate |
| Build compare | 按 `build_version`、`deployment_id` 比较 |

### P2

| 功能 | 说明 |
|---|---|
| A/B routing | `variant=auto` 或服务端分流 |
| Versioned leaderboard | STD/HI 分版本 leaderboard |
| Experiment framework | `experiment_id`、`variant_assignment`、exposure event |

## 6. URL 规则

推荐使用 path-based variant，加 query 参数表示 channel 和 attribution。

| URL | 行为 |
|---|---|
| `https://game.example.com/std/` | STD production public |
| `https://game.example.com/hi/` | HI production public |
| `https://game.example.com/std/?channel=internal_test&share_id=qa-std-1` | STD 内部测试 |
| `https://game.example.com/hi/?channel=external_playtest&share_id=hi-round-1` | HI 外部测试 |
| `http://localhost:8000/ringcx-core-defense-mvp/std/` | STD 本地开发 |
| `http://localhost:8000/ringcx-core-defense-mvp/hi/` | HI 本地开发 |
| `...?telemetry=off` | 禁用 telemetry |
| `...?telemetry=remote` | 本地或测试显式写入 remote test sink |

不建议使用完整 URL 作为 attribution 字段。客户端只应提取允许的 query key，避免把敏感参数写入 telemetry。

## 7. Telemetry Mode Resolver

客户端需要在初始化时解析出统一 context。

| 条件 | `runtime_environment` | `release_channel` | `data_scope` | `telemetry_mode` |
|---|---|---|---|---|
| `file://` | `local` | `dev` | `dev` | `disabled` |
| `localhost` / `127.0.0.1` | `local` | `dev` | `dev` | `local_only` |
| localhost + `telemetry=remote` | `local` | `dev` | `dev` | `dual_write` or `remote_only` |
| public + `channel=internal_test` | `staging` | `internal_test` | `test` | `remote_only` |
| public + `channel=external_playtest` | `staging` | `external_playtest` | `test` | `remote_only` |
| public, no channel | `production` | `production` | `prod` | `remote_only` |
| any + `telemetry=off` | detected | detected | detected | `disabled` |

`collector` query 参数不应允许任意 endpoint。P0 可先不启用公网 remote collector；P1 必须使用 allowlist。

## 8. 公共事件字段

所有事件都必须包含以下字段：

| 字段 | 示例 | 说明 |
|---|---|---|
| `schema_version` | `telemetry.v1` | 事件 schema 版本 |
| `event_id` | UUID-like string | 去重 |
| `event_name` | `run_started` | snake_case |
| `timestamp_client` | epoch ms | 客户端时间 |
| `anonymous_user_id` | generated id | localStorage 匿名 ID |
| `session_id` | generated id | 页面 session |
| `run_id` | generated id | 一局游戏 |
| `game_variant` | `std`, `hi` | STD/HI |
| `variant_version` | `STD.034`, `HI1.070` | variant 内部版本 |
| `build_version` | `0.Y26.0625-HI1.070` | 完整 build |
| `baseline_version` | `0.Y26.0620-STD.029` | HI 对应 STD baseline |
| `deployment_id` | `deploy-20260621-001` | 部署批次 |
| `runtime_environment` | `local`, `staging`, `production` | 运行环境 |
| `access_surface` | `file`, `localhost`, `public_url` | 访问方式 |
| `release_channel` | `dev`, `internal_test`, `external_playtest`, `production` | 发布渠道 |
| `data_scope` | `dev`, `test`, `prod` | dashboard 默认过滤 |
| `telemetry_mode` | `local_only`, `remote_only`, `dual_write`, `disabled` | 写入模式 |
| `share_id` | `hi-round-1` | 分享归因 |
| `utm_source` | `slack` | 渠道 |
| `utm_medium` | `chat` | 媒介 |
| `utm_campaign` | `hi-playtest` | campaign |
| `viewport_width` | `1440` | 设备分析 |
| `viewport_height` | `900` | 设备分析 |
| `user_agent_family` | `Chrome` | 粗粒度浏览器，不采集完整敏感 UA 到 dashboard 主表 |

## 9. P0 Event Catalog

| Event | Trigger | Required gameplay fields | 用途 |
|---|---|---|---|
| `game_load_started` | telemetry 初始化时 | none | 计算 load funnel |
| `game_loaded` | 首屏可交互 | `load_duration_ms` | load success |
| `session_started` | 页面进入可玩状态 | none | session 统计 |
| `session_ended` | `pagehide` 或 idle timeout | `duration_ms`, `end_reason` | session length |
| `run_started` | 新 run 开始 | `map_id`, `starting_credit` | activation |
| `run_ended` | win/fail/restart/exit | `won`, `wave_reached`, `trust_end`, `sla_end`, `final_score` | completion |
| `wave_started` | wave 开始 | `wave_index`, `map_id` | wave funnel |
| `wave_completed` | wave 成功结束 | `wave_index`, `leaks`, `trust_end`, `sla_end` | balance |
| `wave_failed` | run 在 wave 失败 | `wave_index`, `fail_reason` | difficulty spike |
| `defender_placed` | defender 放置 | `role`, `slot_id`, `credit_balance` | strategy |
| `defender_upgraded` | defender 升级 | `role`, `level_before`, `level_after`, `cost` | upgrade adoption |
| `mini_game_started` | incident 出现 | `mini_game_type`, `wave_index` | incident funnel |
| `mini_game_completed` | incident 结束 | `result`, `duration_ms`, `bonus_type` | incident tuning |
| `error_occurred` | JS error / unhandled rejection | `error_type`, `source` | quality |

HI 还需要 P1 性能事件：

| Event | Trigger | Required fields |
|---|---|---|
| `asset_load_failed` | image load error | `asset_type`, `asset_path_hash`, `game_variant` |
| `performance_sampled` | sampled interval | `fps_bucket`, `frame_drop_bucket`, `memory_bucket` |

## 10. Dashboard 设计

| Dashboard | 默认过滤 | 必备视图 |
|---|---|---|
| Production Overview | `data_scope=prod` | load success、activation、run completion、error rate |
| STD Health | `game_variant=std` | run funnel、wave fail、defender usage |
| HI Health | `game_variant=hi` | load time、asset failure、FPS、run funnel |
| STD vs HI Compare | `game_variant in (std, hi)` | activation delta、completion delta、performance delta |
| External Playtest | `release_channel=external_playtest` | share_id/campaign conversion、feedback target |
| Internal QA | `release_channel=internal_test` | build validation、error and fail spike |
| Local Dev | `runtime_environment=local` | local run history、regression signal |
| Data Quality | all | missing fields、duplicate event_id、invalid channel、collector failure |

Production dashboard 必须默认排除 `data_scope != prod`。测试数据可切换查看，但不能默认混入正式 KPI。

## 11. 关键指标

| Metric | Definition | Formula | 默认切分 |
|---|---|---|---|
| Load Success Rate | 页面成功可玩的比例 | `game_loaded / game_load_started` | `game_variant`, `release_channel` |
| First Run Start Rate | 打开后开始第一局的比例 | `users(run_started) / users(game_loaded)` | `game_variant`, `share_id` |
| Run Completion Rate | run 有明确结束的比例 | `run_ended / run_started` | `game_variant`, `build_version` |
| Wave Fail Rate | 每波失败率 | `wave_failed / wave_started` | `wave_index`, `map_id`, `game_variant` |
| Defender Usage Rate | defender 选择占比 | `defender_placed by role / all defender_placed` | `role`, `game_variant` |
| Mini-game Win Rate | 小游戏成功率 | `mini_game_completed(result=win) / mini_game_started` | `mini_game_type`, `game_variant` |
| Error Rate | 发生错误的 session 占比 | `sessions(error_occurred) / sessions(session_started)` | `game_variant`, `browser` |
| HI Asset Failure Rate | HI 资源失败率 | `asset_load_failed / asset_load_started` | `asset_type`, `build_version` |
| FPS Stability | 稳定帧率比例 | `samples >= target_fps / all samples` | `game_variant`, `device_type` |
| Share Conversion | 分享链接开始游玩比例 | `run_started / game_loaded` | `share_id`, `utm_campaign` |

## 12. 用户故事与验收标准

### Story 1: STD public access

As an external player,
I want to open the STD public URL,
so that I can play the stable version without local setup.

Acceptance Criteria:

- Given I open `/std/`, when the page loads, then the STD game is playable.
- Given STD telemetry fires, then events include `game_variant=std`.
- Given the page is public, then it does not call `http://127.0.0.1:4318` by default.

### Story 2: HI public access

As an external player,
I want to open the HI public URL,
so that I can experience the high-visual version without local setup.

Acceptance Criteria:

- Given I open `/hi/`, when the page loads, then the HI game is playable.
- Given HI telemetry fires, then events include `game_variant=hi`.
- Given HI assets fail to load, then the failure is tracked without blocking gameplay.

### Story 3: Environment-aware telemetry

As a PM,
I want local, internal test, external playtest, and production data separated,
so that dashboard metrics are trustworthy.

Acceptance Criteria:

- Given a localhost session, when events are sent, then `data_scope=dev`.
- Given a public URL with `channel=internal_test`, when events are sent, then `data_scope=test`.
- Given a public URL without test channel, when events are sent, then `data_scope=prod`.
- Given I open Production Overview, then dev/test events are excluded by default.

### Story 4: STD vs HI comparison

As a product owner,
I want STD and HI performance and gameplay metrics compared,
so that I can decide whether HI should become the default experience.

Acceptance Criteria:

- Given STD and HI both have events, when I open STD vs HI Compare, then metrics can be grouped by `game_variant`.
- Given the same `build_version` family has multiple deployments, when I compare builds, then `deployment_id` can be used as a filter.
- Given HI has heavier assets, when I inspect HI Health, then load time and asset failures are visible.

## 13. 非功能需求

| 类别 | 要求 |
|---|---|
| 性能 | Telemetry 发送不能阻塞游戏主循环；performance events 必须抽样 |
| 安全 | Public remote collector 必须 HTTPS；collector endpoint 使用 allowlist |
| 隐私 | 不采集姓名、邮箱、输入内容、完整 URL query |
| 数据质量 | P0 required fields 缺失时写入 Data Quality warning |
| 兼容性 | STD/HI 至少验证 Chrome、Safari、Edge desktop；HI 额外验证移动端加载 |
| 可回滚 | `/hi/` 可独立下线或隐藏，不影响 `/std/` |
| 可维护性 | STD/HI 共用 telemetry SDK 和 resolver |

## 14. 实施计划

| Phase | 范围 | 工程任务 | 数据 QA | 验收标准 |
|---|---|---|---|---|
| Phase 0 | 入口定稿 | 确认 STD=`index.html`，HI=`HI1.070` | 确认版本字段 | STD/HI 入口列表被确认 |
| Phase 1 | 本地路径 | 建立 `/std/`、`/hi/` 本地入口或路由 | 验证相对资源 | 本地两个 URL 都可玩 |
| Phase 2 | Telemetry resolver | 实现环境/channel/variant 解析 | 验证公共字段 | 每条事件都有 P0 context |
| Phase 3 | 公网托管 | 部署静态站点 | 验证公网不打本地 collector | STD/HI public URL 可打开 |
| Phase 4 | Remote test sink | 接入 HTTPS collector 或数据平台 | 验证 schema + 去重 | internal/external test 数据可查 |
| Phase 5 | Dashboard filters | 增加 variant/channel/scope/build filters | 验证 production 默认过滤 | dashboard 可分层 |
| Phase 6 | STD vs HI compare | 对比体验和性能 | 检查样本量与显著性 | 可判断是否推广 HI |

## 15. 当前最大风险

| 风险 | 影响 | 处理 |
|---|---|---|
| HI 是 review artifact，不是稳定入口 | 后续难维护 | 先提升为固定 `/hi/` 入口 |
| STD 和 HI 代码分叉 | 埋点和修复容易漂移 | 共用 telemetry SDK，逐步抽公共逻辑 |
| 公网默认打本地 collector | 外部体验差，数据队列污染 | public mode 默认不使用 local collector |
| 测试和正式数据混淆 | KPI 失真 | 必填 `data_scope` 和 dashboard 默认过滤 |
| HI 资源更重 | 加载失败、性能下降 | HI 必须加 asset/performance telemetry |

## 16. 推荐下一步

先做 P0 的最小闭环：

1. 将 STD 和 HI 固定为两个稳定入口：`/std/`、`/hi/`。
2. 实现 telemetry mode resolver，不再把 collector URL 写死为本地默认。
3. 所有事件统一增加 `game_variant`、`release_channel`、`data_scope`、`build_version`。
4. 本地 dashboard 增加基础 filter，先让 local/dev/test/prod 可区分。
5. 再做公网部署和 remote collector。

这样可以同时满足本地继续开发、测试版本分发、STD/HI 外网访问、最终 dashboard 可统计这四个目标。
