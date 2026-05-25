# Task Monitor Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `task-execution-monitor` up to the reliability and test coverage level of `qps-monitor` while preserving task execution semantics.

**Architecture:** Keep the existing Koa app split: routes expose config and metrics APIs, services handle Grafana querying and alert decisions, and config storage remains isolated. Copy only mature behavior patterns from `qps-monitor`; do not copy QPS-specific PromQL or UI labels into this project.

**Tech Stack:** Node.js CommonJS, Koa, Axios, Node built-in `node:test`, static frontend.

---

### Task 1: Compare Existing Behavior

**Files:**
- Read: `server/routes/metrics.js`
- Read: `server/services/alert.js`
- Read: `../qps-monitor/server/routes/metrics.js`
- Read: `../qps-monitor/server/services/alert.js`
- Read: `../qps-monitor/server/routes/metrics.test.js`
- Read: `../qps-monitor/server/services/alert.test.js`

- [ ] **Step 1: Identify task-safe differences**

Run:

```powershell
Get-Content server\routes\metrics.js
Get-Content server\services\alert.js
Get-Content ..\qps-monitor\server\routes\metrics.js
Get-Content ..\qps-monitor\server\services\alert.js
Get-Content ..\qps-monitor\server\routes\metrics.test.js
Get-Content ..\qps-monitor\server\services\alert.test.js
```

Expected: the QPS project has broader route and alert tests. Only migrate patterns that map to task metrics: current metrics, history, alert history, cooldown, night silence, consecutive abnormal checks, and per-task thresholds.

### Task 2: Add Metrics Route Tests

**Files:**
- Create: `server/routes/metrics.test.js`
- Modify if needed: `server/routes/metrics.js`

- [ ] **Step 1: Write tests for metrics route setup**

Create `server/routes/metrics.test.js` with tests that construct the metrics router using fake `grafanaService`, `alertService`, and `configStore`. Test `GET /current`, `GET /history`, and `GET /alerts` through the router stack without starting the HTTP server.

- [ ] **Step 2: Run tests to verify failures or pass**

Run:

```powershell
npm test
```

Expected: new tests either pass immediately or expose task route behavior gaps.

- [ ] **Step 3: Patch route behavior only if tests expose a gap**

If route tests fail because task monitor behavior differs unintentionally from QPS monitor, patch `server/routes/metrics.js` to keep response shape stable:

```js
ctx.body = {
  success: true,
  data: currentMetrics,
  lastUpdate
};
```

Use the actual route response shape already present in this project unless it is broken.

### Task 3: Expand Alert Service Tests

**Files:**
- Modify: `server/services/alert.test.js`
- Modify if needed: `server/services/alert.js`

- [ ] **Step 1: Add tests for threshold lookup**

Cover object task threshold override, string task fallback, and default thresholds.

- [ ] **Step 2: Add tests for abnormal decisions**

Cover failure count over threshold, success rate below threshold, normal metrics, and `null` metrics.

- [ ] **Step 3: Add tests for alert lifecycle**

Cover ten consecutive abnormal checks before alert, cooldown suppression, alert history trimming, night silence from 00:00 to 07:59, and streak reset after alert.

- [ ] **Step 4: Run alert tests**

Run:

```powershell
npm test -- server/services/alert.test.js
```

Expected: all alert tests pass. If any fail, adjust `server/services/alert.js` without changing configured thresholds or alert text semantics.

### Task 4: Verify Package and Runtime

**Files:**
- Read: `package.json`
- Modify only if broken: `package.json`

- [ ] **Step 1: Run full tests**

Run:

```powershell
npm test
```

Expected: all Node tests pass.

- [ ] **Step 2: Start server briefly**

Run:

```powershell
npm start
```

Expected: server starts on configured port `3006` and registers config and metrics routes. Stop the server after confirming startup.

- [ ] **Step 3: Manually check local metrics endpoint if server is running**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3006/api/metrics/current
```

Expected: HTTP 200 JSON response. Real Grafana data may be `null` if the internal Grafana host is unreachable from this environment.

### Task 5: Summarize Results

**Files:**
- Read: changed files from `git diff --stat`

- [ ] **Step 1: Inspect changed files**

Run:

```powershell
git diff --stat
```

Expected: changes are limited to task monitor tests, any necessary route/service fixes, and this plan.

- [ ] **Step 2: Report verification**

Final response should list changed files, test commands run, and any runtime/Grafana connectivity limitation.
