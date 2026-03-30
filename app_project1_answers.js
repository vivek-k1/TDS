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

  const PR_MERGE_MIN_UTC = Date.parse("2026-02-10T23:59:59.999Z");
  const IMAGE_MIN_SHORT_SIDE = 1024;
  const IMAGE_EXTS = [".png", ".jpg", ".webp", ".avif"];

  // Embedded in the exam bundle. Used to verify ES256 JWT signatures locally.
  const GAME_JWKS = {
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        use: "sig",
        kid: "tds-2025",
        x: "53HZMYemLsYLHdNRRtYVRAHtDhCbcv8jJdupXH810Zk",
        y: "BqkOYJibv8XR-HxlDBeZ11jeEivqTwYa6Bv6eHc3Q3E"
      }
    ]
  };

  const IMAGE_SCHEMAS = {
    "q-generate-affective-chart": {
      title: "Image: The Affective Chart",
      fields: ["prompt", "model", "dataset_name", "dataset_url", "insight"]
    },
    "q-generate-concept-incarnation": {
      title: "Image: The Concept Incarnation",
      fields: ["prompt", "model", "concept", "metaphor"]
    },
    "q-generate-style-transplant": {
      title: "Image: The Style Transplant",
      fields: ["prompt", "model", "concept", "tradition_name", "tradition_period", "tradition_approach"],
      maxWords: { tradition_approach: 40 }
    },
    "q-generate-paradox-portrait": {
      title: "Image: The Paradox Portrait",
      fields: ["prompt", "model", "paradox", "visual_logic"],
      maxWords: { visual_logic: 40 }
    }
  };

  results.innerHTML = `
    <h2 class="mb-3" style="font-weight:700;letter-spacing:-0.03em">Project 1 Helper</h2>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">✓</div>
        <div class="flex-grow-1">
          <div class="q-title">Compute / Validate All</div>
          <div class="q-filter mt-1">Computes what is computable (Q1/Q2) and validates filled fields for the manual questions.</div>
          <div class="mt-3">
            <div class="answer-label">Optional: GitHub token (for Q3 checks only)</div>
            <input
              id="p1-gh-token"
              type="password"
              class="form-control"
              placeholder="ghp_... (stored locally in your browser, used only for api.github.com)"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="form-text">Use a PAT with minimal scope (classic: <code>public_repo</code>). Do not paste your password.</div>
          </div>
          <div class="mt-3 d-flex align-items-center gap-3 flex-wrap">
            <button type="button" id="p1-run-all" class="btn btn-sm btn-outline-success" style="border-radius:999px;">
              Compute / Validate All
            </button>
            <div id="p1-run-all-status" class="small"></div>
          </div>
          <div class="mt-3">
            <div class="answer-label">Checklist</div>
            <div class="answer-json" id="p1-run-all-report" style="white-space:pre-wrap;">Click the button above.</div>
          </div>
        </div>
      </div>
    </div>

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

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">3</div>
        <div class="flex-grow-1">
          <div class="q-title">Get a Small Open-Source PR Merged</div>
          <div class="q-filter mt-1">Paste the merged PR URL. The helper validates format and can also check stars + merge timestamp via GitHub API (public repos only).</div>
          <div class="mt-3">
            <div class="answer-label">Merged PR URL</div>
            <input id="p1-pr-url" class="form-control" placeholder="https://github.com/OWNER/REPO/pull/123" autocomplete="off" spellcheck="false" />
          </div>
          <div class="mt-2">
            <button type="button" id="p1-pr-check" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Validate via GitHub API</button>
          </div>
          <div class="mt-3 small" id="p1-pr-status"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">4</div>
        <div class="flex-grow-1">
          <div class="q-title">CommonMark Parser in Pure Python</div>
          <div class="q-filter mt-1">Not auto-solvable here. You must submit Python code that defines <code>parse_markdown(markdown)</code>.</div>
          <div class="mt-3 small">
            Open the official Project 1 page and work on the parser there:
            <a href="https://exam.sanand.workers.dev/tds-2026-01-p1" target="_blank" rel="noopener">Project 1 exam</a>.
          </div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">5</div>
        <div class="flex-grow-1">
          <div class="q-title">Image: The Affective Chart</div>
          <div class="q-filter mt-1">Submit: image URL + JSON URL. This validates CORS, image dimensions, and JSON schema.</div>
          <div class="mt-3">
            <div class="answer-label">Submission URLs</div>
            <textarea id="p1-img-urls-affective" class="form-control font-monospace" rows="3" placeholder="https://.../image.png  https://.../submission.json" spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-img-check-affective" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Validate URLs</button>
          </div>
          <div class="mt-3 small" id="p1-img-status-affective"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">6</div>
        <div class="flex-grow-1">
          <div class="q-title">Image: The Concept Incarnation</div>
          <div class="q-filter mt-1">Submit: image URL + JSON URL. This validates CORS, image dimensions, and JSON schema.</div>
          <div class="mt-3">
            <div class="answer-label">Submission URLs</div>
            <textarea id="p1-img-urls-concept" class="form-control font-monospace" rows="3" placeholder="https://.../image.png  https://.../submission.json" spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-img-check-concept" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Validate URLs</button>
          </div>
          <div class="mt-3 small" id="p1-img-status-concept"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">7</div>
        <div class="flex-grow-1">
          <div class="q-title">Image: The Style Transplant</div>
          <div class="q-filter mt-1">Submit: image URL + JSON URL. This validates CORS, image dimensions, and JSON schema.</div>
          <div class="mt-3">
            <div class="answer-label">Submission URLs</div>
            <textarea id="p1-img-urls-style" class="form-control font-monospace" rows="3" placeholder="https://.../image.png  https://.../submission.json" spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-img-check-style" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Validate URLs</button>
          </div>
          <div class="mt-3 small" id="p1-img-status-style"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">8</div>
        <div class="flex-grow-1">
          <div class="q-title">Image: The Paradox Portrait</div>
          <div class="q-filter mt-1">Submit: image URL + JSON URL. This validates CORS, image dimensions, and JSON schema.</div>
          <div class="mt-3">
            <div class="answer-label">Submission URLs</div>
            <textarea id="p1-img-urls-paradox" class="form-control font-monospace" rows="3" placeholder="https://.../image.png  https://.../submission.json" spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-img-check-paradox" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Validate URLs</button>
          </div>
          <div class="mt-3 small" id="p1-img-status-paradox"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">9</div>
        <div class="flex-grow-1">
          <div class="q-title">Network Game: Data Labyrinth</div>
          <div class="q-filter mt-1">Play the game, paste the completion JWT token, then verify signature + claims.</div>
          <div class="mt-3">
            <div class="answer-label">Completion JWT token</div>
            <textarea id="p1-jwt-labyrinth" class="form-control font-monospace" rows="5" placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-jwt-check-labyrinth" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Verify JWT</button>
          </div>
          <div class="mt-3 small" id="p1-jwt-status-labyrinth"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">10</div>
        <div class="flex-grow-1">
          <div class="q-title">Network Game: Graph Detective</div>
          <div class="q-filter mt-1">Play the game, paste the completion JWT token, then verify signature + claims.</div>
          <div class="mt-3">
            <div class="answer-label">Completion JWT token</div>
            <textarea id="p1-jwt-detective" class="form-control font-monospace" rows="5" placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-jwt-check-detective" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Verify JWT</button>
          </div>
          <div class="mt-3 small" id="p1-jwt-status-detective"></div>
        </div>
      </div>
    </div>

    <div class="answer-card mb-3">
      <div class="d-flex align-items-start gap-3">
        <div class="q-number">11</div>
        <div class="flex-grow-1">
          <div class="q-title">Network Game: The Signal</div>
          <div class="q-filter mt-1">Play the game, paste the completion JWT token, then verify signature + claims.</div>
          <div class="mt-3">
            <div class="answer-label">Completion JWT token</div>
            <textarea id="p1-jwt-signal" class="form-control font-monospace" rows="5" placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..." spellcheck="false"></textarea>
          </div>
          <div class="mt-2">
            <button type="button" id="p1-jwt-check-signal" class="btn btn-sm btn-outline-success" style="border-radius:999px;">Verify JWT</button>
          </div>
          <div class="mt-3 small" id="p1-jwt-status-signal"></div>
        </div>
      </div>
    </div>
  `;
  results.style.display = "block";

  const hashInput = document.getElementById("p1-q2-hash");
  const numberInput = document.getElementById("p1-q2-number");
  const statusEl = document.getElementById("p1-q2-status");
  const jsonEl = document.getElementById("p1-q2-json");
  const audioSlot = document.getElementById("p1-q2-audio-slot");
  const generateBtn = document.getElementById("p1-q2-generate");
  const copyBtn = document.getElementById("p1-q2-copy");
  const prUrlInput = document.getElementById("p1-pr-url");
  const prStatusEl = document.getElementById("p1-pr-status");
  const prCheckBtn = document.getElementById("p1-pr-check");
  const imgUrlsAffective = document.getElementById("p1-img-urls-affective");
  const imgStatusAffective = document.getElementById("p1-img-status-affective");
  const imgCheckAffective = document.getElementById("p1-img-check-affective");
  const imgUrlsConcept = document.getElementById("p1-img-urls-concept");
  const imgStatusConcept = document.getElementById("p1-img-status-concept");
  const imgCheckConcept = document.getElementById("p1-img-check-concept");
  const imgUrlsStyle = document.getElementById("p1-img-urls-style");
  const imgStatusStyle = document.getElementById("p1-img-status-style");
  const imgCheckStyle = document.getElementById("p1-img-check-style");
  const imgUrlsParadox = document.getElementById("p1-img-urls-paradox");
  const imgStatusParadox = document.getElementById("p1-img-status-paradox");
  const imgCheckParadox = document.getElementById("p1-img-check-paradox");

  const jwtLabyrinth = document.getElementById("p1-jwt-labyrinth");
  const jwtCheckLabyrinth = document.getElementById("p1-jwt-check-labyrinth");
  const jwtStatusLabyrinth = document.getElementById("p1-jwt-status-labyrinth");
  const jwtDetective = document.getElementById("p1-jwt-detective");
  const jwtCheckDetective = document.getElementById("p1-jwt-check-detective");
  const jwtStatusDetective = document.getElementById("p1-jwt-status-detective");
  const jwtSignal = document.getElementById("p1-jwt-signal");
  const jwtCheckSignal = document.getElementById("p1-jwt-check-signal");
  const jwtStatusSignal = document.getElementById("p1-jwt-status-signal");
  const runAllBtn = document.getElementById("p1-run-all");
  const runAllStatus = document.getElementById("p1-run-all-status");
  const runAllReport = document.getElementById("p1-run-all-report");
  const ghTokenInput = document.getElementById("p1-gh-token");

  function normEmail(s) {
    return String(s ?? "").trim().toLowerCase();
  }

  function setText(el, msg, color = "") {
    if (!el) return;
    el.textContent = msg;
    el.style.color = color || "";
  }

  function reportLine(ok, label, detail = "") {
    const mark = ok === true ? "PASS" : ok === false ? "FAIL" : "TODO";
    return `${mark}  ${label}${detail ? ` — ${detail}` : ""}`;
  }

  function validateGithubPrUrl(u) {
    const s = String(u ?? "").trim();
    if (!s) throw new Error("Enter a public GitHub pull request URL.");
    const m = s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pulls?\/(\d+)(?:[/?#].*)?$/i);
    if (!m) throw new Error("PR URL must look like https://github.com/OWNER/REPO/pull/NUMBER");
    return { owner: m[1], repo: m[2], number: m[3] };
  }

  function splitTwoUrls(s) {
    const parts = String(s ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length !== 2) throw new Error("Submit exactly two public URLs separated by whitespace: image first, JSON second.");
    return { imageUrl: parts[0], jsonUrl: parts[1] };
  }

  function mustHttpUrl(u, label) {
    let url;
    try {
      url = new URL(u);
    } catch {
      throw new Error(`${label} must be a valid absolute URL`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`${label} must start with http:// or https://`);
    return url;
  }

  async function fetchJsonNoStore(url, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchBlobNoStore(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { blob: await res.blob(), contentType: (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() };
  }

  async function imageDimensionsFromBlob(blob) {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(blob);
      try {
        return { width: bmp.width, height: bmp.height };
      } finally {
        bmp.close?.();
      }
    }
    return await new Promise((resolve, reject) => {
      const u = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(u);
        resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(u);
        reject(new Error("Could not decode the image"));
      };
      img.src = u;
    });
  }

  function wordCount(s) {
    return String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
  }

  function validateSchema(obj, schema) {
    if (Object.prototype.toString.call(obj) !== "[object Object]") throw new Error("Submission JSON must be an object");
    const required = schema.fields;
    const allowedExtra = new Set(["publish_email"]);
    const keys = Object.keys(obj);
    const missing = required.filter((k) => !(k in obj));
    if (missing.length) throw new Error(`Submission JSON is missing: ${missing.join(", ")}`);
    const unexpected = keys.filter((k) => !required.includes(k) && !allowedExtra.has(k));
    if (unexpected.length) throw new Error(`Submission JSON has unexpected fields: ${unexpected.join(", ")}`);
    if ("publish_email" in obj && obj.publish_email !== true) throw new Error('If included, "publish_email" must be true');
    for (const k of required) {
      const v = obj[k];
      if (typeof v !== "string" || !v.trim()) throw new Error(`Submission JSON field "${k}" must be a non-empty string`);
      const mw = schema.maxWords?.[k];
      if (mw && wordCount(v) > mw) throw new Error(`Submission JSON field "${k}" must be ${mw} words or fewer`);
    }
  }

  async function validateImageSubmission(imageUrl, jsonUrl, kind) {
    const img = mustHttpUrl(imageUrl, "Image URL");
    const js = mustHttpUrl(jsonUrl, "JSON URL");
    const okExt = IMAGE_EXTS.some((ext) => img.pathname.toLowerCase().endsWith(ext));
    if (!okExt) throw new Error(`Image URL must end in ${IMAGE_EXTS.join(", ")}`);

    const { blob, contentType } = await fetchBlobNoStore(img.toString());
    if (!blob.size) throw new Error("Image URL returned an empty file");
    if (contentType && !["image/png", "image/jpeg", "image/webp", "image/avif", "image/jpg"].includes(contentType)) {
      throw new Error("Image URL must return a PNG, JPG, WEBP, or AVIF image");
    }
    const dim = await imageDimensionsFromBlob(blob);
    if (Math.min(dim.width, dim.height) < IMAGE_MIN_SHORT_SIDE) {
      throw new Error(`Image must be at least ${IMAGE_MIN_SHORT_SIDE}px on its short side`);
    }

    const schema = IMAGE_SCHEMAS[kind];
    if (!schema) throw new Error("Unknown image exercise kind");
    const data = await fetchJsonNoStore(js.toString());
    validateSchema(data, schema);

    return { dim, schemaTitle: schema.title };
  }

  async function validatePrViaGithubApi(url) {
    const { owner, repo, number } = validateGithubPrUrl(url);
    const tok = String(ghTokenInput?.value ?? "").trim() || null;
    const pr = await fetchJsonNoStore(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, tok);
    const repoInfo = await fetchJsonNoStore(`https://api.github.com/repos/${owner}/${repo}`, tok);
    const stars = Number(repoInfo?.stargazers_count ?? 0);
    if (stars < 1000) throw new Error(`Repo has only ${stars} stars (needs 1000+)`);
    const mergedAt = pr?.merged_at ? Date.parse(pr.merged_at) : NaN;
    if (!pr?.merged_at || Number.isNaN(mergedAt)) throw new Error("PR is not merged (merged_at missing)");
    if (mergedAt <= PR_MERGE_MIN_UTC) throw new Error("PR merged too early (must be after 2026-02-10 UTC)");
    return { stars, merged_at: pr.merged_at };
  }

  function selectJwksKey(jwks, kid) {
    const keys = (Array.isArray(jwks?.keys) ? jwks.keys : []).filter((k) => k?.kty === "EC" && k?.crv === "P-256");
    if (!keys.length) throw new Error("JWKS did not contain any ES256 verification keys");
    if (!kid) return keys;
    const match = keys.filter((k) => k.kid === kid);
    if (!match.length) throw new Error(`No JWKS key matched kid ${kid}`);
    return match;
  }

  async function importEs256Key(jwk) {
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  }

  async function verifyJwtSignature(rawToken, jwks) {
    const parts = String(rawToken ?? "").trim().split(".");
    const [h, p, s] = parts;
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(h)));
    const signingInput = new TextEncoder().encode(`${h}.${p}`);
    const sig = base64UrlToBytes(s);
    const keys = selectJwksKey(jwks, header?.kid);
    for (const jwk of keys) {
      const k = await importEs256Key(jwk);
      const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, sig, signingInput);
      if (ok) return true;
    }
    return false;
  }

  function base64UrlToBytes(s) {
    const pad = "=".repeat((4 - (s.length % 4 || 4)) % 4);
    const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  function parseJwt(token) {
    const raw = String(token ?? "").trim();
    if (!raw) throw new Error("Submit the completion JWT token from the game");
    const parts = raw.split(".");
    if (parts.length !== 3) throw new Error("JWT must have header.payload.signature format");
    const [h, p] = parts;
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(h)));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(p)));
    return { header, payload };
  }

  function isoWeekId(d = new Date()) {
    const n = new Date(d);
    const t = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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

  // Q3: PR URL format validator
  function renderPrStatus() {
    try {
      const x = validateGithubPrUrl(prUrlInput?.value);
      setText(prStatusEl, `OK: ${x.owner}/${x.repo} #${x.number}`, "#bbf7d0");
    } catch (e) {
      setText(prStatusEl, e instanceof Error ? e.message : String(e), "#fca5a5");
    }
  }
  prUrlInput?.addEventListener("input", renderPrStatus);
  prCheckBtn?.addEventListener("click", async () => {
    prCheckBtn.disabled = true;
    setText(prStatusEl, "Checking GitHub API...", "#93c5fd");
    try {
      const x = await validatePrViaGithubApi(prUrlInput?.value);
      setText(prStatusEl, `OK: merged_at=${x.merged_at}, stars=${x.stars}`, "#bbf7d0");
    } catch (e) {
      setText(prStatusEl, e instanceof Error ? e.message : String(e), "#fca5a5");
    } finally {
      prCheckBtn.disabled = false;
    }
  });

  // Q5 (4 cards): image validators
  function wireImageCard({ input, status, btn, kind }) {
    function renderFormatOnly() {
      try {
        const { imageUrl, jsonUrl } = splitTwoUrls(input?.value);
        const img = mustHttpUrl(imageUrl, "Image URL");
        mustHttpUrl(jsonUrl, "JSON URL");
        const okExt = IMAGE_EXTS.some((ext) => img.pathname.toLowerCase().endsWith(ext));
        if (!okExt) throw new Error(`Image URL must end in ${IMAGE_EXTS.join(", ")}`);
        setText(status, "Format OK. Click Validate URLs to fetch + verify.", "#bbf7d0");
      } catch (e) {
        setText(status, e instanceof Error ? e.message : String(e), "#fca5a5");
      }
    }
    input?.addEventListener("input", renderFormatOnly);
    btn?.addEventListener("click", async () => {
      btn.disabled = true;
      setText(status, "Fetching + validating (CORS, image size, JSON schema)...", "#93c5fd");
      try {
        const { imageUrl, jsonUrl } = splitTwoUrls(input?.value);
        const out = await validateImageSubmission(imageUrl, jsonUrl, kind);
        setText(
          status,
          `OK: ${out.schemaTitle}; image=${out.dim.width}x${out.dim.height} (short side ≥ ${IMAGE_MIN_SHORT_SIDE})`,
          "#bbf7d0"
        );
      } catch (e) {
        setText(status, e instanceof Error ? e.message : String(e), "#fca5a5");
      } finally {
        btn.disabled = false;
      }
    });
  }

  wireImageCard({
    input: imgUrlsAffective,
    status: imgStatusAffective,
    btn: imgCheckAffective,
    kind: "q-generate-affective-chart"
  });
  wireImageCard({
    input: imgUrlsConcept,
    status: imgStatusConcept,
    btn: imgCheckConcept,
    kind: "q-generate-concept-incarnation"
  });
  wireImageCard({
    input: imgUrlsStyle,
    status: imgStatusStyle,
    btn: imgCheckStyle,
    kind: "q-generate-style-transplant"
  });
  wireImageCard({
    input: imgUrlsParadox,
    status: imgStatusParadox,
    btn: imgCheckParadox,
    kind: "q-generate-paradox-portrait"
  });

  // Q6 (3 cards): JWT signature + claim checks
  function wireJwtCard({ input, status, btn, game }) {
    function renderQuick() {
      try {
        const { header, payload } = parseJwt(input?.value);
        if (header?.alg !== "ES256") throw new Error(`Expected ES256 JWT, got ${header?.alg ?? "unknown"}`);
        if (String(payload?.game ?? "") !== game) throw new Error(`JWT game must be ${game}, got ${payload?.game ?? "missing"}`);
        setText(status, "Structure OK. Click Verify JWT to verify signature + claims.", "#bbf7d0");
      } catch (e) {
        setText(status, e instanceof Error ? e.message : String(e), "#fca5a5");
      }
    }
    input?.addEventListener("input", renderQuick);
    btn?.addEventListener("click", async () => {
      btn.disabled = true;
      setText(status, "Verifying signature + claims...", "#93c5fd");
      try {
        const raw = String(input?.value ?? "").trim();
        const { header, payload } = parseJwt(raw);
        if (header?.alg !== "ES256") throw new Error(`Expected ES256 JWT, got ${header?.alg ?? "unknown"}`);
        const sigOk = await verifyJwtSignature(raw, GAME_JWKS);
        if (!sigOk) throw new Error("JWT signature verification failed");

        const email = normEmail(emailInput?.value);
        if (email && normEmail(payload?.sub) !== email) throw new Error(`JWT sub must match ${email}`);
        if (String(payload?.game ?? "") !== game) throw new Error(`JWT game must be ${game}, got ${payload?.game ?? "missing"}`);
        const w = isoWeekId(new Date());
        if (String(payload?.week_id ?? "") !== w) throw new Error(`JWT week_id must be ${w}, got ${payload?.week_id ?? "missing"}`);
        setText(status, `OK (signature verified): sub=${payload.sub}, week_id=${payload.week_id}`, "#bbf7d0");
      } catch (e) {
        setText(status, e instanceof Error ? e.message : String(e), "#fca5a5");
      } finally {
        btn.disabled = false;
      }
    });
  }

  wireJwtCard({
    input: jwtLabyrinth,
    status: jwtStatusLabyrinth,
    btn: jwtCheckLabyrinth,
    game: "labyrinth"
  });
  wireJwtCard({
    input: jwtDetective,
    status: jwtStatusDetective,
    btn: jwtCheckDetective,
    game: "detective"
  });
  wireJwtCard({
    input: jwtSignal,
    status: jwtStatusSignal,
    btn: jwtCheckSignal,
    game: "signal"
  });

  async function runAll() {
    runAllBtn.disabled = true;
    setText(runAllStatus, "Running...", "#93c5fd");
    const lines = [];

    // Q1: compute
    try {
      await renderQ1();
      const email = normEmail(emailInput?.value);
      lines.push(reportLine(!!email, "Q1 Secret Agent (computed)", email ? `email=${email}` : "enter email"));
    } catch (e) {
      lines.push(reportLine(false, "Q1 Secret Agent (computed)", e instanceof Error ? e.message : String(e)));
    }

    // Q2: hardcoded JSON
    try {
      const ok = HARDCODED_P1_Q2.number.length === PROJECT1_Q2.digits && /^[a-f0-9]{64}$/i.test(HARDCODED_P1_Q2.hash);
      lines.push(reportLine(ok, "Q2 300-digit JSON (hardcoded)"));
    } catch (e) {
      lines.push(reportLine(false, "Q2 300-digit JSON (hardcoded)", e instanceof Error ? e.message : String(e)));
    }

    // Q3: PR
    const prVal = String(prUrlInput?.value ?? "").trim();
    if (!prVal) {
      lines.push(reportLine(null, "Q3 PR merged URL", "paste PR URL"));
    } else {
      try {
        validateGithubPrUrl(prVal);
        try {
          const x = await validatePrViaGithubApi(prVal);
          lines.push(reportLine(true, "Q3 PR merged (GitHub API)", `merged_at=${x.merged_at}, stars=${x.stars}`));
        } catch (e) {
          lines.push(reportLine(false, "Q3 PR merged (GitHub API)", e instanceof Error ? e.message : String(e)));
        }
      } catch (e) {
        lines.push(reportLine(false, "Q3 PR merged URL (format)", e instanceof Error ? e.message : String(e)));
      }
    }

    // Q4: parser (always manual)
    lines.push(reportLine(null, "Q4 CommonMark parser", "manual (write parse_markdown)"));

    // Q5–Q8: images
    const imageCases = [
      { label: "Q5 Affective Chart", kind: "q-generate-affective-chart", input: imgUrlsAffective },
      { label: "Q6 Concept Incarnation", kind: "q-generate-concept-incarnation", input: imgUrlsConcept },
      { label: "Q7 Style Transplant", kind: "q-generate-style-transplant", input: imgUrlsStyle },
      { label: "Q8 Paradox Portrait", kind: "q-generate-paradox-portrait", input: imgUrlsParadox }
    ];
    for (const c of imageCases) {
      const v = String(c.input?.value ?? "").trim();
      if (!v) {
        lines.push(reportLine(null, c.label, "paste URLs"));
        continue;
      }
      try {
        const { imageUrl, jsonUrl } = splitTwoUrls(v);
        const out = await validateImageSubmission(imageUrl, jsonUrl, c.kind);
        lines.push(reportLine(true, c.label, `${out.dim.width}x${out.dim.height}`));
      } catch (e) {
        lines.push(reportLine(false, c.label, e instanceof Error ? e.message : String(e)));
      }
    }

    // Q9–Q11: JWTs
    const jwtCases = [
      { label: "Q9 Labyrinth JWT", game: "labyrinth", input: jwtLabyrinth },
      { label: "Q10 Detective JWT", game: "detective", input: jwtDetective },
      { label: "Q11 Signal JWT", game: "signal", input: jwtSignal }
    ];
    for (const c of jwtCases) {
      const tok = String(c.input?.value ?? "").trim();
      if (!tok) {
        lines.push(reportLine(null, c.label, "paste JWT"));
        continue;
      }
      try {
        const { header, payload } = parseJwt(tok);
        if (header?.alg !== "ES256") throw new Error(`Expected ES256 JWT, got ${header?.alg ?? "unknown"}`);
        const sigOk = await verifyJwtSignature(tok, GAME_JWKS);
        if (!sigOk) throw new Error("JWT signature verification failed");
        const email = normEmail(emailInput?.value);
        if (email && normEmail(payload?.sub) !== email) throw new Error(`JWT sub must match ${email}`);
        if (String(payload?.game ?? "") !== c.game) throw new Error(`JWT game must be ${c.game}, got ${payload?.game ?? "missing"}`);
        const w = isoWeekId(new Date());
        if (String(payload?.week_id ?? "") !== w) throw new Error(`JWT week_id must be ${w}, got ${payload?.week_id ?? "missing"}`);
        lines.push(reportLine(true, c.label, `sub=${payload.sub}`));
      } catch (e) {
        lines.push(reportLine(false, c.label, e instanceof Error ? e.message : String(e)));
      }
    }

    runAllReport.textContent = lines.join("\n");
    setText(runAllStatus, "Done.", "#bbf7d0");
    runAllBtn.disabled = false;
  }

  runAllBtn?.addEventListener("click", () => {
    runAll().catch((e) => {
      setText(runAllStatus, e instanceof Error ? e.message : String(e), "#fca5a5");
      runAllBtn.disabled = false;
    });
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

