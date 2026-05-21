#!/usr/bin/env node
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  let d = {};
  try { d = JSON.parse(raw); } catch { /* ignore */ }

  const R = "\x1b[31m";
  const G = "\x1b[32m";
  const Y = "\x1b[33m";
  const DIM = "\x1b[2m";
  const X = "\x1b[0m";

  const parts = [];

  // 1. Model display name
  if (d.model?.display_name) parts.push(d.model.display_name);

  // 2. Project root directory (basename only)
  if (d.workspace?.project_dir) {
    const dir = d.workspace.project_dir;
    const sep = dir.includes("\\") ? "\\" : "/";
    const segs = dir.split(sep).filter(Boolean);
    parts.push(segs[segs.length - 1] || dir);
  }

  // 3. Context usage — green <50%, yellow 50-79%, red 80%+
  if (d.context_window?.used_percentage != null) {
    const pct = Math.round(d.context_window.used_percentage);
    let color = G;
    if (pct >= 80) color = R;
    else if (pct >= 50) color = Y;
    parts.push(`Ctx:${color}${pct}%${X}`);
  }

  // 4. Cache hit rate — green >=80%, yellow 50-79%, red <50%
  const cur = d.context_window?.current_usage || {};
  const cacheRead = cur.cache_read_input_tokens;
  const cacheWrite = cur.cache_creation_input_tokens;
  if (cacheRead != null && (cacheRead + cacheWrite) > 0) {
    const hitRate = Math.round((cacheRead / (cacheRead + cacheWrite)) * 100);
    let color = G;
    if (hitRate < 50) color = R;
    else if (hitRate < 80) color = Y;
    parts.push(`Cache:${color}${hitRate}%${X}`);
  }

  // 5 & 6. Input / Output tokens
  const fmt = (n) => {
    if (n == null) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return String(n);
  };
  const cw = d.context_window || {};
  parts.push(`${DIM}In:${X}${fmt(cw.total_input_tokens)} ${DIM}Out:${X}${fmt(cw.total_output_tokens)}`);

  // 7. 5-hour rate limit
  if (d.rate_limits?.five_hour?.used_percentage != null) {
    const pct = Math.round(d.rate_limits.five_hour.used_percentage);
    let color = G;
    if (pct >= 80) color = R;
    else if (pct >= 50) color = Y;
    parts.push(`5h:${color}${pct}%${X}`);
  }

  // 8. 7-day rate limit
  if (d.rate_limits?.seven_day?.used_percentage != null) {
    const pct = Math.round(d.rate_limits.seven_day.used_percentage);
    let color = G;
    if (pct >= 80) color = R;
    else if (pct >= 50) color = Y;
    parts.push(`7d:${color}${pct}%${X}`);
  }

  process.stdout.write(parts.join(` ${DIM}|${X} `));
});
process.stdin.resume();
