/* ============ 应急响应每日特训 app.js ============ */
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]);
const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const DB = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("ert_" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("ert_" + k, JSON.stringify(v)); }
};

let DATA = { mcq: { items: [] }, fill: { items: [] }, scenarios: { items: [] }, commands_linux: { items: [] }, commands_windows: { items: [] } };
let WORLDS = {};
let MCQ_OS = "all", MCQ_MODE = "learn", FILL_OS = "all", CMD_OS = "linux";
let examTimer = null;

/* ================= 导航 ================= */
$$(".nav-btn").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
function showView(v) {
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  $$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  if (v === "dashboard") renderDashboard();
  if (v === "commands") renderCommands();
  if (v === "scenario") renderScnList();
  if (v === "echo") EchoLab.renderList();
  if (v === "wrong" && window.Pro) Pro.renderWrong();
  if (v === "reports" && window.Pro) Pro.renderReports();
  if (v === "about") renderAbout();
  stopExamTimer();
  if (window.Pro) Pro.stopCert();
  if (v !== "mcq" && mcqState && !mcqState.finished && $("#mcqQuiz").style.display !== "none") {
    finishMcq(true);
  }
}

/* ================= 统计与打卡 ================= */
function stats() {
  const s = DB.get("stats", { mcqDone: 0, mcqRight: 0, fillDone: 0, fillRight: 0, scnDone: [], byCat: {} });
  return s;
}
function bumpStat(fn) { const s = stats(); fn(s); DB.set("stats", s); }
function todayLog() {
  const log = DB.get("daily", {});
  if (!log[todayKey()]) log[todayKey()] = { checked: false, mcq: 0, fill: 0, scn: 0 };
  return log[todayKey()];
}
function saveTodayLog(d) { const log = DB.get("daily", {}); log[todayKey()] = d; DB.set("daily", log); }

function streak() {
  const log = DB.get("daily", {});
  let n = 0; const d = new Date();
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (log[k] && log[k].checked) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

const GOALS = { mcq: 10, fill: 5, scn: 1 };
function renderDashboard() {
  $("#todayDate").textContent = todayKey() + " " + "周" + "日一二三四五六"[new Date().getDay()];
  const t = todayLog();
  const st = streak();
  $("#statStreak").textContent = st + " 天";
  $("#statMcq").textContent = stats().mcqDone;
  $("#statFill").textContent = stats().fillDone;
  $("#statScn").textContent = stats().scnDone.length;
  $("#streakBadge").textContent = `🔥 连续打卡 ${st} 天`;

  const btn = $("#checkinBtn");
  btn.disabled = t.checked;
  btn.textContent = t.checked ? "✅ 今日已打卡" : "📋 立即打卡";
  $("#checkinMsg").textContent = t.checked ? "坚持就是胜利，明天继续！" : "完成下方目标后打卡，养成每日特训习惯";

  const goals = [
    { key: "mcq", label: `练习选择题 ≥ ${GOALS.mcq} 题`, cur: t.mcq },
    { key: "fill", label: `默写填空题 ≥ ${GOALS.fill} 题`, cur: t.fill },
    { key: "scn", label: `完成实操场景 ≥ ${GOALS.scn} 个`, cur: t.scn },
  ];
  $("#goalList").innerHTML = goals.map(g => {
    const done = g.cur >= GOALS[g.key];
    return `<div class="goal-item ${done ? "done" : ""}">
      <div class="box">${done ? "✔" : ""}</div>
      <div class="txt" style="flex:1">${g.label}<div class="goal-bar"><i style="width:${Math.min(100, g.cur / GOALS[g.key] * 100)}%"></i></div></div>
      <div class="muted small">${g.cur}/${GOALS[g.key]}</div></div>`;
  }).join("");

  const log = DB.get("daily", {});
  let heat = "";
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hit = log[k] && log[k].checked;
    heat += `<div class="heat-cell ${hit ? "hit" : ""} ${i === 0 ? "today" : ""}" title="${k}">${d.getDate()}</div>`;
  }
  $("#heatmap").innerHTML = heat;

  const byCat = stats().byCat || {};
  const rows = Object.entries(byCat).sort((a, b) => b[1].right / (b[1].done || 1) - a[1].right / (a[1].done || 1)).slice(0, 10);
  $("#masteryBars").innerHTML = rows.length ? rows.map(([cat, v]) => {
    const pct = Math.round(v.right / (v.done || 1) * 100);
    return `<div class="mastery-row"><div>${esc(cat)}</div><div class="mastery-track"><div class="mastery-fill" style="width:${pct}%"></div></div><div class="muted small">${pct}% (${v.done})</div></div>`;
  }).join("") : `<div class="muted small">暂无答题记录，去练几题吧～</div>`;
}

$("#checkinBtn").addEventListener("click", () => {
  const t = todayLog();
  if (!t.checked) { t.checked = true; saveTodayLog(t); }
  renderDashboard();
});

$$("[data-quick]").forEach(b => b.addEventListener("click", () => {
  const q = b.dataset.quick;
  if (q === "mcq-learn") { MCQ_MODE = "learn"; showView("mcq"); syncSeg("#mcqModeSeg", "mode", "learn"); startMcq(); }
  if (q === "mcq-exam") { MCQ_MODE = "exam"; showView("mcq"); syncSeg("#mcqModeSeg", "mode", "exam"); startMcq(); }
  if (q === "fill") { showView("fill"); startFill(); }
  if (q === "scenario") { showView("scenario"); }
}));
function syncSeg(sel, attr, val) { $$(sel + " .seg-btn").forEach(b => b.classList.toggle("active", b.dataset[attr] === val)); }

/* ================= 分类下拉填充 ================= */
function fillCatOptions(sel, items) {
  const cats = [...new Set(items.map(i => i.category))].filter(Boolean);
  sel.innerHTML = `<option value="all">全部分类</option>` + cats.map(c => `<option>${esc(c)}</option>`).join("");
}

/* ================= 选择题 ================= */
$$("#mcqModeSeg .seg-btn").forEach(b => b.addEventListener("click", () => { MCQ_MODE = b.dataset.mode; syncSeg("#mcqModeSeg", "mode", MCQ_MODE); }));
$$("#mcqOsSeg .seg-btn").forEach(b => b.addEventListener("click", () => { MCQ_OS = b.dataset.os; syncSeg("#mcqOsSeg", "os", MCQ_OS); fillCatOptions($("#mcqCat"), mcqPool(MCQ_OS)); }));
$("#mcqStart").addEventListener("click", startMcq);

function mcqPool(os) { return DATA.mcq.items.filter(i => os === "all" || i.os === os); }

let mcqState = null;
function startMcq() {
  const cat = $("#mcqCat").value;
  const n = +$("#mcqCount").value;
  let pool = mcqPool(MCQ_OS).filter(i => cat === "all" || i.category === cat);
  if (!pool.length) { alert("该筛选条件下没有题目"); return; }
  const qs = shuffle(pool).slice(0, Math.min(n, pool.length)).map(q => {
    const idx = shuffle(q.options.map((_, i) => i));
    return { ...q, shuffled: idx, newAnswer: idx.indexOf(q.answer) };
  });
  mcqState = { qs, cur: 0, answers: {}, mode: MCQ_MODE, started: Date.now(), examDone: false };
  $("#mcqConfig").style.display = "none";
  $("#mcqResult").style.display = "none";
  $("#mcqQuiz").style.display = "block";
  if (MCQ_MODE === "exam") startExamTimer(qs.length * 60);
  renderMcqQ();
}

function startExamTimer(sec) {
  stopExamTimer();
  let left = sec;
  const el = $("#mcqTimer");
  el.classList.remove("hidden");
  const tick = () => {
    const m = String(Math.floor(left / 60)).padStart(2, "0"), s = String(left % 60).padStart(2, "0");
    el.textContent = `⏱ ${m}:${s}`;
    el.classList.toggle("warn", left <= 60);
    if (left-- <= 0) { stopExamTimer(); finishMcq(true); }
  };
  tick(); examTimer = setInterval(tick, 1000);
}
function stopExamTimer() { if (examTimer) { clearInterval(examTimer); examTimer = null; } }

function renderMcqQ() {
  const st = mcqState, q = st.qs[st.cur];
  $("#mcqProgressTxt").textContent = `第 ${st.cur + 1} / ${st.qs.length} 题 · ${st.mode === "exam" ? "考试模式" : "学习模式"}`;
  $("#mcqProgressBar").style.width = (st.cur / st.qs.length * 100) + "%";
  $("#mcqNav").innerHTML = st.qs.map((_, i) => {
    let cls = i === st.cur ? "cur" : "";
    const a = st.answers[i];
    if (a !== undefined) {
      if (st.mode === "exam") cls = "cur";
      else cls = a === st.qs[i].newAnswer ? "ok" : "bad";
    }
    return `<button class="${cls}" data-i="${i}">${i + 1}</button>`;
  }).join("");
  $$("#mcqNav button").forEach(b => b.addEventListener("click", () => { st.cur = +b.dataset.i; renderMcqQ(); }));

  const ans = st.answers[st.cur];
  const showJudge = st.mode === "learn" && ans !== undefined;
  $("#mcqCard").innerHTML = `
    <div class="q-meta">
      <span class="tag os-${q.os}">${q.os.toUpperCase()}</span>
      <span class="tag d${q.difficulty || 1}">${["", "★ 简单", "★★ 中等", "★★★ 困难"][q.difficulty || 1]}</span>
      <span class="tag os-common">${esc(q.category || "")}</span>
    </div>
    <div class="q-text">${esc(q.question)}</div>
    <div class="opts">${q.shuffled.map((oi, i) => {
      let cls = "opt";
      if (showJudge) { if (i === q.newAnswer) cls += " right"; else if (i === ans) cls += " wrong"; }
      else if (i === ans) cls += " sel";
      return `<button class="${cls}" data-i="${i}"><span class="key">${"ABCD"[i]}.</span>${esc(q.options[oi])}</button>`;
    }).join("")}</div>
    ${showJudge ? `<div class="verdict ${ans === q.newAnswer ? "ok" : "bad"}">${ans === q.newAnswer ? "✅ 回答正确" : "❌ 回答错误，正确答案：" + "ABCD"[q.newAnswer]}</div>
    <div class="explain"><b>💡 解析</b><br>${esc(q.explanation || "")}</div>` : ""}`;

  $$("#mcqCard .opt").forEach(b => b.addEventListener("click", () => pickMcq(+b.dataset.i)));

  const acts = $("#mcqActions");
  const answered = ans !== undefined;
  acts.innerHTML = `
    ${st.mode === "learn" && !answered ? `<button class="btn btn-ghost" id="mcqSkip">跳过</button>` : ""}
    ${st.cur > 0 ? `<button class="btn btn-ghost" id="mcqPrev">← 上一题</button>` : ""}
    ${st.cur < st.qs.length - 1 ? `<button class="btn btn-primary" id="mcqNext" ${st.mode === "learn" && !answered ? "disabled" : ""}>下一题 →</button>` : ""}
    <button class="btn ${st.mode === "exam" ? "btn-danger" : "btn-green"}" id="mcqFinish">${st.mode === "exam" ? "交卷" : "完成练习"}</button>`;
  if ($("#mcqSkip")) $("#mcqSkip").addEventListener("click", () => { st.answers[st.cur] = -1; nextMcq(); });
  if ($("#mcqPrev")) $("#mcqPrev").addEventListener("click", () => { st.cur--; renderMcqQ(); });
  if ($("#mcqNext")) $("#mcqNext").addEventListener("click", nextMcq);
  $("#mcqFinish").addEventListener("click", () => finishMcq(false));
}

function pickMcq(i) {
  const st = mcqState;
  if (st.mode === "learn" && st.answers[st.cur] !== undefined) return;
  st.answers[st.cur] = i;
  const q = st.qs[st.cur];
  if (window.Pro) {
    const snap = { id: q.id, os: q.os, category: q.category, question: q.question, options: q.options, answer: q.answer, explanation: q.explanation };
    if (i === q.newAnswer) Pro.recordRight("mcq", q.id);
    else Pro.recordWrong("mcq", snap);
  }
  renderMcqQ();
}
function nextMcq() { const st = mcqState; if (st.cur < st.qs.length - 1) { st.cur++; renderMcqQ(); } }

function finishMcq(auto) {
  const st = mcqState;
  if (st.finished) return;
  st.finished = true;
  stopExamTimer();
  const unanswered = st.qs.filter((_, i) => st.answers[i] === undefined).length;
  if (!auto && unanswered && !confirm(`还有 ${unanswered} 题未作答，确定${st.mode === "exam" ? "交卷" : "结束"}吗？未答题按错误计。`)) return;
  let right = 0;
  const t = todayLog();
  st.qs.forEach((q, i) => {
    const a = st.answers[i];
    const ok = a === q.newAnswer;
    if (ok) right++;
    bumpStat(s => {
      s.mcqDone++; if (ok) s.mcqRight++;
      const c = s.byCat[q.category] || (s.byCat[q.category] = { done: 0, right: 0 });
      c.done++; if (ok) c.right++;
    });
    t.mcq++;
  });
  saveTodayLog(t);
  const total = st.qs.length, score = Math.round(right / total * 100);
  const cls = score >= 85 ? "good" : score >= 60 ? "mid" : "low";
  $("#mcqQuiz").style.display = "none";
  const res = $("#mcqResult");
  res.style.display = "block";
  res.innerHTML = `
    <div class="card result-hero">
      <div class="score-num ${cls}">${score}<span style="font-size:28px">分</span></div>
      <div class="muted" style="margin:8px 0 4px">共 ${total} 题 · 正确 ${right} 题 · 错误 ${total - right} 题</div>
      <div class="muted small">${score >= 85 ? "🏆 优秀！应急思路很扎实" : score >= 60 ? "💪 及格，继续查漏补缺" : "📌 别灰心，看看解析再练一轮"}</div>
      <div style="margin-top:22px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="mcqReview()">📋 查看解析复盘</button>
        <button class="btn" onclick="mcqReset()">🔄 再来一轮</button>
      </div>
    </div>
    <div id="mcqReviewArea"></div>`;
  mcqState._score = score;
}

window.mcqReview = function () {
  const st = mcqState;
  $("#mcqReviewArea").innerHTML = st.qs.map((q, i) => {
    const a = st.answers[i], ok = a === q.newAnswer;
    return `<div class="card">
      <div class="q-meta"><span class="tag os-${q.os}">${q.os.toUpperCase()}</span><span class="tag os-common">${esc(q.category || "")}</span>
      <span class="tag ${ok ? "os-linux" : "os-windows"}" style="${ok ? "color:var(--green);border-color:rgba(0,255,157,.4)" : "color:var(--red);border-color:rgba(255,77,109,.4)"}">${ok ? "✔ 正确" : "✘ 错误"}</span></div>
      <div class="q-text">${i + 1}. ${esc(q.question)}</div>
      ${q.shuffled.map((oi, j) => `<div class="opt ${j === q.newAnswer ? "right" : (j === a ? "wrong" : "")}" style="margin-bottom:6px;cursor:default"><span class="key">${"ABCD"[j]}.</span>${esc(q.options[oi])}</div>`).join("")}
      <div class="explain"><b>💡 解析</b><br>${esc(q.explanation || "")}</div></div>`;
  }).join("");
  $("#mcqReviewArea").scrollIntoView({ behavior: "smooth" });
};
window.mcqReset = function () {
  $("#mcqResult").style.display = "none";
  $("#mcqQuiz").style.display = "none";
  $("#mcqConfig").style.display = "block";
};

/* ================= 填空题 ================= */
$$("#fillOsSeg .seg-btn").forEach(b => b.addEventListener("click", () => { FILL_OS = b.dataset.os; syncSeg("#fillOsSeg", "os", FILL_OS); fillCatOptions($("#fillCat"), fillPool(FILL_OS)); }));
$("#fillStart").addEventListener("click", startFill);
function fillPool(os) { return DATA.fill.items.filter(i => os === "all" || i.os === os); }

let fillState = null;
function startFill() {
  const cat = $("#fillCat").value, n = +$("#fillCount").value;
  const pool = fillPool(FILL_OS).filter(i => cat === "all" || i.category === cat);
  if (!pool.length) { alert("该筛选条件下没有题目"); return; }
  fillState = { qs: shuffle(pool).slice(0, Math.min(n, pool.length)), cur: 0, results: [] };
  $("#fillConfig").style.display = "none";
  $("#fillQuiz").style.display = "block";
  renderFillQ();
}
function renderFillQ() {
  const st = fillState, q = st.qs[st.cur];
  $("#fillQuiz").innerHTML = `
    <div class="quiz-top"><div class="muted">第 ${st.cur + 1} / ${st.qs.length} 题 · 填空特训</div><div class="muted">✔ ${st.results.filter(r => r.ok).length}</div></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${st.cur / st.qs.length * 100}%"></div></div>
    <div class="card">
      <div class="q-meta"><span class="tag os-${q.os}">${q.os.toUpperCase()}</span><span class="tag os-common">${esc(q.category || "")}</span></div>
      <div class="q-text">${esc(q.question)}</div>
      ${st.results[st.cur] ? `
        <div class="verdict ${st.results[st.cur].ok ? "ok" : "bad"}">${st.results[st.cur].ok ? "✅ 已答对" : "❌ 已答错"}</div>
        ${st.results[st.cur].ok ? "" : `<div class="clue">✏️ 参考答案：<b style="font-family:var(--mono)">${esc((q.answers || []).join(" / "))}</b></div>`}
        <div class="explain"><b>💡 解析</b><br>${esc(q.explanation || "")}</div>` : `
      <input class="fill-input" id="fillInput" placeholder="输入答案后回车…" autocomplete="off" spellcheck="false">
      <div class="ans-hint">判分规则：不区分大小写、忽略空格；可点击“提示”查看首字符</div>
      <div id="fillFeedback"></div>`}
    </div>
    <div class="quiz-actions">
      <button class="btn btn-ghost" id="fillHintBtn">💡 提示</button>
      ${st.cur > 0 ? `<button class="btn btn-ghost" id="fillPrev">← 上一题</button>` : ""}
      <button class="btn btn-primary" id="fillCheck">检查答案</button>
    </div>`;
  const inp = $("#fillInput");
  inp.focus();
  inp.addEventListener("keydown", e => { if (e.key === "Enter") checkFill(); });
  $("#fillCheck").onclick = checkFill;
  $("#fillHintBtn").addEventListener("click", () => {
    const ans = (q.answers && q.answers[0]) || "";
    $("#fillFeedback").innerHTML = `<div class="clue">💡 提示：答案共 ${ans.length} 个字符，以 <b style="font-family:var(--mono)">${esc(ans[0])}</b> 开头</div>`;
  });
  if ($("#fillPrev")) $("#fillPrev").addEventListener("click", () => { st.cur--; renderFillQ(); });
}
function checkFill() {
  const st = fillState, q = st.qs[st.cur];
  if (st.results[st.cur]) return;
  const val = norm($("#fillInput").value);
  if (!val) return;
  const ok = (q.answers || []).some(a => norm(a) === val);
  if (window.Pro) {
    const snap = { id: q.id, os: q.os, category: q.category, question: q.question, answers: q.answers, explanation: q.explanation };
    ok ? Pro.recordRight("fill", q.id) : Pro.recordWrong("fill", snap);
  }
  st.results[st.cur] = { ok, q };
  const t = todayLog();
  bumpStat(s => { s.fillDone++; if (ok) s.fillRight++; });
  t.fill++; saveTodayLog(t);
  $("#fillFeedback").innerHTML = `
    <div class="verdict ${ok ? "ok" : "bad"}">${ok ? "✅ 正确！" : "❌ 不对哦"}</div>
    ${ok ? "" : `<div class="clue">✏️ 参考答案：<b style="font-family:var(--mono)">${esc((q.answers || []).join(" / "))}</b></div>`}
    <div class="explain"><b>💡 解析</b><br>${esc(q.explanation || "")}</div>`;
  $("#fillCheck").textContent = "下一题 →";
  $("#fillCheck").onclick = () => {
    if (st.cur < st.qs.length - 1) { st.cur++; renderFillQ(); }
    else finishFill();
  };
}
function finishFill() {
  const st = fillState;
  const right = st.results.filter(r => r && r.ok).length, total = st.qs.length;
  const score = Math.round(right / total * 100);
  const cls = score >= 85 ? "good" : score >= 60 ? "mid" : "low";
  $("#fillQuiz").innerHTML = `
    <div class="card result-hero">
      <div class="score-num ${cls}">${score}<span style="font-size:28px">分</span></div>
      <div class="muted">共 ${total} 题 · 正确 ${right} · 错误 ${total - right}</div>
      <div style="margin-top:20px"><button class="btn btn-primary" onclick="fillReset()">🔄 再来一轮</button></div>
    </div>`;
}
window.fillReset = function () { $("#fillQuiz").style.display = "none"; $("#fillConfig").style.display = "block"; };

/* ================= 实操场景 ================= */
function renderScnList() {
  $("#scnDetail").style.display = "none";
  const list = $("#scnList");
  list.style.display = "grid";
  const doneSet = stats().scnDone || [];
  list.innerHTML = DATA.scenarios.items.map((s, i) => `
    <div class="card scn-card" data-i="${i}">
      ${doneSet.includes(s.id) ? `<div class="scn-done-mark">✔ 已完成</div>` : ""}
      <div class="os-line"><span class="tag os-${s.os}">${s.os.toUpperCase()}</span>
        <span class="tag d${s.difficulty || 1}">${["", "★", "★★", "★★★"][s.difficulty || 1]}</span>
        <span class="tag os-common">${esc(s.category || "")}</span></div>
      <div class="scn-title">${esc(s.title)}</div>
      <div class="scn-bg">${esc(s.background)}</div>
    </div>`).join("");
  $$(".scn-card").forEach(c => c.addEventListener("click", () => openScenario(+c.dataset.i)));
}

let scnState = null;
function openScenario(i) {
  const s = DATA.scenarios.items[i];
  const world = WORLDS[s.id];
  scnState = { scn: s, step: 0, typed: [] };
  $("#scnList").style.display = "none";
  $("#scnDetail").style.display = "block";
  if (world) Workbench.open(s, world);
  else renderScnDetail();
}

/* ================= 命令手册 ================= */
$$("#cmdOsSeg .seg-btn").forEach(b => b.addEventListener("click", () => { CMD_OS = b.dataset.os; syncSeg("#cmdOsSeg", "os", CMD_OS); renderCommands() }));
$$("#echoOsSeg .seg-btn").forEach(b => b.addEventListener("click", () => { window._echoOs = b.dataset.os; syncSeg("#echoOsSeg", "os", window._echoOs); EchoLab.renderList(); }));
$("#echoQuizToggle").addEventListener("change", e => { window._echoQuiz = e.target.checked; });
$("#cmdSearch").addEventListener("input", renderCommands);
$("#cmdCat").addEventListener("change", renderCommands);

function renderCommands() {
  const items = DATA[CMD_OS === "linux" ? "commands_linux" : "commands_windows"].items;
  $("#cntLinux").textContent = DATA.commands_linux.items.length;
  $("#cntWin").textContent = DATA.commands_windows.items.length;
  const cats = [...new Set(items.map(i => i.category))].filter(Boolean);
  const sel = $("#cmdCat");
  if (sel.dataset.os !== CMD_OS) {
    sel.innerHTML = `<option value="all">全部分类</option>` + cats.map(c => `<option>${esc(c)}</option>`).join("");
    sel.dataset.os = CMD_OS;
  }
  const kw = norm($("#cmdSearch").value);
  const cat = sel.value;
  const list = items.filter(i =>
    (cat === "all" || i.category === cat) &&
    (!kw || norm([i.name, i.usage, i.desc, i.example, i.notes, i.category].join(" ")).includes(kw))
  );
  $("#cmdList").innerHTML = list.length ? list.map(i => `
    <div class="card cmd-card">
      <div class="cmd-head"><span class="cmd-name">${esc(i.name)}</span>
        <span class="risk risk-${esc(i.risk || "低")}">${esc(i.risk || "低")}关键度</span>
        <span class="cmd-cat">${esc(i.category)}</span></div>
      <div class="cmd-usage">${esc(i.usage || "")}</div>
      <div class="cmd-desc">${esc(i.desc || "")}</div>
      <div class="cmd-example">$ ${esc(i.example || "")}</div>
      ${i.notes ? `<div class="cmd-notes">${esc(i.notes)}</div>` : ""}
    </div>`).join("") : `<div class="muted" style="padding:30px;text-align:center">未找到匹配的命令，换个关键字试试</div>`;
}

/* ================= 关于 ================= */
function renderAbout() {
  const m = DATA.mcq.items.length, f = DATA.fill.items.length, s = DATA.scenarios.items.length;
  const steps = DATA.scenarios.items.reduce((a, i) => a + (i.steps ? i.steps.length : 0), 0);
  const l = DATA.commands_linux.items.length, w = DATA.commands_windows.items.length;
  const e = (DATA.echo_lab?.items || []).length;
  $("#aboutStats").innerHTML = [
    [l, "Linux 命令"], [w, "Windows 命令"], [m, "选择题"], [f, "填空题"], [s, "实操场景"], [steps, "场景步骤"], [e, "回显对比"],
  ].map(([n, t]) => `<div class="about-stat"><b>${n}</b><span>${t}</span></div>`).join("");
}

/* ================= 启动 ================= */
async function boot() {
  try {
    if (location.protocol === "file:" && window.EMBEDDED_DATA) {
      DATA = window.EMBEDDED_DATA;
    } else {
      try {
        const r = await fetch("/api/data");
        DATA = await r.json();
      } catch (err) {
        DATA = window.EMBEDDED_DATA || DATA;
      }
    }
    ["mcq", "fill", "scenarios", "commands_linux", "commands_windows", "echo_lab"].forEach(k => { if (!DATA[k] || !DATA[k].items) DATA[k] = { items: [] }; });
    const extras = [...(DATA.scenarios_extra?.items || []), ...(DATA.scenarios_extra2?.items || [])];
    const seen = new Set(DATA.scenarios.items.map(i => i.id));
    extras.forEach(x => { if (!seen.has(x.id)) DATA.scenarios.items.push(x); });
    WORLDS = { ...(DATA.worlds_linux?.worlds || {}), ...(DATA.worlds_win?.worlds || {}) };
    if (window.Pro) Pro.mergeCustom();
  } catch (e) {
    alert("数据加载失败：" + e.message);
  }
  fillCatOptions($("#mcqCat"), mcqPool("all"));
  fillCatOptions($("#fillCat"), fillPool("all"));
  renderDashboard();
  renderCommands();
  renderAbout();
  routeHash();
  window.addEventListener("hashchange", routeHash);
}

function routeHash() {
  const h = decodeURIComponent(location.hash.replace("#", ""));
  if (!h) return;
  if (h.startsWith("scenario-")) {
    const idx = +h.split("-")[1];
    showView("scenario");
    if (DATA.scenarios.items[idx]) openScenario(idx);
  } else if (["mcq", "fill", "scenario", "echo", "wrong", "reports", "commands", "about", "dashboard"].includes(h)) {
    showView(h);
  }
}
boot();
