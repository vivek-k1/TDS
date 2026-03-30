"use strict";

// Project 1 Helper: Question 2
// The exam regenerates an audio sample on load. We fetch the latest `{data, hash}`,
// show the audio, then let you paste the 300-digit transcription.
// The helper verifies SHA-256 locally and produces the exact submission JSON.

const PROJECT1_Q2 = {
  digits: 300,
  // Must match the exam's `encodeURIComponent("0,1,2,...,9")`.
  fParam: "0,1,2,3,4,5,6,7,8,9",
  audiosampleUrl: "https://exam.sanand.workers.dev/audiosample"
};

// Hardcoded answer for Project 1 Q2.
const HARDCODED_P1_Q2 = {
  number:
    "888966373578893736753542814366436653014359064432560395155516805761370064769408679980401917550064170438958834176532073479464504950659230315598464365159857583304844156500083330419465558017038632710504636849044634634248182118461995752601184712391013387432030786881212933196108547788828153967807484340883",
  hash: "e0c2a3853807ef5c43427007b59fca93cdbf4a8ae5b0d6cfa374b3130192e8c8"
};

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
}

async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clampDigits(value) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

async function loadAudioSample() {
  const url = `${PROJECT1_Q2.audiosampleUrl}?n=${PROJECT1_Q2.digits}&f=${encodeURIComponent(
    PROJECT1_Q2.fParam
  )}`;
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new Error(`audiosample HTTP ${res.status}`);
  const j = await res.json();
  if (typeof j?.data !== "string" || typeof j?.hash !== "string") {
    throw new Error("Invalid /audiosample response (expected {data, hash}).");
  }
  return j;
}

function setCopyButtonState(btn, text, ok) {
  btn.textContent = ok ? "Copied!" : "Copy failed";
  btn.style.borderColor = ok ? "#22c55e" : "#ef4444";
  btn.style.color = ok ? "#bbf7d0" : "#fecaca";
  btn.disabled = false;
  setTimeout(() => {
    btn.textContent = text;
    btn.style.borderColor = "";
    btn.style.color = "";
  }, 1500);
}

document.addEventListener("DOMContentLoaded", async () => {
  const results = document.getElementById("results");
  if (!results) return;

  results.innerHTML = `
    <h2 class="mb-4" style="font-weight:700;letter-spacing:-0.03em">Project 1 Helper</h2>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">1</div>
        <div class="flex-grow-1">
          <div class="q-title">Secret Agent Password Exchange</div>
          <div class="q-filter mt-1">Auto-compute your agent ID/password and target agent IDs from your exam email.</div>

          <div class="mt-3">
            <div class="answer-label">Your exam email</div>
            <input id="p1-email" class="form-control" placeholder="you@ds.study.iitm.ac.in" autocomplete="off" spellcheck="false" />
          </div>

          <div class="mt-3">
            <div class="answer-label">Your agent ID</div>
            <div class="answer-value" id="p1-own-id">—</div>
          </div>

          <div class="mt-3">
            <div class="answer-label">Your password</div>
            <div class="answer-value" id="p1-own-pass">—</div>
          </div>

          <div class="mt-3">
            <div class="answer-label">Target agent IDs</div>
            <div class="answer-value" id="p1-target-ids">—</div>
          </div>

          <div class="mt-3">
            <div class="answer-label">Submission JSON template (fill emails+passwords you collected)</div>
            <div class="answer-json" id="p1-q1-json">Enter email above.</div>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-q1-copy" class="copy-btn" disabled>Copy JSON</button>
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">2</div>
        <div class="flex-grow-1">
          <div class="q-title">${escapeHtml(PROJECT1_Q2.digits + "-digit number & SHA-256 hash")}</div>
          <div class="q-filter mt-1">Submission JSON: {"number":"(300 digit)","hash":"sha256-hex"}</div>

          <div class="mt-3">
            <div class="answer-label">Expected SHA-256 hash (for current audio sample)</div>
            <input id="p1-q2-hash" class="form-control font-monospace" readonly spellcheck="false" />
          </div>

          <div class="mt-3" id="p1-q2-audio-slot"></div>

          <div class="mt-3">
            <div class="answer-label">Paste the transcribed 300 digits</div>
            <textarea
              id="p1-q2-number"
              class="form-control font-monospace"
              rows="4"
              placeholder="Paste exactly 300 digits (no spaces)."
              spellcheck="false"
            ></textarea>
          </div>

          <div class="mt-3 d-flex align-items-center gap-3 flex-wrap">
            <button
              type="button"
              id="p1-q2-generate"
              class="btn btn-sm btn-outline-success"
              style="border-radius:999px;"
            >
              Generate submission JSON
            </button>
            <button type="button" id="p1-q2-copy" class="copy-btn" disabled>
              Copy JSON
            </button>
            <div id="p1-q2-status" class="small" style="min-width:220px;"></div>
          </div>

          <div class="mt-3">
            <div class="answer-label">Submission JSON</div>
            <div class="answer-json" id="p1-q2-json" style="display:none;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const hashInput = document.getElementById("p1-q2-hash");
  const numberInput = document.getElementById("p1-q2-number");
  const statusEl = document.getElementById("p1-q2-status");
  const jsonEl = document.getElementById("p1-q2-json");
  const audioSlot = document.getElementById("p1-q2-audio-slot");
  const generateBtn = document.getElementById("p1-q2-generate");
  const copyBtn = document.getElementById("p1-q2-copy");

  function normEmail(s) {
    return String(s ?? "").trim().toLowerCase();
  }

  function pad3(n) {
    const v = Number.parseInt(String(n), 10);
    return String(v).padStart(3, "0");
  }

  function seedrandomOrThrow(seed) {
    if (typeof Math.seedrandom !== "function") {
      throw new Error("seedrandom is not loaded.");
    }
    return new Math.seedrandom(seed);
  }

  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Mirrors Project 1 exam logic.
  const SHARE_SECRET_QID = "q-share-secret-server";
  const SHARE_SECRET_SALT = "tds-share-secret-default-salt";

  async function shareSecretPassword(email, salt = SHARE_SECRET_SALT) {
    const hex = await sha256Hex(`${SHARE_SECRET_QID}#${salt}#${email}`);
    return hex.slice(0, 16);
  }

  function ownAgentId(email) {
    const t = seedrandomOrThrow(`${SHARE_SECRET_QID}#agent-id#${email}`);
    return pad3(Math.floor(t() * 100));
  }

  function targetAgentIds(email, n = 3) {
    const own = Number.parseInt(ownAgentId(email), 10);
    const ids = Array.from({ length: 100 }, (_, i) => i).filter((i) => i !== own).map(pad3);
    const t = seedrandomOrThrow(`${SHARE_SECRET_QID}#targets#${email}`);
    shuffleInPlace(ids, t);
    return ids.slice(0, n);
  }

  const emailInput = document.getElementById("p1-email");
  const ownIdEl = document.getElementById("p1-own-id");
  const ownPassEl = document.getElementById("p1-own-pass");
  const targetsEl = document.getElementById("p1-target-ids");
  const q1JsonEl = document.getElementById("p1-q1-json");
  const q1CopyBtn = document.getElementById("p1-q1-copy");

  async function renderQ1() {
    const email = normEmail(emailInput?.value);
    q1CopyBtn.disabled = true;
    if (!email) {
      ownIdEl.textContent = "—";
      ownPassEl.textContent = "—";
      targetsEl.textContent = "—";
      q1JsonEl.textContent = "Enter email above.";
      return;
    }
    const ownId = ownAgentId(email);
    const ownPass = await shareSecretPassword(email);
    const targets = targetAgentIds(email, 3);

    ownIdEl.textContent = ownId;
    ownPassEl.textContent = ownPass;
    targetsEl.textContent = targets.join(", ");

    const template = targets.map((id) => ({ agent_id: id, email: "", password: "" }));
    q1JsonEl.textContent = JSON.stringify(template, null, 2);
    q1CopyBtn.disabled = false;
  }

  emailInput?.addEventListener("input", () => {
    renderQ1().catch(() => {});
  });

  q1CopyBtn?.addEventListener("click", async () => {
    if (q1CopyBtn.disabled) return;
    const text = q1JsonEl.textContent.trim();
    if (!text) return;
    q1CopyBtn.disabled = true;
    const original = "Copy JSON";
    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonState(q1CopyBtn, original, true);
    } catch {
      setCopyButtonState(q1CopyBtn, original, false);
    }
  });

  const setStatus = (msg, color) => {
    statusEl.textContent = msg;
    statusEl.style.color = color;
  };

  generateBtn.disabled = true;
  copyBtn.disabled = true;
  setStatus("Hardcoded Q2 answer loaded. JSON ready.", "#bbf7d0");

  hashInput.value = HARDCODED_P1_Q2.hash;
  numberInput.value = HARDCODED_P1_Q2.number;

  audioSlot.innerHTML = `<div class="form-text">Audio not loaded (hardcoded helper).</div>`;

  const submission = JSON.stringify({
    number: HARDCODED_P1_Q2.number,
    hash: HARDCODED_P1_Q2.hash
  });
  jsonEl.textContent = submission;
  jsonEl.style.display = "block";
  copyBtn.disabled = false;
  generateBtn.disabled = false;

  copyBtn.addEventListener("click", async () => {
    if (copyBtn.disabled) return;
    const text = jsonEl.textContent.trim();
    if (!text) return;
    copyBtn.disabled = true;
    const original = "Copy JSON";

    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonState(copyBtn, original, true);
    } catch {
      setCopyButtonState(copyBtn, original, false);
    }
  });

  generateBtn.addEventListener("click", async () => {
    const digits = clampDigits(numberInput.value);
    const hash = String(hashInput.value ?? "").trim().toLowerCase();

    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
      setStatus("Hash not loaded yet (or invalid).", "#fca5a5");
      return;
    }
    if (!digits || digits.length !== PROJECT1_Q2.digits) {
      setStatus(`Number must be exactly ${PROJECT1_Q2.digits} digits.`, "#fca5a5");
      return;
    }

    generateBtn.disabled = true;
    setStatus("Computing SHA-256...", "#93c5fd");

    try {
      const computedHash = await sha256Hex(digits);
      const ok = computedHash === hash;

      setStatus(ok ? "Hash matches. JSON ready." : "Hash mismatch. Check transcription.", ok ? "#bbf7d0" : "#fca5a5");

      const submission = JSON.stringify({ number: digits, hash });
      jsonEl.textContent = submission;
      jsonEl.style.display = "block";
      copyBtn.disabled = !ok;
    } finally {
      generateBtn.disabled = false;
    }
  });
});

