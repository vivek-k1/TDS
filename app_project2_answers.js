"use strict";

/**
 * Project 2 helper — embedded Q1–Q4 solvers + DevTools console scripts for Q1/Q3 + optional Solana Tx scratchpad.
 */

/** Project-2 HUB solvers (embedded per question). */
const P2_SOLVER_WEB_URL = "https://p2-solver.onrender.com/web";
const P2_SOLVER_BLOCK_URL = "https://p2-solver.onrender.com/block";
const P2_SOLVER_QR_TRACE_URL = "https://p2-solver.onrender.com/qr-trace";

/** Q4 — Hugging Face Space ([P2b-question-4](https://huggingface.co/spaces/orangeleo19/P2b-question-4)). */
const P4_HF_SPACE_EMBED_URL = "https://orangeleo19-p2b-question-4.hf.space";
const P4_HF_SPACE_PAGE_URL = "https://huggingface.co/spaces/orangeleo19/P2b-question-4";

/** Paste into the exam portal DevTools console (Q1 — onion iframe harvest). */
const P2_CONSOLE_SCRIPT_Q1 = `/* OMEGA PORTAL SIPHON v4.1 (Onion-Server Targeted) */
(function() {
    console.log("%c SINGULARITY DISCOVERY ACTIVE v4.1 ", "background: #000; color: #0f0; font-weight: bold;");
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { console.error("Identity not found. Please log in first."); return; }

    let results = {
        email: user.email,
        quizSign: user.quizSign,
        mission: []
    };

    const harvest = (doc) => {
        // Look for the standard task structure inside the target frame
        doc.querySelectorAll('.question-item').forEach(item => {
            let num = item.querySelector('.q-num')?.innerText.trim() || "";
            let theme = item.querySelector('.q-theme')?.innerText.trim() || "";
            let query = item.querySelector('.q-text')?.innerText.trim() || "";
            let link = item.querySelector('.q-link')?.href || "";
            
            let folder = null;
            if (link) {
                let match = link.match(/\\.onion\\/(\\d+)\\//);
                if (match) folder = parseInt(match[1]);
            }

            if (num) {
                results.mission.push({ num, theme, query, folder, link });
            }
        });
    };

    // --- NEW TARGETED SELECTION ---
    // We look for the iframe by ID or Name: 'q-onion-scrape-server' or 'questionId'
    const selectors = [
        'iframe#q-onion-scrape-server',
        'iframe[name="q-onion-scrape-server"]',
        'iframe#questionId',
        'iframe[name="questionId"]'
    ];
    
    let targetFrame = null;
    for (let selector of selectors) {
        targetFrame = document.querySelector(selector);
        if (targetFrame) break;
    }
    
    if (targetFrame) {
        console.log("%c Target Frame Locked: " + (targetFrame.id || targetFrame.name), "color: #0f0; font-weight: bold;");
        try {
            harvest(targetFrame.contentDocument || targetFrame.contentWindow.document);
        } catch(e) {
            console.error("Access blocked by browser security (CORS). Try running this script while the iframe is focused.");
        }
    } else {
        // Absolute fallback: Search all iframes but ONLY harvest the one containing '.onion'
        console.warn("Target ID not found. Searching for Onion-linked frames...");
        document.querySelectorAll('iframe').forEach(frame => {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow.document;
                if (frameDoc.body.innerHTML.includes('.onion')) {
                    console.log("%c Auto-detected Onion Frame!", "color: #0ff;");
                    harvest(frameDoc);
                }
            } catch(e) {}
        });
    }

    if (results.mission.length === 0) {
        console.warn("CAPTURE FAILED: No tasks found in the 'q-onion-scrape-server' frame.");
    } else {
        console.log("%c SUCCESS: Q1 DATA EXTRACTED ", "color: #0ff; font-weight: bold;");
        console.log(JSON.stringify(results, null, 2));
    }
})();`;

/** Paste into the exam portal DevTools console (Q3 — damaged QR + masked signature). */
const P2_CONSOLE_SCRIPT_Q3 = `/* OMEGA PORTAL SIPHON v5.1 (Aggressive Q3 Search) */
(function() {
    console.log("%c CRYPTO-TRACE DISCOVERY ACTIVE v5.1 ", "background: #101723; color: #d9ecff; font-weight: bold;");
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { console.error("Identity not found."); return; }

    let q3Data = {
        email: user.email,
        quizSign: user.quizSign,
        type: "q3_qr_trace",
        maskedSignature: "",
        qrSvg: ""
    };

    const harvest = (doc) => {
        // Look for the QR SVG by ID
        const svgElement = doc.querySelector('svg#damaged-qr');
        // Look for the Masked Signature by the specific class
        const codeElement = doc.querySelector('.masked code');

        if (svgElement && codeElement) {
            q3Data.qrSvg = svgElement.outerHTML;
            q3Data.maskedSignature = codeElement.innerText.trim();
            return true;
        }
        return false;
    };

    // 1. Check the main document first
    let found = harvest(document);

    // 2. If not found, check all iframes
    if (!found) {
        document.querySelectorAll('iframe').forEach(frame => {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow.document;
                if (harvest(frameDoc)) {
                    found = true;
                    console.log("%c Found Q3 data in frame: " + (frame.id || frame.name || "unnamed"), "color: #0f0;");
                }
            } catch(e) {}
        });
    }

    if (found) {
        console.log("%c Q3 DATA CAPTURED SUCCESSFULLY ", "color: #0ff; font-weight: bold;");
        console.log(JSON.stringify(q3Data, null, 2));
    } else {
        console.error("CAPTURE FAILED: Could not find the Damaged QR or the Masked Signature. Ensure the Q3 mission is visible on your screen.");
    }
})();`;

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
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
            Use the embedded tools for Q1–Q4. Complete the Devnet transfer in <strong>Q2</strong>, then paste your transaction signature below if you want a local copy buffer.
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">1</div>
        <div class="flex-grow-1">
          <div class="q-title">Q1 · Web scraping solver</div>
          <div class="q-filter mt-1">
            <strong>Web Scraping Solver</strong> — paste mission JSON from the exam below. If the frame is blank,
            <a href="${P2_SOLVER_WEB_URL}" target="_blank" rel="noopener" class="text-warning">open <span class="font-monospace small">${escapeHtml(P2_SOLVER_WEB_URL)}</span></a>.
          </div>
          <div class="mt-2 rounded overflow-hidden border border-secondary shadow-sm" style="background: rgba(15, 23, 42, 0.85)">
            <iframe
              id="p2-solver-q1-frame"
              src="${P2_SOLVER_WEB_URL}"
              title="Q1 — Web Scraping Solver (Project-2 HUB)"
              class="w-100 d-block"
              style="min-height: 520px; height: min(62vh, 780px); border: 0"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allow="clipboard-write; fullscreen"
            ></iframe>
          </div>
          <p class="small text-muted mt-2 mb-0">
            Copy the script below → <strong>DevTools → Console</strong> on the <em>exam portal</em> (logged in) → paste the printed JSON into the solver above.
          </p>
          <div class="mt-3">
            <div class="answer-label">Q1 — console script (OMEGA PORTAL SIPHON v4.1)</div>
            <textarea id="p2-console-q1" class="form-control font-monospace small mt-1" rows="14" spellcheck="false" readonly style="resize: vertical"></textarea>
            <button type="button" class="copy-btn mt-1" id="p2-copy-console-q1">Copy Q1 script</button>
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">2</div>
        <div class="flex-grow-1">
          <div class="q-title">Q2 · Blockchain vault transfer</div>
          <div class="q-filter mt-1">
            <strong>Blockchain Vault Transfer</strong> — enter exam fields and send on Devnet (respect the one-shot policy on the tool). If the frame is blank,
            <a href="${P2_SOLVER_BLOCK_URL}" target="_blank" rel="noopener" class="text-warning">open in a new tab</a>.
          </div>
          <div class="mt-2 rounded overflow-hidden border border-secondary shadow-sm" style="background: rgba(15, 23, 42, 0.85)">
            <iframe
              id="p2-solver-q2-frame"
              src="${P2_SOLVER_BLOCK_URL}"
              title="Q2 — Blockchain Vault Transfer (Project-2 HUB)"
              class="w-100 d-block"
              style="min-height: 560px; height: min(68vh, 880px); border: 0"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allow="clipboard-write; fullscreen"
            ></iframe>
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">3</div>
        <div class="flex-grow-1">
          <div class="q-title">Q3 · QR-Trace Solana Solver</div>
          <div class="q-filter mt-1">
            Repair damaged QR codes and trace Solana Devnet transactions. If the frame is blank,
            <a href="${P2_SOLVER_QR_TRACE_URL}" target="_blank" rel="noopener" class="text-warning">open <span class="font-monospace small">${escapeHtml(P2_SOLVER_QR_TRACE_URL)}</span></a>.
          </div>
          <div class="mt-2 rounded overflow-hidden border border-secondary shadow-sm" style="background: rgba(15, 23, 42, 0.85)">
            <iframe
              id="p2-solver-q3-frame"
              src="${P2_SOLVER_QR_TRACE_URL}"
              title="Q3 — QR-Trace Solana Solver (Project-2 HUB)"
              class="w-100 d-block"
              style="min-height: 520px; height: min(62vh, 780px); border: 0"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allow="clipboard-write; fullscreen"
            ></iframe>
          </div>
          <p class="small text-muted mt-2 mb-0">
            Copy the script below → <strong>DevTools → Console</strong> on the exam portal → paste mission JSON into the solver above.
          </p>
          <div class="mt-3">
            <div class="answer-label">Q3 — console script (OMEGA PORTAL SIPHON v5.1)</div>
            <textarea id="p2-console-q3" class="form-control font-monospace small mt-1" rows="12" spellcheck="false" readonly style="resize: vertical"></textarea>
            <button type="button" class="copy-btn mt-1" id="p2-copy-console-q3">Copy Q3 script</button>
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">4</div>
        <div class="flex-grow-1">
          <div class="q-title">Q4 · IITM Discourse KB Solver</div>
          <div class="q-filter mt-1">
            Embedded Hugging Face Space — interactive solver with substantial UI. If the frame is blank or slow to load,
            <a href="${P4_HF_SPACE_PAGE_URL}" target="_blank" rel="noopener" class="text-warning">open the Space in a new tab</a>
            (<span class="font-monospace small">${escapeHtml(P4_HF_SPACE_PAGE_URL)}</span>).
          </div>
          <div class="mt-2 rounded overflow-hidden border border-secondary shadow-sm" style="background: rgba(15, 23, 42, 0.85)">
            <iframe
              id="p2-hf-q4-frame"
              src="${P4_HF_SPACE_EMBED_URL}"
              title="Q4 — IITM Discourse KB Solver (Hugging Face Space)"
              class="w-100 d-block"
              style="min-height: 800px; height: min(88vh, 1200px); border: 0"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; microphone; camera"
            ></iframe>
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
            Send the exact lamports/SOL and memo to the vault shown in your portal, then paste the transaction signature.
          </div>

          <div class="mt-3">
            <div class="answer-label">Exam email</div>
            <input id="p2-email" class="form-control" placeholder="you@ds.study.iitm.ac.in" autocomplete="off" spellcheck="false" />
          </div>
          <div class="mt-2">
            <div class="answer-label">quizSign (optional, from exam URL if present)</div>
            <input id="p2-quiz-sign" class="form-control font-monospace" placeholder="" autocomplete="off" spellcheck="false" />
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

  const taQ1 = document.getElementById("p2-console-q1");
  const taQ3 = document.getElementById("p2-console-q3");
  if (taQ1) taQ1.value = P2_CONSOLE_SCRIPT_Q1;
  if (taQ3) taQ3.value = P2_CONSOLE_SCRIPT_Q3;

  document.getElementById("p2-copy-console-q1")?.addEventListener("click", () => {
    const el = document.getElementById("p2-console-q1");
    copyText(document.getElementById("p2-copy-console-q1"), el ? el.value : P2_CONSOLE_SCRIPT_Q1);
  });
  document.getElementById("p2-copy-console-q3")?.addEventListener("click", () => {
    const el = document.getElementById("p2-console-q3");
    copyText(document.getElementById("p2-copy-console-q3"), el ? el.value : P2_CONSOLE_SCRIPT_Q3);
  });

  document.getElementById("p2-copy-tx")?.addEventListener("click", () => {
    copyText(document.getElementById("p2-copy-tx"), document.getElementById("p2-tx-id").value.trim());
  });

  results.style.display = "block";
});
