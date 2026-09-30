/* ============ 回显对比实验室 ============ */
"use strict";

const EchoLab = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]);

  let st = null;

  function list() { return DATA.echo_lab?.items || []; }

  function renderList() {
    $("#echoDetail").style.display = "none";
    const listEl = $("#echoList");
    listEl.style.display = "grid";
    const osFilter = window._echoOs || "all";
    const items = list().filter(i => osFilter === "all" || i.os === osFilter);
    listEl.innerHTML = items.length ? items.map(it => `
      <div class="card scn-card" data-id="${esc(it.id)}">
        <div class="os-line"><span class="tag os-${it.os}">${it.os.toUpperCase()}</span>
          <span class="tag os-common">${esc(it.category || "")}</span></div>
        <div class="scn-title" style="font-family:var(--mono);font-size:14.5px">$ ${esc(it.command)}</div>
        <div class="scn-bg">🎯 ${esc(it.purpose || "")}</div>
        <div class="muted small" style="margin-top:8px">💬 ${it.annotations?.length || 0} 条异常注释讲解</div>
      </div>`).join("") : `<div class="muted" style="padding:30px">暂无数据</div>`;
    $$("#echoList .scn-card").forEach(c => c.addEventListener("click", () => openEcho(c.dataset.id)));
  }

  function openEcho(id) {
    const item = list().find(i => i.id === id);
    if (!item) return;
    st = { item, quiz: (window._echoQuiz !== false), revealed: false, shownIsAbnormal: null, guess: null };
    $("#echoList").style.display = "none";
    $("#echoDetail").style.display = "block";
    renderDetail();
  }

  function highlight(abnormal) {
    let html = esc(abnormal);
    const marks = [];
    (st.item.annotations || []).forEach((a, idx) => {
      if (!a.match) return;
      const mEsc = esc(a.match).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(mEsc, "gi"), m => { marks.push(m); return `\x00${marks.length - 1}\x00`; });
    });
    return html.replace(/\x00(\d+)\x00/g, (_, i) => `<mark class="hl">${marks[i]}</mark>`);
  }

  function termBox(title, cls, bodyHtml) {
    return `
      <div class="term echo-term ${cls}">
        <div class="term-bar">
          <span class="term-dot" style="background:#ff5f57"></span><span class="term-dot" style="background:#febc2e"></span><span class="term-dot" style="background:#28c840"></span>
          <span class="term-title">${esc(title)}</span>
        </div>
        <div class="term-body">${bodyHtml}</div>
      </div>`;
  }

  function renderDetail() {
    const it = st.item;
    const d = $("#echoDetail");
    const prompt = it.os === "windows" ? "C:\\Users\\admin>" : "root@web-server:~#";

    if (st.shownIsAbnormal === null) st.shownIsAbnormal = Math.random() < 0.5;

    let middle = "";
    if (!st.revealed) {
      const shown = st.shownIsAbnormal ? it.abnormal_output : it.normal_output;
      middle = termBox("被检主机回显（这是哪一种环境？）", "", esc(shown)) + `
        <div class="quiz-actions" style="justify-content:center">
          <button class="btn btn-green" id="echoGuessNormal">🙂 判定：正常环境</button>
          <button class="btn btn-danger" id="echoGuessBad">☠️ 判定：已被入侵</button>
          <button class="btn btn-ghost" id="echoSkip">直接看对比讲解</button>
        </div>`;
    } else {
      middle = `
        <div class="echo-compare">
          ${termBox("✅ 正常环境回显", "term-normal", esc(it.normal_output))}
          ${termBox("☠️ 异常/被入侵回显", "term-abnormal", highlight(it.abnormal_output))}
        </div>
        <div class="card" style="margin-top:14px">
          <div class="card-title">🧐 注释讲解（${(it.annotations || []).length} 个异常点）</div>
          ${(it.annotations || []).map(a => `
            <div class="anno-item">
              <div class="anno-label">${esc(a.label || "⚠️ 异常点")}</div>
              <div class="anno-match">&gt; ${esc(a.match)}</div>
              <div class="anno-explain">${esc(a.explain)}</div>
            </div>`).join("")}
          <div class="explain" style="margin-top:12px"><b>🎯 判读思路</b><br>${esc(it.how_to_spot || "")}</div>
          ${it.related_commands?.length ? `<div class="explain" style="border-left-color:var(--green);margin-top:10px"><b>⌨️ 关联排查命令</b><br>${it.related_commands.map(c => `<code class="rel-cmd">${esc(c)}</code>`).join("<br>")}</div>` : ""}
        </div>`;
    }

    d.innerHTML = `
      <button class="btn btn-ghost" id="echoBack">← 返回命令列表</button>
      <div class="card" style="margin-top:14px">
        <div class="q-meta"><span class="tag os-${it.os}">${it.os.toUpperCase()}</span><span class="tag os-common">${esc(it.category)}</span>
          ${st.revealed ? `<span class="muted small" style="margin-left:auto">${st.guess === null ? "直接查看" : (st.guess ? "判定正确" : "判定错误")}</span>` : `<span class="tag d2" style="margin-left:auto">考考你模式</span>`}</div>
        <div class="echo-cmd">$ ${esc(it.command)}</div>
        <div class="muted" style="margin-top:6px">🎯 ${esc(it.purpose || "")}</div>
      </div>
      ${middle}`;

    $("#echoBack").addEventListener("click", renderList);
    if (!st.revealed) {
      $("#echoGuessNormal").addEventListener("click", () => judge(false));
      $("#echoGuessBad").addEventListener("click", () => judge(true));
      $("#echoSkip").addEventListener("click", () => { st.guess = null; st.revealed = true; renderDetail(); });
    }
  }

  function judge(saidAbnormal) {
    st.revealed = true;
    st.guess = saidAbnormal === st.shownIsAbnormal;
    renderDetail();
    bumpStat(s => { s.mcqDone++; if (st.guess) s.mcqRight++; });
    const t = todayLog(); t.mcq++; saveTodayLog(t);
  }

  return { renderList, openEcho, list };
})();
