/* ============ 企业版扩展：错题本/数据中心/成就/认证/题库管理/备份 ============ */
"use strict";

const Pro = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]);
  const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const dayOffset = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  const get = (k, d) => { try { return JSON.parse(localStorage.getItem("ert_" + k)) ?? d; } catch { return d; } };
  const set = (k, v) => localStorage.setItem("ert_" + k, JSON.stringify(v));

  const wrongBook = () => get("wrongbook", {});
  const saveWrong = w => set("wrongbook", w);
  const profile = () => get("profile", { name: "" });
  const examHist = () => get("examhist", []);

  const STAGE_DAYS = [0, 1, 3, 7, 15, 30];

  function recordWrong(type, snap) {
    const w = wrongBook();
    const key = type + ":" + snap.id;
    const it = w[key] || { type, snap, wrongCount: 0, rightStreak: 0, stage: 0 };
    it.wrongCount++;
    it.rightStreak = 0;
    it.stage = 0;
    it.nextReview = dayOffset(STAGE_DAYS[0]);
    it.lastWrong = todayKey();
    w[key] = it;
    saveWrong(w);
  }
  function recordRight(type, id) {
    const w = wrongBook();
    const key = type + ":" + id;
    const it = w[key];
    if (!it) return;
    it.rightStreak++;
    if (it.rightStreak >= 3) {
      delete w[key];
    } else {
      it.stage = Math.min(it.stage + 1, STAGE_DAYS.length - 1);
      it.nextReview = dayOffset(STAGE_DAYS[it.stage]);
    }
    saveWrong(w);
    const t = get("wrongStats", { cleared: 0 });
    if (it === undefined || !w[key]) { t.cleared++; set("wrongStats", t); }
  }
  function wrongCounts() {
    const w = wrongBook();
    const today = todayKey();
    let due = 0, total = 0;
    for (const k in w) { total++; if (!w[k].nextReview || w[k].nextReview <= today) due++; }
    return { total, due };
  }

  function renderWrong() {
    const home = $("#wrongHome"), quiz = $("#wrongQuiz");
    quiz.style.display = "none";
    home.style.display = "block";
    const w = wrongBook();
    const c = wrongCounts();
    const items = Object.entries(w).sort((a, b) => (a[1].nextReview || "") < (b[1].nextReview || "") ? -1 : 1);
    home.innerHTML = `
      <div class="dash-grid">
        <div class="card">
          <div class="card-title">📌 复习概览</div>
          <div class="wrong-overview">
            <div class="stat"><div class="stat-num">${c.due}</div><div class="stat-label">今日到期</div></div>
            <div class="stat"><div class="stat-num">${c.total}</div><div class="stat-label">错题总数</div></div>
            <div class="stat"><div class="stat-num">${get("wrongStats", { cleared: 0 }).cleared}</div><div class="stat-label">已攻克</div></div>
          </div>
          <div class="quiz-actions" style="justify-content:flex-start">
            <button class="btn btn-primary" id="wrongStartDue" ${c.due === 0 ? "disabled" : ""}>🔁 复习今日到期（${c.due}）</button>
            <button class="btn btn-ghost" id="wrongStartAll" ${c.total === 0 ? "disabled" : ""}>📚 全部错题重练</button>
          </div>
          <div class="muted small" style="margin-top:10px">复习规则：答对升一级，连对 3 次移出错题本；答错重置。</div>
        </div>
        <div class="card" style="grid-column:span 2">
          <div class="card-title">📋 错题清单（按复习到期排序）</div>
          ${items.length ? `<div class="wrong-list">${items.map(([k, it]) => {
            const s = it.snap;
            const due = !it.nextReview || it.nextReview <= todayKey();
            return `<div class="wrong-item">
              <span class="tag os-${s.os || "common"}">${(s.os || "common").toUpperCase()}</span>
              <span class="wq">${esc((s.question || "").slice(0, 80))}${(s.question || "").length > 80 ? "…" : ""}</span>
              <span class="muted small">错${it.wrongCount}次 · 连对${it.rightStreak}/3 · ${due ? '<b style="color:var(--amber)">今日到期</b>' : "下次 " + it.nextReview}</span>
            </div>`;
          }).join("")}</div>` : `<div class="muted small">暂无错题。</div>`}
        </div>
      </div>`;
    $("#wrongStartDue")?.addEventListener("click", () => startReview("due"));
    $("#wrongStartAll")?.addEventListener("click", () => startReview("all"));
  }

  let reviewState = null;
  function startReview(mode) {
    const w = wrongBook(), today = todayKey();
    let entries = Object.entries(w);
    if (mode === "due") entries = entries.filter(([, it]) => !it.nextReview || it.nextReview <= today);
    entries = entries.sort(() => Math.random() - .5);
    if (!entries.length) { alert("没有可复习的错题"); return; }
    reviewState = { entries, cur: 0, mode };
    home2quiz();
    renderReviewQ();
  }
  function home2quiz() { $("#wrongHome").style.display = "none"; $("#wrongQuiz").style.display = "block"; }

  function renderReviewQ() {
    const st = reviewState;
    const [key, it] = st.entries[st.cur];
    const s = it.snap;
    $("#wrongQuiz").innerHTML = `
      <div class="quiz-top"><div class="muted">错题重练 ${st.cur + 1} / ${st.entries.length}</div><button class="btn btn-ghost" id="wrBack">← 退出</button></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${st.cur / st.entries.length * 100}%"></div></div>
      <div class="card q-card">
        <div class="q-meta"><span class="tag os-${s.os || "common"}">${(s.os || "common").toUpperCase()}</span><span class="tag os-common">${esc(s.category || "")}</span><span class="tag d1">错${it.wrongCount}次</span></div>
        <div class="q-text">${esc(s.question)}</div>
        <div id="wrAnswer"></div>
        <div id="wrFeedback"></div>
      </div>`;
    $("#wrBack").addEventListener("click", renderWrong);
    const ans = $("#wrAnswer");
    if (it.type === "mcq") {
      ans.innerHTML = `<div class="opts">${s.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="key">${"ABCD"[i]}.</span>${esc(o)}</button>`).join("")}</div>`;
      $$("#wrAnswer .opt").forEach(b => b.addEventListener("click", () => judgeReview(+b.dataset.i === s.answer, s.answer !== undefined ? "ABCD"[s.answer] + ". " + s.options[s.answer] : "")));
    } else {
      ans.innerHTML = `<input class="fill-input" id="wrFill" placeholder="输入答案后回车…"><div class="ans-hint">回车提交</div>`;
      const inp = $("#wrFill"); inp.focus();
      const go = () => {
        const v = norm(inp.value);
        if (!v) return;
        judgeReview((s.answers || []).some(a => norm(a) === v), "参考答案：" + (s.answers || []).join(" / "));
      };
      inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
      ans.insertAdjacentHTML("beforeend", `<div class="quiz-actions"><button class="btn btn-primary" id="wrFillBtn">检查答案</button></div>`);
      $("#wrFillBtn").addEventListener("click", go);
    }
  }
  function judgeReview(ok, rightTxt) {
    const st = reviewState;
    const [key, it] = st.entries[st.cur];
    if (ok) recordRight(it.type, it.snap.id);
    else recordWrong(it.type, it.snap);
    $("#wrFeedback").innerHTML = `
      <div class="verdict ${ok ? "ok" : "bad"}">${ok ? "✅ 正确！" : "❌ 错误，" + esc(rightTxt)}</div>
      <div class="explain"><b>💡 解析</b><br>${esc(it.snap.explanation || "")}</div>
      <div class="quiz-actions"><button class="btn btn-primary" id="wrNext">${st.cur < st.entries.length - 1 ? "下一题 →" : "完成复习 🎉"}</button></div>`;
    $("#wrNext").addEventListener("click", () => {
      if (st.cur < st.entries.length - 1) { st.cur++; renderReviewQ(); }
      else { alert("本轮复习完成！"); renderWrong(); }
    });
  }

  const ACHIEVEMENTS = [
    { id: "first", icon: "🌱", name: "初出茅庐", desc: "完成首次打卡", cond: () => streak() >= 1, tier: "铜" },
    { id: "week", icon: "🔥", name: "七日之约", desc: "连续打卡 7 天", cond: () => streak() >= 7, tier: "铜" },
    { id: "hundred", icon: "⚔️", name: "百炼成钢", desc: "累计答题 100 题", cond: s => s.mcqDone + s.fillDone >= 100, tier: "铜" },
    { id: "habit", icon: "⚙️", name: "钢铁意志", desc: "连续打卡 30 天", cond: () => streak() >= 30, tier: "银" },
    { id: "sniper", icon: "🎯", name: "神枪手", desc: "答题≥300 且正确率≥85%", cond: s => s.mcqDone + s.fillDone >= 300 && (s.mcqRight + s.fillRight) / Math.max(1, s.mcqDone + s.fillDone) >= .85, tier: "银" },
    { id: "scout", icon: "💻", name: "实战先锋", desc: "完成 8 个实操场景", cond: s => s.scnDone.length >= 8, tier: "银" },
    { id: "killer", icon: "📕", name: "亡羊补牢", desc: "错题重练攻克 50 道", cond: () => get("wrongStats", { cleared: 0 }).cleared >= 50, tier: "银" },
    { id: "phoenix", icon: "🦅", name: "破茧重生", desc: "任一分类正确率提升到≥85%", cond: s => Object.values(s.byCat || {}).some(v => v.done >= 20 && v.right / v.done >= .85), tier: "银" },
    { id: "allcat", icon: "🧩", name: "知识无死角", desc: "每个分类均答对≥5题", cond: s => { const c = s.byCat || {}; const cats = [...new Set(DATA.mcq.items.map(i => i.category))]; return cats.every(k => c[k] && c[k].right >= 5); }, tier: "金" },
    { id: "master", icon: "🧠", name: "全域作战", desc: "24 个实操场景全部完成", cond: s => s.scnDone.length >= 24, tier: "金" },
    { id: "cert", icon: "🏆", name: "金牌认证", desc: "结业认证考试通过（≥80分）", cond: () => examHist().some(e => e.pass), tier: "金" },
    { id: "cert90", icon: "👑", name: "卓越工程师", desc: "结业认证一次取得≥90分", cond: () => examHist().some(e => e.score >= 90), tier: "金" },
  ];
  function streak() {
    const log = get("daily", {});
    let n = 0; const d = new Date();
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (log[k] && log[k].checked) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }
  function earnedIds() {
    const s = get("stats", { mcqDone: 0, mcqRight: 0, fillDone: 0, fillRight: 0, scnDone: [], byCat: {} });
    return ACHIEVEMENTS.filter(a => { try { return a.cond(s); } catch { return false; } }).map(a => a.id);
  }

  function renderReports() {
    const s = get("stats", { mcqDone: 0, mcqRight: 0, fillDone: 0, fillRight: 0, scnDone: [], byCat: {} });
    const totalQ = s.mcqDone + s.fillDone;
    const acc = totalQ ? Math.round((s.mcqRight + s.fillRight) / totalQ * 100) : 0;
    const log = get("daily", {});
    const earned = new Set(earnedIds());
    const tiers = { "金": "gold", "银": "silver", "铜": "bronze" };

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ k, v: log[k] ? log[k].mcq + log[k].fill + log[k].scn * 5 : 0, label: String(d.getDate()) });
    }
    const maxV = Math.max(10, ...days.map(d => d.v));
    const W = 640, H = 140, step = W / 29;
    const pts = days.map((d, i) => `${(i * step).toFixed(1)},${(H - 18 - d.v / maxV * (H - 40)).toFixed(1)}`);
    const trendSvg = `<svg viewBox="0 0 ${W} ${H}" class="trend-svg" preserveAspectRatio="none">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,229,255,.35)"/><stop offset="1" stop-color="rgba(0,229,255,0)"/></linearGradient></defs>
      <polyline points="0,${H - 18} ${pts.join(" ")} ${W},${H - 18}" fill="url(#tg)" stroke="none"/>
      <polyline points="${pts.join(" ")}" fill="none" stroke="var(--cyan)" stroke-width="2"/>
      ${days.map((d, i) => d.v > 0 ? `<circle cx="${(i * step).toFixed(1)}" cy="${(H - 18 - d.v / maxV * (H - 40)).toFixed(1)}" r="2.5" fill="var(--green)"/>` : "").join("")}
      ${[0, 7, 14, 21, 29].map(i => `<text x="${i * step}" y="${H - 4}" font-size="9" fill="var(--muted)">${days[i].label}</text>`).join("")}
    </svg>`;

    const byCat = s.byCat || {};
    const catRows = Object.entries(byCat).map(([k, v]) => ({ k, pct: Math.round(v.right / (v.done || 1) * 100), done: v.done }))
      .sort((a, b) => a.pct - b.pct);
    const catColor = r => r.done < 5 ? "var(--muted)" : r.pct >= 80 ? "var(--green)" : r.pct >= 60 ? "var(--amber)" : "var(--red)";

    const report = weeklyText(log, totalQ, acc);

    $("#reportsBody").innerHTML = `
      <div class="dash-grid">
        <div class="card stat-row" style="grid-column:span 3">
          <div class="stat"><div class="stat-num">${streak()}</div><div class="stat-label">连续打卡</div></div>
          <div class="stat"><div class="stat-num">${totalQ}</div><div class="stat-label">累计答题</div></div>
          <div class="stat"><div class="stat-num">${acc}%</div><div class="stat-label">总正确率</div></div>
          <div class="stat"><div class="stat-num">${s.scnDone.length}</div><div class="stat-label">完成场景</div></div>
        </div>
        <div class="card" style="grid-column:span 3">
          <div class="card-title">📈 近 30 天训练强度趋势</div>
          ${trendSvg}
        </div>
        <div class="card" style="grid-column:span 3">
          <div class="card-title">🩺 分类掌握度（薄弱分类优先补强）</div>
          ${catRows.length ? catRows.map(r => `
            <div class="mastery-row"><div>${esc(r.k)}${r.done >= 5 && r.pct < 60 ? ' <span class="tag d3" style="font-size:9px;padding:1px 6px">薄弱</span>' : ""}</div>
            <div class="mastery-track"><div class="mastery-fill" style="width:${r.pct}%;background:${catColor(r)}"></div></div>
            <div class="muted small" style="color:${catColor(r)}">${r.pct}% (${r.done})</div></div>`).join("") : `<div class="muted small">暂无答题记录</div>`}
        </div>
        <div class="card" style="grid-column:span 3">
          <div class="card-title">📄 本周学习简报（自动生成）</div>
          <div class="summary-box">${report}</div>
        </div>
        <div class="card" style="grid-column:span 3">
          <div class="card-title">🏅 成就勋章（${earned.size}/${ACHIEVEMENTS.length}）</div>
          <div class="ach-grid">
            ${ACHIEVEMENTS.map(a => `
              <div class="ach ${earned.has(a.id) ? "on" : ""} ${tiers[a.tier]}">
                <div class="ach-icon">${earned.has(a.id) ? a.icon : "🔒"}</div>
                <div class="ach-name">${esc(a.name)}</div>
                <div class="ach-desc">${esc(a.desc)}</div>
                <div class="ach-tier">${a.tier}</div>
              </div>`).join("")}
          </div>
        </div>
        <div class="card cert-card" style="grid-column:span 3">
          <div class="card-title">🏆 结业认证考试</div>
          <div class="muted" style="margin-bottom:10px">40 题混合卷（选择 30 + 填空 10）· 限时 40 分钟 · 80 分及格。</div>
          <div class="cfg-row">
            <label>姓名</label>
            <input class="input" id="certName" placeholder="证书姓名" value="${esc(profile().name)}" style="max-width:220px">
            <label>部门/工号</label>
            <input class="input" id="certDept" placeholder="选填" value="${esc(profile().dept || "")}" style="max-width:180px">
          </div>
          <div class="quiz-actions" style="justify-content:flex-start">
            <button class="btn btn-primary" id="certStart">🚀 开始认证考试</button>
          </div>
        </div>
        <div class="card" style="grid-column:span 3">
          <div class="card-title">💾 数据备份与迁移</div>
          <div class="quiz-actions" style="justify-content:flex-start">
            <button class="btn btn-primary" id="bkExport">⬇️ 导出数据</button>
            <label class="btn btn-ghost" style="cursor:pointer">⬆️ 导入数据<input type="file" id="bkImport" accept=".json" style="display:none"></label>
            <button class="btn btn-danger" id="bkWipe">🗑️ 清空本机数据</button>
          </div>
        </div>
        <div class="card" style="grid-column:span 3">
          <div class="card-title">🗂️ 自定义题库管理</div>
          <div id="qmBody"></div>
        </div>
      </div>`;

    $("#certStart").addEventListener("click", () => {
      const name = $("#certName").value.trim();
      if (!name) { alert("请先填写证书姓名"); return; }
      set("profile", { name, dept: $("#certDept").value.trim() });
      startCert();
    });
    $("#bkExport").addEventListener("click", exportData);
    $("#bkImport").addEventListener("change", e => { if (e.target.files[0]) importData(e.target.files[0]); });
    $("#bkWipe").addEventListener("click", () => {
      if (!confirm("确定清空本机全部学习数据？")) return;
      Object.keys(localStorage).filter(k => k.startsWith("ert_")).forEach(k => localStorage.removeItem(k));
      alert("已清空。"); location.reload();
    });
    renderQManager();
  }

  function weeklyText(log, totalQ, acc) {
    const inWeek = k => { const d = new Date(); const dt = new Date(k); return (d - dt) / 86400000 <= 7; };
    const inLastWeek = k => { const d = new Date(); const dt = new Date(k); const diff = (d - dt) / 86400000; return diff > 7 && diff <= 14; };
    let w1 = 0, w0 = 0;
    for (const k in log) { if (!log[k].checked) continue; if (inWeek(k)) w1++; else if (inLastWeek(k)) w0++; }
    return `本周完成 <b>${w1}</b> 次打卡（上周 ${w0}）。累计 <b>${totalQ}</b> 题，正确率 <b>${acc}%</b>。`;
  }

  let certState = null, certTimer = null;
  function stopCert() { if (certTimer) { clearInterval(certTimer); certTimer = null; } }
  function startCert() {
    stopCert();
    if (DATA.mcq.items.length < 30 || DATA.fill.items.length < 10) { alert("题库不足"); return; }
    const mcq = shuffle(DATA.mcq.items).slice(0, 30);
    const fill = shuffle(DATA.fill.items).slice(0, 10);
    certState = { mcq, fill, cur: 0, answers: {}, left: 40 * 60 };
    $("#reportsBody").innerHTML = `<div class="quiz-wrap">
      <div class="quiz-top"><div class="muted" id="certProg">第 1 / 40 题</div><div class="timer" id="certTimer">⏱ 40:00</div></div>
      <div class="progress-bar"><div class="progress-fill" id="certBar" style="width:0%"></div></div>
      <div class="q-nav" id="certNav"></div>
      <div class="card q-card" id="certCard"></div>
      <div class="quiz-actions" id="certActs"></div>
    </div>`;
    renderCertQ();
    certTimer = setInterval(() => {
      certState.left--;
      const m = String(Math.floor(certState.left / 60)).padStart(2, "0"), sec = String(certState.left % 60).padStart(2, "0");
      const el = $("#certTimer"); if (el) { el.textContent = `⏱ ${m}:${sec}`; el.classList.toggle("warn", certState.left <= 120); }
      if (certState.left <= 0) finishCert(true);
    }, 1000);
  }
  function renderCertQ() {
    const st = certState;
    const isMcq = st.cur < 30;
    const q = isMcq ? st.mcq[st.cur] : st.fill[st.cur - 30];
    $("#certProg").textContent = `第 ${st.cur + 1} / 40 题 · ${isMcq ? "选择题" : "填空题"}`;
    $("#certBar").style.width = (st.cur / 40 * 100) + "%";
    $("#certNav").innerHTML = Array.from({ length: 40 }, (_, i) => {
      const a = st.answers[i];
      return `<button class="${i === st.cur ? "cur" : ""} ${a !== undefined ? "ok" : ""}" data-i="${i}">${i + 1}</button>`;
    }).join("");
    $$("#certNav button").forEach(b => b.addEventListener("click", () => { st.cur = +b.dataset.i; renderCertQ(); }));
    $("#certCard").innerHTML = isMcq
      ? `<div class="q-meta"><span class="tag os-${q.os}">${q.os.toUpperCase()}</span><span class="tag os-common">${esc(q.category || "")}</span></div>
         <div class="q-text">${esc(q.question)}</div>
         <div class="opts">${q.options.map((o, i) => `<button class="opt ${st.answers[st.cur] === i ? "sel" : ""}" data-i="${i}"><span class="key">${"ABCD"[i]}.</span>${esc(o)}</button>`).join("")}</div>`
      : `<div class="q-meta"><span class="tag os-${q.os}">${q.os.toUpperCase()}</span><span class="tag os-common">${esc(q.category || "")}</span></div>
         <div class="q-text">${esc(q.question)}</div>
         <input class="fill-input" id="certFill" value="${esc(st.answers[st.cur] || "")}" placeholder="输入答案后回车…">`;
    if (isMcq) $$("#certCard .opt").forEach(b => b.addEventListener("click", () => { st.answers[st.cur] = +b.dataset.i; renderCertQ(); }));
    else {
      const inp = $("#certFill");
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { st.answers[st.cur] = inp.value; renderCertQ(); } });
    }
    $("#certActs").innerHTML = `
      ${st.cur > 0 ? `<button class="btn btn-ghost" id="certPrev">← 上一题</button>` : ""}
      ${st.cur < 39 ? `<button class="btn btn-primary" id="certNext">下一题 →</button>` : `<button class="btn btn-danger" id="certSubmit">交卷</button>`}`;
    if ($("#certPrev")) $("#certPrev").addEventListener("click", () => { st.cur--; renderCertQ(); });
    if ($("#certNext")) $("#certNext").addEventListener("click", () => { st.cur++; renderCertQ(); });
    if ($("#certSubmit")) $("#certSubmit").addEventListener("click", () => {
      const un = 40 - Object.keys(st.answers).filter(k => st.answers[k] !== undefined && st.answers[k] !== "").length;
      if (un && !confirm(`还有 ${un} 题未作答，确定交卷？`)) return;
      finishCert(false);
    });
  }
  function finishCert(auto) {
    clearInterval(certTimer); certTimer = null;
    const st = certState;
    let right = 0;
    st.mcq.forEach((q, i) => { if (st.answers[i] === q.answer) right++; });
    st.fill.forEach((q, i) => {
      const v = norm(st.answers[30 + i]);
      if (v && (q.answers || []).some(a => norm(a) === v)) right++;
    });
    const score = Math.round(right / 40 * 100);
    const pass = score >= 80;
    const hist = examHist();
    hist.push({ date: todayKey(), score, pass, right });
    set("examhist", hist);
    const prof = profile();
    const certNo = "DFIR-" + new Date().getFullYear() + "-" + String(1000 + Math.floor(Math.random() * 9000));
    const name = prof.name || "应急学员";
    if (pass) set("certno", certNo);
    $("#reportsBody").innerHTML = pass ? `
      <div class="cert-paper">
        <div class="cert-brand">🛡 应急响应每日特训 · 企业认证中心</div>
        <div class="cert-title">结 业 证 书</div>
        <div class="cert-line">兹证明</div>
        <div class="cert-name">${esc(name)}</div>
        <div class="cert-line">取得 <b>${score}</b> 分（满分 100），评定等级 <b>${score >= 90 ? "优秀" : "合格"}</b>，授予「应急响应认证工程师」称号。</div>
        <div class="cert-foot">
          <div>证书编号：${certNo}</div>
          <div>颁证日期：${todayKey()}</div>
        </div>
        <div class="quiz-actions" style="justify-content:center"><button class="btn btn-primary" onclick="window.print()">🖨 打印 / 保存 PDF</button>
        <button class="btn btn-ghost" onclick="Pro.renderReports()">返回</button></div>
      </div>` : `
      <div class="card result-hero">
        <div class="score-num ${score >= 60 ? "mid" : "low"}">${score}<span style="font-size:28px">分</span></div>
        <div class="muted">答对 ${right} / 40 题 · 认证线 80 分</div>
        <div style="margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="Pro.renderReports()">返回</button>
          <button class="btn btn-ghost" onclick="Pro.startCert()">🔄 再考一次</button>
        </div>
      </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const custom = () => get("custom", { mcq: [], fill: [] });
  function sanitizeQ(q, type) {
    if (!q || typeof q !== "object") return null;
    const out = { ...q };
    out.id = String(q.id || "cus-x").slice(0, 64);
    out.os = ["linux", "windows", "common"].includes(q.os) ? q.os : "common";
    out.category = String(q.category || "自定义").slice(0, 40);
    out.question = String(q.question || "");
    out.explanation = String(q.explanation || "");
    out.difficulty = Math.min(3, Math.max(1, parseInt(q.difficulty) || 2));
    if (type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length !== 4) return null;
      out.options = q.options.map(o => String(o ?? ""));
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return null;
      out.answer = q.answer;
    } else {
      if (!Array.isArray(q.answers) || !q.answers.length) return null;
      out.answers = q.answers.map(a => String(a ?? "")).filter(Boolean);
      if (!out.answers.length) return null;
    }
    if (!out.question.trim()) return null;
    return out;
  }
  function renderQManager() {
    const c = custom();
    const el = $("#qmBody");
    el.innerHTML = `
      <div class="muted small" style="margin-bottom:10px">添加企业内部题目（保存到本机，可随数据备份导出分享）。</div>
      <div class="cfg-row">
        <label>题型</label>
        <div class="seg" id="qmTypeSeg">
          <button class="seg-btn active" data-t="mcq">选择题</button>
          <button class="seg-btn" data-t="fill">填空题</button>
        </div>
      </div>
      <div id="qmForm"></div>
      <div class="quiz-actions" style="justify-content:flex-start">
        <button class="btn btn-primary" id="qmAdd">➕ 保存题目</button>
      </div>
      <div class="card-title" style="margin-top:16px">已添加（选择 ${c.mcq.length} / 填空 ${c.fill.length}）</div>
      <div class="wrong-list">
        ${[...c.mcq.map(q => ({ t: "mcq", q })), ...c.fill.map(q => ({ t: "fill", q }))].map(({ t, q }) => `
          <div class="wrong-item"><span class="tag os-common">${t === "mcq" ? "选" : "填"}</span>
            <span class="wq">${esc(q.question.slice(0, 60))}…</span>
            <button class="btn btn-danger qm-del" data-id="${esc(q.id)}" data-t="${t}" style="padding:4px 10px;font-size:11px">删除</button></div>`).join("") || `<div class="muted small">暂无自定义题目</div>`}
      </div>`;
    let qmType = "mcq";
    $$("#qmTypeSeg .seg-btn").forEach(b => b.addEventListener("click", () => {
      qmType = b.dataset.t; syncSeg("#qmTypeSeg", "t", qmType); renderQmForm(qmType);
    }));
    renderQmForm("mcq");
    $("#qmAdd").addEventListener("click", () => saveQ(qmType));
    $$(".qm-del").forEach(b => b.addEventListener("click", () => {
      const cc = custom();
      if (b.dataset.t === "mcq") cc.mcq = cc.mcq.filter(q => q.id !== b.dataset.id);
      else cc.fill = cc.fill.filter(q => q.id !== b.dataset.id);
      set("custom", cc); renderQManager();
    }));
  }
  function renderQmForm(t) {
    $("#qmForm").innerHTML = t === "mcq" ? `
      <input class="input" id="f_os" placeholder="os：linux / windows / common" style="max-width:280px;margin-bottom:6px;display:block">
      <input class="input" id="f_cat" placeholder="分类" style="max-width:280px;margin-bottom:6px;display:block">
      <textarea class="input" id="f_q" rows="2" placeholder="题干" style="width:100%"></textarea>
      <input class="input" id="f_o0" placeholder="选项 A" style="width:100%;margin-top:6px">
      <input class="input" id="f_o1" placeholder="选项 B" style="width:100%">
      <input class="input" id="f_o2" placeholder="选项 C" style="width:100%">
      <input class="input" id="f_o3" placeholder="选项 D" style="width:100%">
      <input class="input" id="f_ans" placeholder="正确答案：A/B/C/D" style="max-width:280px;margin-top:6px">
      <textarea class="input" id="f_exp" rows="2" placeholder="解析" style="width:100%;margin-top:6px"></textarea>`
      : `
      <input class="input" id="f_os" placeholder="os：linux / windows / common" style="max-width:280px;margin-bottom:6px;display:block">
      <input class="input" id="f_cat" placeholder="分类" style="max-width:280px;margin-bottom:6px;display:block">
      <textarea class="input" id="f_q" rows="2" placeholder="题干" style="width:100%"></textarea>
      <input class="input" id="f_ans" placeholder="答案（多个等价写法用 | 分隔）" style="width:100%;margin-top:6px">
      <textarea class="input" id="f_exp" rows="2" placeholder="解析" style="width:100%;margin-top:6px"></textarea>`;
  }
  function saveQ(t) {
    const v = id => ($("#" + id).value || "").trim();
    const c = custom();
    const base = { id: "cus-" + Date.now().toString(36) + Math.floor(Math.random() * 99), os: (v("f_os") || "common").toLowerCase(), category: v("f_cat") || "自定义", question: v("f_q"), explanation: v("f_exp") || "" };
    if (!base.question) { alert("题干不能为空"); return; }
    if (t === "mcq") {
      const opts = [v("f_o0"), v("f_o1"), v("f_o2"), v("f_o3")];
      if (opts.some(o => !o)) { alert("四个选项都要填写"); return; }
      const ai = "ABCD".indexOf(v("f_ans").toUpperCase());
      if (ai < 0) { alert("正确答案必须是 A/B/C/D"); return; }
      const q = sanitizeQ({ ...base, options: opts, answer: ai, difficulty: 2 }, "mcq");
      if (!q) { alert("题目结构不合法"); return; }
      c.mcq.push(q);
    } else {
      const answers = v("f_ans").split("|").map(x => x.trim()).filter(Boolean);
      if (!answers.length) { alert("答案不能为空"); return; }
      const q = sanitizeQ({ ...base, answers, difficulty: 2 }, "fill");
      if (!q) { alert("题目结构不合法"); return; }
      c.fill.push(q);
    }
    set("custom", c);
    mergeCustom();
    renderQManager();
    alert("已保存并生效");
  }
  function mergeCustom() {
    const c = custom();
    c.mcq = c.mcq.map(q => sanitizeQ(q, "mcq")).filter(Boolean);
    c.fill = c.fill.map(q => sanitizeQ(q, "fill")).filter(Boolean);
    set("custom", c);
    const seen = new Set(DATA.mcq.items.map(i => i.id));
    c.mcq.forEach(q => { if (!seen.has(q.id)) { DATA.mcq.items.push(q); seen.add(q.id); } });
    const seen2 = new Set(DATA.fill.items.map(i => i.id));
    c.fill.forEach(q => { if (!seen2.has(q.id)) { DATA.fill.items.push(q); seen2.add(q.id); } });
  }

  function download(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function exportData() {
    const payload = {
      schemaVersion: 2, exportedAt: new Date().toISOString(), app: "dfir-trainer",
      profile: get("profile", {}), daily: get("daily", {}),
      stats: get("stats", {}), wrongbook: wrongBook(), wrongStats: get("wrongStats", {}),
      custom: custom(), examhist: examHist(), certno: get("certno", ""),
    };
    download("dfir_backup_" + todayKey() + ".json", JSON.stringify(payload, null, 2));
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      let d;
      try { d = JSON.parse(r.result); } catch { alert("文件不是合法 JSON"); return; }
      if (d.app !== "dfir-trainer") { alert("不是本系统的备份文件"); return; }
      try {
        ["daily", "stats", "wrongbook", "wrongStats", "custom", "examhist", "profile", "certno"].forEach(k => {
          if (d[k] !== undefined) set(k, d[k]);
        });
        mergeCustom();
        alert("导入完成！页面将刷新。");
        location.reload();
      } catch (e) { alert("导入失败：" + e.message); }
    };
    r.readAsText(file, "utf-8");
  }

  return { renderWrong, renderReports, startCert, stopCert, recordWrong, recordRight, mergeCustom };
})();
window.Pro = Pro;