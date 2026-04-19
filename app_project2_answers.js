"use strict";

/**
 * Project 2 helper — Onion scraping JSON (task1–task12) + Solana Devnet crypto transfer.
 * questionData is served from the exam origin (session cookie). From Streamlit / file://,
 * fetch usually fails CORS or 403 — paste the Network response body instead.
 */
const P2_EXAM_ORIGIN = "https://exam.sanand.workers.dev";
const P2_EXAM_PAGE = `${P2_EXAM_ORIGIN}/tds-2026-01-p2`;
const Q_ONION = "q-onion-scrape-server";
const Q_CRYPTO = "q-crypto-transfers-server";

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
}

function normEmail(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

async function copyText(btn, text) {
  const label = btn?.textContent;
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = label;
      }, 1400);
    }
    return true;
  } catch {
    if (btn) btn.textContent = "Copy failed";
    return false;
  }
}

function buildQuestionDataUrl(email, quizSign, questionId) {
  const p = new URLSearchParams();
  p.set("email", email.trim());
  p.set("quizSign", quizSign ?? "");
  p.set("questionId", questionId);
  return `${P2_EXAM_ORIGIN}/questionData?${p.toString()}`;
}

/** Recursively collect task1..task12 from any JSON shape. */
function deepCollectTasks(obj, bag) {
  if (obj == null) return bag;
  const t = typeof obj;
  if (t === "string") {
    const s = obj.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        deepCollectTasks(JSON.parse(s), bag);
      } catch {
        /* ignore */
      }
    }
    return bag;
  }
  if (t !== "object") return bag;
  if (Array.isArray(obj)) {
    for (const x of obj) deepCollectTasks(x, bag);
    return bag;
  }
  for (const [k, v] of Object.entries(obj)) {
    const m = /^task(\d+)$/i.exec(k);
    if (m && v != null && String(v).trim() !== "") {
      bag[`task${m[1]}`] = String(v).trim();
    } else {
      deepCollectTasks(v, bag);
    }
  }
  return bag;
}

function extractTasksFromHtmlString(html) {
  const bag = {};
  for (let i = 1; i <= 12; i++) {
    const re = new RegExp(`["']task${i}["']\\s*:\\s*["']([^"']*)["']`, "i");
    const m = re.exec(html);
    if (m) bag[`task${i}`] = m[1];
  }
  return bag;
}

function parseHtmlEmbeddedJsonBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const chunk = m[1].trim();
    if (chunk) {
      try {
        out.push(JSON.parse(chunk));
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function scrapeTasksFromDom(doc) {
  const bag = {};
  for (let i = 1; i <= 12; i++) {
    const sel = [
      `[data-task="${i}"]`,
      `[data-task-id="${i}"]`,
      `#task${i}`,
      `[id="task${i}"]`,
    ];
    for (const s of sel) {
      const el = doc.querySelector(s);
      if (el) {
        const ans =
          el.getAttribute("data-answer") ||
          el.getAttribute("data-value") ||
          el.textContent;
        if (ans && String(ans).trim()) {
          bag[`task${i}`] = String(ans).trim();
          break;
        }
      }
    }
  }
  return bag;
}

/**
 * Merge strategies: nested JSON keys, regex on raw text, HTML DOM, embedded JSON scripts.
 */
function computeOnionTasksFromRaw(raw) {
  const merged = {};
  const text = String(raw ?? "").trim();
  if (!text) return merged;

  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object") {
    deepCollectTasks(parsed, merged);
    const html =
      typeof parsed.html === "string"
        ? parsed.html
        : typeof parsed.body === "string"
          ? parsed.body
          : typeof parsed.content === "string"
            ? parsed.content
            : null;
    if (html) {
      Object.assign(merged, extractTasksFromHtmlString(html));
      try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        Object.assign(merged, scrapeTasksFromDom(doc));
      } catch {
        /* ignore */
      }
      for (const block of parseHtmlEmbeddedJsonBlocks(html)) {
        deepCollectTasks(block, merged);
      }
    }
  }

  Object.assign(merged, extractTasksFromHtmlString(text));
  try {
    const doc = new DOMParser().parseFromString(text, "text/html");
    Object.assign(merged, scrapeTasksFromDom(doc));
  } catch {
    /* not HTML */
  }
  for (const block of parseHtmlEmbeddedJsonBlocks(text)) {
    deepCollectTasks(block, merged);
  }

  return merged;
}

function buildOnionSubmissionJson(taskMap) {
  const o = {};
  for (let i = 1; i <= 12; i++) {
    const k = `task${i}`;
    o[k] = taskMap[k] != null && String(taskMap[k]).trim() !== "" ? String(taskMap[k]).trim() : "";
  }
  return o;
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function flattenForCrypto(obj, out = {}) {
  if (obj == null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    for (const x of obj) flattenForCrypto(x, out);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v !== null) flattenForCrypto(v, out);
    else out[k] = v;
  }
  return out;
}

function summarizeCryptoPayload(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { flat: {}, display: {} };
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { flat: {}, display: {} };
  }
  const flat = flattenForCrypto(parsed, {});
  const display = {
    vault: pickFirst(flat, ["vault", "vaultAddress", "recipient", "to", "destination"]),
    memo: pickFirst(flat, ["memo", "memoText", "uniqueMemo", "memoCode", "code"]),
    lamports: pickFirst(flat, ["lamports", "amountLamports"]),
    amountSol: pickFirst(flat, ["amountSol", "sol", "amount_sol"]),
    raw: parsed,
  };
  return { flat, display };
}

document.addEventListener("DOMContentLoaded", () => {
  const results = document.getElementById("results");
  if (!results) return;

  results.innerHTML = `
    <h2 class="mb-3" style="font-weight:700;letter-spacing:-0.03em;color:#fed7aa">Project 2 Helper</h2>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">?</div>
        <div class="flex-grow-1">
          <div class="q-title">How this works</div>
          <div class="q-filter mt-1">
            The exam loads personalized data from
            <code class="small">/questionData</code> (same origin as the exam). Embedded here, your browser usually
            cannot call that API with your session cookie (cross-site). Copy the response from DevTools → Network while
            on the exam page, then paste below. This tool extracts <code>task1</code>–<code>task12</code> from JSON or HTML
            when the answers are embedded, and builds the submission JSON for you.
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">◎</div>
        <div class="flex-grow-1">
          <div class="q-title">Onion scraping challenge (<code>q-onion-scrape-server</code>)</div>
          <div class="q-filter mt-1">Weighted 12 marks — JSON payload with <code>task1</code> … <code>task12</code>.</div>

          <div class="mt-3">
            <div class="answer-label">Exam email</div>
            <input id="p2-email" class="form-control" placeholder="you@ds.study.iitm.ac.in" autocomplete="off" spellcheck="false" />
          </div>
          <div class="mt-2">
            <div class="answer-label">quizSign (optional, from exam URL if present)</div>
            <input id="p2-quiz-sign" class="form-control font-monospace" placeholder="" autocomplete="off" spellcheck="false" />
          </div>
          <div class="mt-2 small text-muted">
            Direct API URL (open on the exam origin if needed):
            <div class="answer-json mt-1" id="p2-onion-url">—</div>
            <button type="button" class="copy-btn mt-1" id="p2-copy-onion-url">Copy URL</button>
          </div>

          <div class="mt-3 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" class="btn btn-sm btn-outline-warning" id="p2-fetch-onion" style="border-radius:999px;">
              Try fetch questionData
            </button>
            <span class="small text-muted" id="p2-fetch-onion-status"></span>
          </div>

          <div class="mt-3">
            <div class="answer-label">Paste raw response (JSON or HTML from Network → questionData)</div>
            <textarea id="p2-onion-paste" class="form-control font-monospace" rows="8" spellcheck="false" placeholder='Paste the full response body here…'></textarea>
          </div>
          <div class="mt-2 d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-sm btn-accent-p2" id="p2-parse-onion">Parse &amp; fill tasks</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="p2-clear-onion-paste" style="border-radius:999px;">Clear paste</button>
          </div>

          <div class="mt-3">
            <div class="answer-label">Tasks (edit if needed)</div>
            <div class="row g-2" id="p2-task-inputs"></div>
          </div>

          <div class="mt-3">
            <div class="answer-label">Submission JSON (onion question)</div>
            <pre class="answer-json mb-1" id="p2-onion-json">{}</pre>
            <button type="button" class="copy-btn" id="p2-copy-onion-json">Copy JSON</button>
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">⬡</div>
        <div class="flex-grow-1">
          <div class="q-title">Solana Devnet transfer (<code>q-crypto-transfers-server</code>)</div>
          <div class="q-filter mt-1">
            3 marks — send the exact lamports/SOL and memo to the vault shown in your portal, then paste the transaction signature.
          </div>

          <div class="mt-2 small text-muted">
            questionData URL:
            <div class="answer-json mt-1" id="p2-crypto-url">—</div>
            <button type="button" class="copy-btn mt-1" id="p2-copy-crypto-url">Copy URL</button>
          </div>

          <div class="mt-3">
            <div class="answer-label">Paste crypto questionData JSON</div>
            <textarea id="p2-crypto-paste" class="form-control font-monospace" rows="6" spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" class="btn btn-sm btn-accent-p2" id="p2-parse-crypto">Extract fields</button>
          </div>

          <div class="mt-3 answer-value" id="p2-crypto-summary" style="border-color:rgba(249,115,22,0.5);background:rgba(127,29,29,0.25);color:#ffedd5;">
            Paste JSON and click Extract fields.
          </div>

          <div class="mt-3">
            <div class="answer-label">Transaction signature (base58) — paste after you send on Devnet</div>
            <textarea id="p2-tx-id" class="form-control font-monospace" rows="2" spellcheck="false" placeholder="5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"></textarea>
            <button type="button" class="copy-btn mt-1" id="p2-copy-tx">Copy TxID</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const emailEl = document.getElementById("p2-email");
  const quizEl = document.getElementById("p2-quiz-sign");
  const onionUrlEl = document.getElementById("p2-onion-url");
  const cryptoUrlEl = document.getElementById("p2-crypto-url");
  const taskRow = document.getElementById("p2-task-inputs");
  const onionJsonEl = document.getElementById("p2-onion-json");
  const onionPaste = document.getElementById("p2-onion-paste");

  function refreshUrls() {
    const em = normEmail(emailEl.value) || "you@example.com";
    const qz = quizEl.value || "";
    onionUrlEl.textContent = buildQuestionDataUrl(em, qz, Q_ONION);
    cryptoUrlEl.textContent = buildQuestionDataUrl(em, qz, Q_CRYPTO);
  }

  for (let i = 1; i <= 12; i++) {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3";
    col.innerHTML = `
      <label class="small text-muted mb-0" for="p2-task-${i}">task${i}</label>
      <input class="form-control form-control-sm font-monospace" id="p2-task-${i}" spellcheck="false" autocomplete="off" />
    `;
    taskRow.appendChild(col);
  }

  function readTaskMapFromInputs() {
    const m = {};
    for (let i = 1; i <= 12; i++) {
      const el = document.getElementById(`p2-task-${i}`);
      if (el) m[`task${i}`] = el.value.trim();
    }
    return m;
  }

  function applyTaskMapToInputs(taskMap) {
    for (let i = 1; i <= 12; i++) {
      const el = document.getElementById(`p2-task-${i}`);
      const v = taskMap[`task${i}`];
      if (el && v != null && String(v).trim() !== "") el.value = String(v).trim();
    }
  }

  function refreshOnionJson() {
    const j = buildOnionSubmissionJson(readTaskMapFromInputs());
    onionJsonEl.textContent = JSON.stringify(j, null, 2);
  }

  emailEl.addEventListener("input", refreshUrls);
  quizEl.addEventListener("input", refreshUrls);
  taskRow.addEventListener("input", refreshOnionJson);

  document.getElementById("p2-copy-onion-url").addEventListener("click", () => {
    copyText(document.getElementById("p2-copy-onion-url"), onionUrlEl.textContent);
  });
  document.getElementById("p2-copy-crypto-url").addEventListener("click", () => {
    copyText(document.getElementById("p2-copy-crypto-url"), cryptoUrlEl.textContent);
  });

  document.getElementById("p2-parse-onion").addEventListener("click", () => {
    const merged = computeOnionTasksFromRaw(onionPaste.value);
    applyTaskMapToInputs(merged);
    refreshOnionJson();
  });

  document.getElementById("p2-clear-onion-paste").addEventListener("click", () => {
    onionPaste.value = "";
  });

  document.getElementById("p2-copy-onion-json").addEventListener("click", () => {
    copyText(document.getElementById("p2-copy-onion-json"), onionJsonEl.textContent);
  });

  document.getElementById("p2-fetch-onion").addEventListener("click", async () => {
    const st = document.getElementById("p2-fetch-onion-status");
    st.textContent = "Fetching…";
    const url = buildQuestionDataUrl(normEmail(emailEl.value) || "test@example.com", quizEl.value || "", Q_ONION);
    try {
      const r = await fetch(url, { method: "GET", mode: "cors", credentials: "omit" });
      const txt = await r.text();
      st.textContent = `HTTP ${r.status} (${txt.length} bytes)`;
      if (r.ok || txt) onionPaste.value = txt;
    } catch (e) {
      st.textContent = `Failed: ${e?.message || e}. Paste from Network instead.`;
    }
  });

  document.getElementById("p2-parse-crypto").addEventListener("click", () => {
    const { display } = summarizeCryptoPayload(document.getElementById("p2-crypto-paste").value);
    const box = document.getElementById("p2-crypto-summary");
    if (!display || (!display.vault && !display.memo)) {
      box.innerHTML = escapeHtml(
        "Could not find vault/memo fields. Keys seen: paste valid JSON from questionData."
      );
      return;
    }
    box.innerHTML = `
      <div><strong>Vault / recipient</strong><br/>${escapeHtml(String(display.vault ?? "—"))}</div>
      <div class="mt-2"><strong>Memo</strong><br/>${escapeHtml(String(display.memo ?? "—"))}</div>
      <div class="mt-2"><strong>Lamports</strong> ${escapeHtml(String(display.lamports ?? "—"))}</div>
      <div class="mt-1"><strong>amountSol</strong> ${escapeHtml(String(display.amountSol ?? "—"))}</div>
    `;
  });

  document.getElementById("p2-copy-tx").addEventListener("click", () => {
    copyText(document.getElementById("p2-copy-tx"), document.getElementById("p2-tx-id").value.trim());
  });

  refreshUrls();
  refreshOnionJson();
  results.style.display = "block";
});
