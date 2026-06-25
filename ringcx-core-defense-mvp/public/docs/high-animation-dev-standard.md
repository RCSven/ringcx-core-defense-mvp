# RingCX Core Defense High Animation Dev Standard

## 1. 背景与问题

当前 High 视觉方向已经明确：RingCentral UI 色系 + 漫画动作风字体 + 高对比战斗反馈。上一版 GIF 解决了方向问题，但还不能直接进入开发，因为真实游戏动画不能依赖静态图抠图、阴影替代、或抽象 proxy。

本标准的目标是把 High 视觉拆成前端可实现、可验收、可降级的动画系统。

## 2. 目标与成功指标

| 目标 | 成功指标 |
|---|---|
| 怪物真实移动 | enemy body 沿 path 连续位移，带 walk/idle frame，不允许只移动阴影或光圈 |
| defender 攻击有身体反馈 | 攻击时至少包含 anticipate、pop/lunge、fire、recoil、recover |
| 射击反馈清晰 | projectile 或 beam 从 defender muzzle 到 enemy hitbox，impact 跟随 enemy |
| 可进入前端开发 | 有 manifest、状态机、asset naming、timing、quality tier |
| 可控性能 | High/Medium/Low 三档明确降级，不改玩法读数 |

## 2.1 当前假设

- 当前 `High` demo 的 HUD 数值、升级价格、敌人 HP、target 指向属于视觉对齐用 placeholder，不代表正式 gameplay balance。
- 当前动画标准的唯一配置源为 [animation-manifest.json](/Users/sven.liu/Documents/RC Game/ringcx-core-defense-mvp/assets/sprites/high-dev-standard/animation-manifest.json)。
- HTML demo 和 GIF demo 应共享同一份 anchor、path、timing、target、VFX 定义，避免“文档一套、实现一套”。

## 3. 用户画像与场景

| 用户 | 场景 | 需要看到什么 |
|---|---|---|
| Player | Wave 战斗中快速判断风险 | enemy 在 path 上推进、core 被威胁、defender 正在攻击 |
| PM/Designer | 评审视觉与游戏 feel | 战斗状态、节奏、角色动作是否符合 High 风格 |
| Frontend Engineer | 实现动画系统 | actor 状态机、sprite 规格、timing、performance tier |

## 4. 功能范围

| Priority | Scope | 说明 |
|---|---|---|
| P0 | Independent actor layers | defender、enemy、projectile、impact 必须独立渲染 |
| P0 | Enemy path movement | enemy body 必须沿 path 移动，hitbox 和 health bar 跟随 |
| P0 | Defender attack motion | 攻击时身体 scale/lunge，muzzle point 跟随身体 |
| P0 | Projectile + impact | projectile 从 muzzle 到 target hitbox，impact 在 target body 上 |
| P1 | Sprite frame animation | idle/walk/attack 使用 sprite sheet 或 atlas frame |
| P1 | Quality tier | High/Medium/Low 根据设备降级粒子、glow、frame step |
| P2 | Directional animation | enemy 根据 path tangent 切换 facing/diagonal variant |

## 5. 功能详述 + 验收标准

### 5.1 Enemy Movement

**User Story**

As a player, I want enemies to visibly walk along the route, so that I can understand the incoming threat and urgency.

**Acceptance Criteria**

| ID | 验收标准 |
|---|---|
| EM-1 | enemy body 的 `x/y` 坐标每帧沿 path 更新，不允许只移动 shadow、ring、particle |
| EM-2 | enemy health bar、hitbox、impact point 必须跟随 body |
| EM-3 | walk cycle 必须有至少 4 frame；boss 至少 6 frame |
| EM-4 | enemy 进入 core 前 20% path 时，视觉威胁增强，但不能遮挡 core HP |
| EM-5 | 30 FPS 下 movement 不应出现明显跳点；低端设备可降低 sprite frame，不可降低 path position update |

### 5.2 Defender Attack Motion

**User Story**

As a player, I want defenders to physically react when attacking, so that each shot feels intentional rather than a static turret effect.

**Acceptance Criteria**

| ID | 验收标准 |
|---|---|
| DA-1 | defender 每次攻击包含 `anticipate -> pop/lunge -> fire -> recoil -> recover` |
| DA-2 | `pop/lunge` 阶段 scale 峰值为 1.10-1.18，持续 80-130ms |
| DA-3 | muzzle point 必须随角色 body transform 更新 |
| DA-4 | 攻击动画不能导致角色离开自己的 platform anchor 超过 20px |
| DA-5 | 连续攻击时，动画可以 overlap projectile，但不能 overlap body state 到 unreadable |

### 5.3 Projectile / Impact

**User Story**

As a player, I want shots and impacts to clearly connect defenders and enemies, so that I can understand who is attacking whom.

**Acceptance Criteria**

| ID | 验收标准 |
|---|---|
| PI-1 | projectile 起点为 defender `muzzle`，终点为 enemy hitbox center/top third |
| PI-2 | impact ring 必须跟随 enemy body 当帧坐标 |
| PI-3 | impact duration 180-260ms，High 可带 particles，Low 只保留 ring/flash |
| PI-4 | 同屏 projectile 数量受 tier 限制，超限时合并或跳过非关键粒子 |

## 6. 非功能需求

| 维度 | 标准 |
|---|---|
| Performance | High target 60 FPS；Medium 45 FPS；Low 30 FPS |
| Rendering | 推荐 Canvas 2D 或 PixiJS；不建议大量 DOM actor + CSS filter |
| Asset | transparent PNG/WebP atlas，2x runtime size，8px padding |
| Memory | High atlas 建议单张不超过 4096x4096；移动端可拆 defender/enemy/VFX atlas |
| Compatibility | Chrome/Edge/Safari desktop；低端设备关闭 dynamic glow 和高密度 particles |
| Accessibility | 关键状态不能只靠颜色，health bar/label/position 必须可读 |

## 7. Asset Production Contract

| Asset | Runtime size | Required states | Frame count | Pivot | Notes |
|---|---:|---|---:|---|---|
| PM Defender | 154x170 | idle, attack, recoil, disabled | 4/6/3/1 | bottom-center | Orange headset, command tablet |
| QA Defender | 154x170 | idle, block, attack, recoil | 4/4/6/3 | bottom-center | Green shield must read at small size |
| SE Defender | 150x170 | idle, attack, recoil, disabled | 4/6/3/1 | bottom-center | Blue wrench/lightning readable |
| SDET Defender | 154x170 | idle, attack, recoil, disabled | 4/6/3/1 | bottom-center | Cyan robot can be sub-layer or companion sprite |
| Customer Risk | 118x170 | walk, hit, die | 5/2/5 | bottom-center | Orange customer-pressure mascot, readable as baseline customer threat |
| Hotfix Bug | 112x104 | spawn, walk, hit, die | 4/6/2/5 | bottom-center | Red bug silhouette, no text |
| Release Gate | 118x116 | spawn, walk, hit, die | 4/6/2/5 | bottom-center | Cube/box enemy, angry face |
| Flaky Auto | 108x108 | spawn, walk, hit, die | 4/6/2/5 | bottom-center | Purple blob, preserve goo edges |
| Meeting Swarm | 122x104 | spawn, walk, hit, die | 4/6/2/5 | bottom-center | Group asset; internal notes can wobble |
| VIP Sync | 116x108 | spawn, walk, hit, die | 4/6/2/5 | bottom-center | Crown/sunglasses readable |
| Trust Audit Boss | 190x188 | spawn, walk, attackCore, hit, die | 6/8/6/3/8 | bottom-center | Larger boss silhouette, briefcase/audit clipboard |

## 8. Quality Tier Rules

| Tier | 适用设备 | 保留 | 降级 |
|---|---|---|---|
| High | M-series Mac, modern desktop, good GPU | Full sprite frame, glow, particles, animated impact, parallax floor | None |
| Medium | Intel Mac/Windows laptop | Body animation, projectile, impact ring, basic particles | Disable dynamic glow, halve particles |
| Low | Older laptop / constrained browser | Body movement, path movement, health bar, basic projectile | No particles, no glow filter, sprite frame step 3 |

## 9. 前端接入建议

| Area | Recommendation | Trade-off |
|---|---|---|
| Renderer | PixiJS or Canvas 2D actor system | PixiJS 更适合 atlas/batching；Canvas 2D 更少依赖 |
| Asset loading | Atlas JSON + image sheets | 首屏要 preload；但 runtime draw 更稳定 |
| State machine | Per actor state + animation clock | 比 CSS animation 多一点工程量，但可同步 gameplay |
| Effects | Procedural projectile + sprite impact | VFX 可降级，不影响玩法 |
| Main integration | 先 behind feature flag 接入 battle layer | 避免一次性替换主程序带来风险 |

### 9.1 推荐接入契约

- Manifest 真源: [animation-manifest.json](/Users/sven.liu/Documents/RC Game/ringcx-core-defense-mvp/assets/sprites/high-dev-standard/animation-manifest.json)
- TypeScript 类型契约: [high-animation-manifest.types.d.ts](/Users/sven.liu/Documents/RC Game/ringcx-core-defense-mvp/docs/high-animation-manifest.types.d.ts)
- Debug 对位 demo: [high-sprite-atlas-demo-v2.html](/Users/sven.liu/Documents/RC Game/ringcx-core-defense-mvp/high-sprite-atlas-demo-v2.html)

### 9.2 Debug Overlay 约定

- 按 `D` 切换 debug overlay。
- 进入 debug 后必须能看到：
  - path 折线与关键节点
  - defender anchor
  - muzzle point
  - enemy hitbox
  - 当前 projectile 连接线
- 设计验收时先看正常模式，再看 debug 模式，不允许只在 debug 对得上、正常渲染却错位。

## 10. 开发任务拆分

| Task | Owner | Output |
|---|---|---|
| Asset generation | Designer / AI asset pipeline | transparent PNG/WebP atlas + atlas JSON |
| Animation engine | Frontend | actor state machine, path movement, projectile layer |
| Game data binding | Frontend | enemy spawn wave, defender target, damage events |
| Quality tier | Frontend | device/profile based tier switch |
| Visual QA | PM + Designer | compare against High reference and acceptance checklist |

## 11. 依赖与风险

| Risk | Impact | Mitigation |
|---|---|---|
| 没有独立 High sprite，只能做低保真 proxy | 无法达到最终视觉标准 | 先冻结 asset contract，再批量生成/绘制 sprite |
| 角色卡片和战场 actor 风格不一致 | UI 断层 | 用同一 prompt pack/同一 line weight/color rules |
| 粒子和 glow 过重 | 低端设备掉帧 | 严格执行 tier，VFX 不参与核心玩法读数 |
| Sprite pivot 不统一 | path movement 抖动 | 所有 actor 使用 bottom-center pivot，atlas metadata 强校验 |

## 12. 上线计划

| Phase | 内容 |
|---|---|
| Phase 0 | 使用 `high-dev-standard-animation.html` 对齐 motion feel |
| Phase 1 | 生成/绘制第一批 High sprite atlas |
| Phase 2 | 接入独立 battle render layer，behind feature flag |
| Phase 3 | 绑定真实 wave/target/damage 数据 |
| Phase 4 | 做 High/Medium/Low 性能 profiling 和视觉 QA |
