/* ============ 实操场景·仿真工作台引擎 ============ */
"use strict";

const Workbench = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]);
  const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

  let st = null;

  function open(scn, world, container) {
    st = { scn, world, step: 0, done: [], termLines: [], notes: [], cwd: world.prompt.replace(/[#>]\s*$/, "").trim(), quizDone: false };
    render();
  }

  function render() {
    const { scn: s, world } = st;
    const step = s.steps[st.step];
    const cmdKeys = Object.keys(world.commands || {});
    const c = $("#scnDetail");
    c.innerHTML = `
      <button class="btn btn-ghost" id="scnBack">← 返回场景列表</button>
      <div class="workbench">
        <div class="wb-col">
          <div class="card ticket-card">
            <div class="q-meta"><span class="tag os-${s.os}">${s.os.toUpperCase()}</span><span class="tag os-common">${esc(s.category)}</span>
              <span class="tag d${s.difficulty || 1}">${["", "★ 简单", "★★ 中等", "★★★ 困难"][s.difficulty || 1]}</span></div>
            <h2 style="margin:6px 0 10px">${esc(s.title)}</h2>
            <div class="ticket-box">
              <div class="ticket-head">🎫 应急工单 · ${esc(todayStr())}</div>
              <div class="ticket-body">${esc(s.background)}</div>
            </div>
            <div class="muted small" style="margin-top:10px">处置进度 ${st.done.filter(Boolean).length}/${s.steps.length} 步</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${st.done.filter(Boolean).length / s.steps.length * 100}%"></div></div>
          </div>
          <div class="card" id="wbStepCard">
            <div class="step-head" style="margin-top:0"><div class="step-num">${st.step + 1}</div><div class="step-prompt">${esc(step.prompt)}</div></div>
            <div id="scnFeedback"></div>
            <div class="scn-toolbar">
              <button class="btn btn-ghost" id="wbHint">💡 看提示</button>
              <button class="btn btn-ghost" id="wbShow">👀 演示正确命令</button>
              <button class="btn btn-ghost" id="wbCmds">⌨️ 仿真命令面板</button>
            </div>
            <div id="wbCmdPanel" class="cmd-panel hidden">
              <div class="muted small" style="margin-bottom:6px">点击命令直接填入终端：</div>
              ${cmdKeys.map(k => `<button class="cmd-chip" data-cmd="${esc(k)}">${esc(k)}</button>`).join("")}
            </div>
          </div>
        </div>
        <div class="wb-col wb-term-col">
          <div class="term">
            <div class="term-bar">
              <span class="term-dot" style="background:#ff5f57"></span><span class="term-dot" style="background:#febc2e"></span><span class="term-dot" style="background:#28c840"></span>
              <span class="term-title">${esc(world.prompt)} — 仿真受害主机</span>
            </div>
            <div class="term-body" id="termBody"></div>
            <div class="term-input-line">
              <span class="term-prompt">${esc(world.prompt)}</span>
              <input class="term-input" id="termInput" placeholder="自由输入命令探索环境，回车执行…" spellcheck="false" autocomplete="off">
            </div>
          </div>
        </div>
        <div class="wb-col">
          <div class="card note-card">
            <div class="card-title">🚩 取证笔记（自动收集线索）</div>
            <div id="noteList" class="note-list">${st.notes.length ? "" : `<div class="muted small">执行命令、观察输出，关键线索会自动记录在这里</div>`}</div>
          </div>
          <div class="card">
            <div class="card-title">🧭 应急思路链</div>
            <ol class="chain-list">
              <li>确认现象（CPU/进程/流量）</li>
              <li>定位恶意进程与文件</li>
              <li>查持久化（计划任务/启动项/公钥）</li>
              <li>查日志还原入侵路径</li>
              <li>清除 + 加固 + 复盘</li>
            </ol>
          </div>
        </div>
      </div>`;

    const body = $("#termBody");
    body.innerHTML = st.termLines.map(x => `<span class="cmd-line">${esc(x.prompt)} ${esc(x.cmd)}</span>\n${esc(x.out)}\n`).join("");
    body.scrollTop = 99999;
    renderNotes();

    const inp = $("#termInput");
    inp.focus();
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter" && inp.value.trim()) { runCmd(inp.value.trim()); inp.value = ""; }
    });
    $("#scnBack").addEventListener("click", renderScnList);
    $("#wbHint").addEventListener("click", () => {
      $("#scnFeedback").innerHTML = `<div class="clue">💡 提示：${esc(step.hint || "想想该步骤的目标")}</div>`;
    });
    $("#wbShow").addEventListener("click", () => {
      execLine(step.commands[0], step.simulated_output);
      renderStepSuccess();
    });
    $("#wbCmds").addEventListener("click", () => $("#wbCmdPanel").classList.toggle("hidden"));
    $$("#wbCmdPanel .cmd-chip").forEach(b => b.addEventListener("click", () => { inp.value = b.dataset.cmd; inp.focus(); }));
  }

  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  function renderNotes() {
    const el = $("#noteList");
    if (!el) return;
    el.innerHTML = st.notes.length
      ? st.notes.map(n => `<div class="note-item"><div class="note-clue">${esc(n.clue)}</div><div class="note-src muted small">via ${esc(n.via)}</div></div>`).join("")
      : `<div class="muted small">执行命令、观察输出，关键线索会自动记录在这里</div>`;
  }

  function scanClues(out, via) {
    const clues = (st.world.clues || []).filter(c => !st.notes.some(n => n.clue === c) && out.toLowerCase().includes(c.toLowerCase()));
    let fresh = false;
    clues.forEach(clue => { st.notes.push({ clue, via }); fresh = true; });
    if (fresh) {
      renderNotes();
      const fb = $("#scnFeedback");
      if (fb) fb.insertAdjacentHTML("beforeend", `<div class="toast-clue">🚩 发现新线索！已记入右侧取证笔记</div>`);
    }
  }

  function execLine(cmd, out) {
    st.termLines.push({ prompt: st.world.prompt, cmd, out });
    const body = $("#termBody");
    if (body) {
      body.innerHTML += `<span class="cmd-line">${esc(st.world.prompt)} ${esc(cmd)}</span>\n${esc(out)}\n`;
      body.scrollTop = 99999;
    }
    scanClues(out, cmd);
  }

  function markStepDone() {
    st.done[st.step] = true;
    const n = $("#scnNext");
    if (n) n.disabled = false;
  }

  function renderStepSuccess() {
    const s = st.scn;
    markStepDone();
    $("#scnFeedback").innerHTML = `<div class="verdict ok">✅ 正确！本步骤排查完成</div>
      <div class="explain"><b>💡 讲解</b><br>${esc(s.steps[st.step].explanation || "")}</div>
      <div class="scn-toolbar" style="margin-top:10px">${st.step < s.steps.length - 1 ? `<button class="btn btn-primary" id="scnNext">下一步 →</button>` : `<button class="btn btn-primary" id="wbQuiz">🏁 结案考核</button>`}</div>`;
    const nx = $("#scnNext");
    if (nx) nx.addEventListener("click", () => { st.step++; render(); });
    const qz = $("#wbQuiz");
    if (qz) qz.addEventListener("click", openQuiz);
  }

  function runCmd(cmd) {
    const s = st.scn, world = st.world, step = s.steps[st.step];
    const nCmd = norm(cmd);
    const first = nCmd.split(" ")[0] || "";

    const hit = (step.commands || []).some(c => {
      const nc = norm(c);
      return nc === nCmd || (nc.split(" ")[0] === first && nCmd.startsWith(first));
    });
    if (hit) { execLine(cmd, step.simulated_output); renderStepSuccess(); return; }

    const cmds = world.commands || {};
    const keys = Object.keys(cmds);
    let wk = keys.find(k => norm(k) === nCmd);
    if (!wk) wk = keys.find(k => norm(k).split(" ").slice(0, 2).join(" ") === nCmd.split(" ").slice(0, 2).join(" ") && nCmd.startsWith(norm(k).split(" ")[0]));
    if (wk) { execLine(cmd, cmds[wk]); $("#scnFeedback").innerHTML = ""; return; }

    const fsOut = fsCommand(nCmd, cmd);
    if (fsOut !== null) { execLine(cmd, fsOut); $("#scnFeedback").innerHTML = ""; return; }

    execLine(cmd, world.os === "windows"
      ? `'${cmd}' 不是内部或外部命令，也不是可运行的程序\n或批处理文件。`
      : `bash: ${cmd}: command not found`);
    $("#scnFeedback").innerHTML = `<div class="verdict bad">❓ 仿真环境未模拟该命令——点击「⌨️ 仿真命令面板」查看支持的命令</div>`;
  }

  function resolvePath(arg) {
    const fs = st.world.fs || {};
    const dirs = Object.keys(fs);
    const isWin = st.world.os === "windows";
    const sep = isWin ? "\\" : "/";
    let p = arg.replace(/"/g, "");
    if (!p) return null;
    if (!p.startsWith("/") && !(isWin && /^[a-zA-Z]:/.test(p))) {
      p = st.cwd.replace(/[\\/]+$/, "") + sep + p;
    }
    p = p.replace(/[\\/]+$/, "");
    const lower = p.toLowerCase();
    let dirKey = dirs.find(d => d.toLowerCase() === lower);
    let file = null;
    if (!dirKey) {
      const idx = p.lastIndexOf(sep);
      if (idx > 0) {
        const parent = p.slice(0, idx);
        dirKey = dirs.find(d => d.toLowerCase() === parent.toLowerCase());
        file = p.slice(idx + 1);
      }
      if (!dirKey) {
        dirKey = dirs.find(d => d.toLowerCase() === st.cwd.replace(/[\\/]+$/, "").toLowerCase());
        file = p;
      }
    }
    if (!dirKey) return null;
    return { dirKey, file };
  }

  function fsCommand(nCmd, raw) {
    const fs = st.world.fs || {};
    const isWin = st.world.os === "windows";
    const parts = nCmd.split(" ");
    const c0 = parts[0];
    const rawArgs = raw.trim().slice(raw.trim().indexOf(" ") + 1).trim();
    const arg2 = nCmd.replace(/^\S+\s+/, "").trim();

    if (c0 === "pwd") return st.cwd;
    if (c0 === "cd" || c0 === "cd/") {
      if (!arg2 || arg2 === "~" || arg2 === "\\") { st.cwd = st.world.prompt.replace(/[#>]\s*$/, "").trim(); return ""; }
      const r = resolvePath(rawArgs || arg2);
      if (r && !r.file && fs[r.dirKey]) { st.cwd = r.dirKey; return ""; }
      return `${isWin ? "系统找不到指定的路径。" : "bash: cd: " + arg2 + ": No such file or directory"}`;
    }
    if (c0 === "ls" || c0 === "dir" || c0.startsWith("ls ")) {
      const target = arg2 && !["-l", "-la", "-al", "-a", "-lh", "-ltr", "-lrt", "/a", "/od"].includes(arg2) ? arg2 : "";
      let dirKey;
      if (target) {
        const r = resolvePath(target);
        if (!r || r.file) return isWin ? "File Not Found" : "ls: cannot access '" + target + "': No such file or directory";
        dirKey = r.dirKey;
      } else {
        dirKey = fs[st.cwd] ? st.cwd : Object.keys(fs).find(d => d.toLowerCase() === st.cwd.toLowerCase());
        if (!dirKey) return "";
      }
      const files = Object.keys(fs[dirKey]);
      if (!files.length) return "";
      if (isWin) {
        return `${dirKey} 的目录\n\n${files.map(f => `${String((fs[dirKey][f]||"").length).padStart(12)}  ${todayStr().replace(/-/g, "/")}  ${new Date().toTimeString().slice(0,5)}    ${f}`).join("\n")}`;
      }
      return `total ${files.length * 4}\n` + files.map(f => {
        const size = (fs[dirKey][f] || "").length;
        const drwx = /\.(sh|py)$/.test(f) ? "-rwxr-xr-x" : "-rw-r--r--";
        return `${drwx} 1 root root ${String(size).padStart(6)} Sep 28 10:${String(10 + (f.length % 49)).padStart(2,"0")} ${f}`;
      }).join("\n");
    }
    if (c0 === "cat" || c0 === "type" || c0 === "more" || c0 === "less") {
      const target = rawArgs || arg2;
      if (!target) return isWin ? "必须指定文件名。" : "usage: cat file";
      const r = resolvePath(target);
      if (!r) return isWin ? "系统找不到指定的文件 " + target + "。" : `cat: ${target}: No such file or directory`;
      if (r.file === null) return isWin ? "拒绝访问。" : `cat: ${target}: Is a directory`;
      const key = Object.keys(fs[r.dirKey]).find(k => k.toLowerCase() === r.file.toLowerCase());
      if (key === undefined) return isWin ? "系统找不到指定的文件 " + target + "。" : `cat: ${target}: No such file or directory`;
      return fs[r.dirKey][key];
    }
    if (c0 === "whoami") return isWin ? "win-8f3c2b1\\admin" : "root";
    if (c0 === "hostname") return isWin ? "WIN-8F3C2B1" : "web-server";
    return null;
  }

  function openQuiz() {
    if ($("#wbStepCard .quiz-final")) return;
    const q = st.world.quiz;
    if (!q) { finish(); return; }
    $("#scnFeedback").innerHTML = "";
    $("#wbStepCard").insertAdjacentHTML("beforeend", `
      <div class="card quiz-final" style="margin-top:12px">
        <div class="card-title">🏁 结案考核 · ${esc(q.question)}</div>
        <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="key">${"ABCD"[i]}.</span>${esc(o)}</button>`).join("")}</div>
        <div id="quizFeedback"></div>
      </div>`);
    $$("#wbStepCard .quiz-final .opt").forEach(b => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      const ok = i === q.answer;
      $$("#wbStepCard .quiz-final .opt").forEach((x, j) => {
        x.classList.add(j === q.answer ? "right" : (j === i ? "wrong" : ""));
      });
      $("#quizFeedback").innerHTML = `
        <div class="verdict ${ok ? "ok" : "bad"}">${ok ? "✅ 结案正确！" : "❌ 根因判断错误，正确答案：" + "ABCD"[q.answer]}</div>
        <div class="explain"><b>💡 解析</b><br>${esc(q.explanation || "")}</div>
        <div class="scn-toolbar" style="margin-top:10px"><button class="btn btn-primary" id="wbFinish">查看完整复盘 →</button></div>`;
      $("#wbFinish").addEventListener("click", finish);
      bumpQuiz(ok);
    }));
    $("#wbStepCard").scrollIntoView({ behavior: "smooth" });
  }

  function bumpQuiz(ok) {
    const t = todayLog();
    bumpStat(s => { s.mcqDone++; if (ok) s.mcqRight++; });
    t.mcq++; saveTodayLog(t);
  }

  function finish() {
    const s = st.scn;
    bumpStat(x => { if (!x.scnDone.includes(s.id)) x.scnDone.push(s.id); });
    const t = todayLog(); t.scn++; saveTodayLog(t);
    $("#scnDetail").innerHTML = `
      <button class="btn btn-ghost" onclick="renderScnList()">← 返回场景列表</button>
      <div class="card" style="margin-top:14px">
        <div class="result-hero" style="padding:20px">
          <div class="score-num good" style="font-size:52px">🏁 处置完成</div>
          <h2 style="margin:10px 0">${esc(s.title)}</h2>
          <div class="muted">共执行 ${st.termLines.length} 条命令 · 收集线索 ${st.notes.length} 条</div>
        </div>
        ${st.notes.length ? `<div class="card-title">🚩 你收集到的线索</div><div class="summary-box" style="margin-bottom:14px">${st.notes.map(n => `<code style="font-family:var(--mono);color:var(--amber)">${esc(n.clue)}</code>`).join("　")}</div>` : ""}
        <div class="summary-box"><b style="color:var(--purple)">📌 案例复盘</b><br>${esc(s.summary || "")}</div>
        <div class="scn-toolbar"><button class="btn btn-primary" onclick="renderScnList()">💻 再练一个场景</button></div>
      </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { open };
})();
