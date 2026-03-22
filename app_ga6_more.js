"use strict";

const GA6_FLAKY_TESTS = [
  "test_auth_login", "test_auth_logout", "test_db_connection", "test_db_write",
  "test_cache_hit", "test_cache_miss", "test_queue_enqueue", "test_queue_drain",
  "test_api_health", "test_api_rate_limit", "test_email_send", "test_email_render",
  "test_payment_charge", "test_payment_refund", "test_search_index", "test_search_query",
  "test_upload_small", "test_upload_large", "test_session_create", "test_session_expire",
  "test_webhook_receive", "test_webhook_retry", "test_report_generate", "test_report_export",
  "test_notification_push"
];
const GA6_FLAKY_COMPANIES = ["BuildBot", "PipelineHQ", "CIFast", "ShipNow", "DeployOps"];

function buildFlakyData(email) {
  const t = new Math.seedrandom(`${email}#q-flaky-test-finder`);
  const e = (y) => y[Math.floor(t() * y.length)];
  const s = (y, E) => y + Math.floor(t() * (E - y + 1));
  const company = e(GA6_FLAKY_COMPANIES);
  const r = s(15, 22);
  const p = s(22, 38);
  const nTrap = s(3, 6);
  const l = s(3, 7);
  const d = GA6_FLAKY_TESTS.slice();
  for (let y = d.length - 1; y > 0; y--) {
    const E = Math.floor(t() * (y + 1));
    [d[y], d[E]] = [d[E], d[y]];
  }
  const i = d.slice(0, r);
  const u = [];
  for (let y = 0; y < p; y++) {
    let E = "";
    for (let I = 0; I < 8; I++) E += Math.floor(t() * 16).toString(16);
    u.push(`c${y.toString().padStart(3, "0")}${E}`);
  }
  const m = s(1, 2);
  const c = s(2, 4);
  const f = Math.min(nTrap, r - m - c - 1);
  const w = {};
  let _ = 0;
  for (let y = 0; y < f; y++, _++) w[i[_]] = "flaky";
  for (let y = 0; y < m; y++, _++) w[i[_]] = "trap";
  for (let y = 0; y < c; y++, _++) w[i[_]] = "stable_fail";
  for (; _ < r; _++) w[i[_]] = "stable_pass";
  const T = {};
  for (const y of i) if (w[y] === "flaky") T[y] = 0.2 + t() * 0.65;
  const x = {};
  for (const y of i) {
    if (w[y] === "trap") {
      const E = s(3, Math.floor(p / 2));
      const I = u.slice();
      for (let M = I.length - 1; M > 0; M--) {
        const q = Math.floor(t() * (M + 1));
        [I[M], I[q]] = [I[q], I[M]];
      }
      x[y] = new Set(I.slice(0, E));
    }
  }
  const g = [];
  let v = 1;
  for (const y of u) {
    for (const E of i) {
      if (t() < 0.12) continue;
      const I = w[E];
      const M = l + Math.floor(t() * 3);
      for (let q = 0; q < M; q++) {
        let N;
        if (I === "stable_pass") N = "PASS";
        else if (I === "stable_fail") N = "FAIL";
        else if (I === "trap") N = x[E].has(y) ? "FAIL" : "PASS";
        else {
          const pairRng = new Math.seedrandom(`${E}#${y}`);
          if (pairRng() < T[E]) N = t() < 0.5 ? "PASS" : "FAIL";
          else N = t() < 0.92 ? "PASS" : "FAIL";
        }
        g.push({
          run_id: `run_${String(v++).padStart(5, "0")}`,
          commit_hash: y,
          test_name: E,
          outcome: N
        });
      }
    }
  }
  const S = {};
  for (const y of g) {
    if (!S[y.test_name]) S[y.test_name] = {};
    const E = S[y.test_name];
    if (!E[y.commit_hash]) E[y.commit_hash] = { pass: 0, fail: 0 };
    if (y.outcome === "PASS") E[y.commit_hash].pass++;
    else E[y.commit_hash].fail++;
  }
  const h = [];
  for (const y of i) {
    const E = S[y] || {};
    let I = 0;
    let M = 0;
    let q = 0;
    let N = 0;
    for (const [, { pass: b, fail: R }] of Object.entries(E)) {
      M++;
      q += b;
      N += b + R;
      if (b > 0 && R > 0) I++;
    }
    if (I === 0) continue;
    const D = Math.round(I / M * 1e4) / 1e4;
    const C = Math.round(q / N * 1e4) / 1e4;
    h.push({ test_name: y, flaky_commits: I, pass_rate: C, flakyness_score: D });
  }
  h.sort((y, E) => E.flakyness_score - y.flakyness_score);
  return {
    company,
    totalRuns: g.length,
    correctRows: h,
    numFlakyExpected: h.length
  };
}

function flakySql() {
  return `WITH per_commit AS (
  SELECT test_name, commit_hash,
    MAX(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) AS has_pass,
    MAX(CASE WHEN outcome = 'FAIL' THEN 1 ELSE 0 END) AS has_fail
  FROM test_runs
  GROUP BY test_name, commit_hash
),
flaky_commits AS (
  SELECT test_name, COUNT(*) AS flaky_commits
  FROM per_commit
  WHERE has_pass = 1 AND has_fail = 1
  GROUP BY test_name
),
tot AS (
  SELECT test_name,
    COUNT(DISTINCT commit_hash) AS total_commits,
    SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS pass_rate
  FROM test_runs
  GROUP BY test_name
)
SELECT
  t.test_name,
  f.flaky_commits,
  ROUND(t.pass_rate, 4) AS pass_rate,
  ROUND(f.flaky_commits * 1.0 / t.total_commits, 4) AS flakyness_score
FROM tot t
JOIN flaky_commits f ON t.test_name = f.test_name
ORDER BY flakyness_score DESC;`;
}

function solveFlakyTestFinder(email) {
  const r = buildFlakyData(email);
  const rows = r.correctRows.map((x) =>
    `${x.test_name}: flaky_commits=${x.flaky_commits}, pass_rate=${x.pass_rate}, score=${x.flakyness_score}`
  ).join("\n");
  return {
    title: "The Flaky Test Finder",
    filter: `${r.company}, ${r.totalRuns} runs, ${r.numFlakyExpected} flaky tests`,
    answer: `${rows}\n\n${flakySql()}`,
    answerDisplay: flakySql()
  };
}

function buildCoverageGapData(email) {
  const t = new Math.seedrandom(`${email}#q-coverage-gap-finder`);
  const e = (C) => C[Math.floor(t() * C.length)];
  const a = e([80, 100, 120, 150]);
  const r = 60 + Math.floor(t() * 21);
  const p = Math.round(a * r / 100);
  const missingCount = a - p;
  const lineNums = [];
  let l = 1;
  for (let C = 0; C < a; C++) {
    lineNums.push(l);
    l += 1 + (t() < 0.3 ? Math.floor(t() * 3) : 0);
  }
  const d = new Set();
  const i = 4 + Math.floor(t() * 12);
  const u = Math.min(i, missingCount);
  const m = Math.floor(t() * (a - u));
  for (let C = m; C < m + u; C++) d.add(lineNums[C]);
  let c = lineNums.filter((C) => !d.has(C));
  let f = missingCount - d.size;
  for (let C = 0; C < f && c.length; C++) {
    const b = Math.floor(t() * c.length);
    d.add(c[b]);
    c.splice(b, 1);
  }
  const w = [...d].sort((C, b) => C - b);
  const execLines = lineNums.filter((C) => !d.has(C));
  const T = e([20, 30, 40, 50]);
  const x = a - (5 + Math.floor(t() * 15));
  const g = Math.round((T * x) / 100);
  const v = {};
  const S = [];
  for (let C = 0; C < T; C++) {
    const b = lineNums[Math.floor(t() * lineNums.length)];
    const R = b + 1 + Math.floor(t() * 5);
    S.push([b, R]);
  }
  const h = Array.from({ length: T }, (_, b) => b);
  for (let C = h.length - 1; C > 0; C--) {
    const b = Math.floor(t() * (C + 1));
    [h[C], h[b]] = [h[b], h[C]];
  }
  for (let C = 0; C < T; C++) {
    const [b, R] = S[h[C]];
    const L = `[${b}, ${R}]`;
    v[L] = C < g;
  }
  const k = e([3, 4, 5]);
  const mod = e(["data_loader", "transformer", "validator", "parser", "aggregator", "processor", "serializer"]);
  const y = Math.round((execLines.length / a) * 1e4) / 100;
  const E = Math.round((g / T) * 1e4) / 100;
  const groups = [];
  let M = [w[0]];
  for (let C = 1; C < w.length; C++) {
    if (w[C] === w[C - 1] + 1) M.push(w[C]);
    else {
      groups.push(M);
      M = [w[C]];
    }
  }
  if (M.length) groups.push(M);
  const q = Math.max(...groups.map((C) => C.length));
  let N = 0;
  for (const C of groups) N += Math.ceil(C.length / k);
  return {
    moduleName: mod,
    lines_per_test: k,
    correct: {
      line_coverage_pct: y,
      branch_coverage_pct: E,
      missing_line_runs: N,
      critical_missing: q
    }
  };
}

function solveCoverageGapFull(email) {
  const r = buildCoverageGapData(email);
  const { line_coverage_pct, branch_coverage_pct, missing_line_runs, critical_missing } = r.correct;
  const ans = `${line_coverage_pct}, ${branch_coverage_pct}, ${missing_line_runs}, ${critical_missing}`;
  return {
    title: "The Coverage Gap Finder",
    filter: r.moduleName,
    answer: ans,
    answerDisplay: ans
  };
}

function bugHunterScenario(fn, name, kind) {
  const templates = {
    sort: `from hypothesis import given, strategies as st

@given(st.lists(st.integers(min_value=-50, max_value=50), min_size=2, max_size=25))
def test_matches_sorted_reference(nums):
    assert ${fn}(nums) == sorted(nums)
`,
    revenue: `from hypothesis import given, strategies as st

@given(
    st.integers(min_value=20000, max_value=120000),
    st.integers(min_value=20000, max_value=120000),
)
def test_product_matches_python_int(price, quantity):
    assert ${fn}(price, quantity) == price * quantity
`,
    leap: `from hypothesis import given, strategies as st
from datetime import date

@given(st.dates(min_value=date(1996, 1, 1), max_value=date(2032, 12, 31)))
def test_parse_roundtrip(d):
    s = d.isoformat()
    assert ${fn}(s).date() == d
`,
    dedupe: `from hypothesis import given, strategies as st

@given(st.lists(st.text(min_size=1, max_size=4, alphabet="aAbBcC12"), min_size=1, max_size=14))
def test_same_as_case_sensitive_unique(items):
    assert ${fn}(items) == list(dict.fromkeys(items))
`,
    page: `from hypothesis import given, strategies as st

@given(
    st.lists(st.integers(), max_size=18),
    st.integers(min_value=0, max_value=8),
    st.integers(min_value=0, max_value=8),
)
def test_slice_matches_python(items, offset, limit):
    assert ${fn}(items, offset, limit) == items[offset : offset + limit]
`,
    ma: `from hypothesis import given, strategies as st

@given(
    st.lists(st.floats(min_value=-1e3, max_value=1e3, allow_nan=False, width=32), min_size=3, max_size=14),
    st.integers(min_value=2, max_value=5),
)
def test_moving_average_reference(values, window):
    if window <= 0 or window > len(values):
        assert ${fn}(values, window) == []
        return
    expected = []
    for i in range(0, len(values) - window + 1):
        seg = values[i : i + window]
        expected.append(sum(seg) / window)
    assert ${fn}(values, window) == expected
`
  };
  return templates[kind] || templates.sort;
}

function buildBugHunterPick(email) {
  const t = new Math.seedrandom(`${email}#q-bug-hunter-property-based-testing`);
  const scenarios = [
    { fn: "sort_inventory", kind: "sort" },
    { fn: "sort_ranked_queue", kind: "sort" },
    { fn: "sort_metrics", kind: "sort" },
    { fn: "sort_schedule", kind: "sort" },
    { fn: "compute_ticket_revenue", kind: "revenue" },
    { fn: "compute_ad_revenue", kind: "revenue" },
    { fn: "compute_subscription_revenue", kind: "revenue" },
    { fn: "compute_retail_revenue", kind: "revenue" },
    { fn: "parse_billing_date", kind: "leap" },
    { fn: "parse_report_date", kind: "leap" },
    { fn: "parse_schedule_date", kind: "leap" },
    { fn: "dedupe_user_tags", kind: "dedupe" },
    { fn: "dedupe_categories", kind: "dedupe" },
    { fn: "dedupe_topics", kind: "dedupe" },
    { fn: "paginate_feed", kind: "page" },
    { fn: "paginate_search", kind: "page" },
    { fn: "paginate_invoices", kind: "page" },
    { fn: "moving_avg_sensor", kind: "ma" },
    { fn: "moving_avg_price", kind: "ma" },
    { fn: "moving_avg_latency", kind: "ma" }
  ];
  const idx = Math.floor(t() * scenarios.length);
  return scenarios[idx];
}

function solveBugHunter(email) {
  const s = buildBugHunterPick(email);
  const code = bugHunterScenario(s.fn, s.fn, s.kind);
  return {
    title: "The Bug Hunter (property-based testing)",
    filter: `Seeded variant: ${s.fn}`,
    answer: code,
    answerDisplay: code,
    isCodeQuestion: true
  };
}

const GA6_BINARY_TASKS = {
  data_analysis_narrative: `Does the output explain at least one cause or driver behind the numbers rather than only restating them?
Does the output connect two or more metrics to form a single coherent story?
Does the output include at least one phrase that signals interpretation such as suggests, implies, likely, or because?
Does the output mention a segment, region, cohort, or channel by name?
Does the output quantify change using a comparison such as versus, compared to, or from X to Y?
Is there at least one complete sentence of twelve or more words?
Does the output avoid being only a comma-separated list of bare figures without verbs?`,

  sql_query_quality: `Does the SQL use at least one CTE introduced with WITH?
Does the SQL apply COALESCE or similar null-handling to at least one numeric column?
Does the SQL filter rows with a predicate in WHERE rather than only selecting star from a base table?
Does the SQL aggregate with GROUP BY on a non-aggregated key column?
Does the SQL reference more than one column in the final SELECT list?
Is there a semicolon or clear terminator ending the statement?
Does the SQL avoid SELECT star as the entire query with no CTE?`,

  api_documentation: `Does the text include an HTTP method and a path starting with slash?
Does the text mention Content-Type application/json or multipart?
Does the text list at least two distinct numeric HTTP status codes?
Does the text include the word Example or an example payload block?
Does the text mention authentication such as Bearer or Authorization?
Does the text describe at least one error response separately from success?
Does the text avoid being a single sentence under fifteen words total?`,

  prompt_engineering: `Does the text require machine-readable JSON output explicitly?
Does the text specify keys or a schema for the JSON object?
Does the text state what to return when the input is empty?
Does the text include at least one concrete input-output example pair?
Does the text forbid extra prose outside the required format?
Does the text name the task domain such as classify, extract, or summarize?
Does the text mention at least one edge case such as ties, missing fields, or unknown labels?`
};

function solveBinaryRubric(email) {
  const t = new Math.seedrandom(`${email}#q-binary-eval-rubric`);
  const keys = Object.keys(GA6_BINARY_TASKS);
  const taskKey = keys[Math.floor(t() * keys.length)];
  const nChecks = [5, 6, 7][Math.floor(t() * 3)];
  const lines = GA6_BINARY_TASKS[taskKey].split("\n").filter(Boolean).slice(0, nChecks);
  const text = lines.join("\n");
  return {
    title: "Build a Binary Eval Rubric",
    filter: `Task: ${taskKey} — submit exactly ${nChecks} lines (one question per line, ending with ?).`,
    answer: text,
    answerDisplay: text,
    isCodeQuestion: true
  };
}

function buildTokenMiserTask(email) {
  const t = new Math.seedrandom(`${email}#q-token-miser-prompt`);
  const pools = {
    pos: {
      title: "Part of Speech Tagging",
      categories: ["Noun", "Verb", "Adjective", "Adverb", "Preposition"],
      pool: [
        { input: "The ball is perfectly **round**.", output: "Adjective" },
        { input: "Please **round** the number to two decimals.", output: "Verb" },
        { input: "She injured her **back** lifting boxes.", output: "Noun" },
        { input: "He performed the task **well**.", output: "Adverb" },
        { input: "What is the **difference** between supervised and unsupervised learning?", output: "Noun" }
      ]
    },
    sentiment: {
      title: "Sentiment Analysis",
      categories: ["Positive", "Negative", "Neutral"],
      pool: [
        { input: "I absolutely loved the movie!", output: "Positive" },
        { input: "It was a total waste of time.", output: "Negative" },
        { input: "The meeting is at 3 PM.", output: "Neutral" }
      ]
    },
    topic: {
      title: "Topic Classification",
      categories: ["Politics", "Sports", "Tech", "Entertainment"],
      pool: [
        { input: "Apple announced a new iPhone model.", output: "Tech" },
        { input: "The Lakers won the championship game.", output: "Sports" }
      ]
    },
    urgency: {
      title: "Urgency Detection",
      categories: ["High", "Medium", "Low"],
      pool: [
        { input: "My server is down and I am losing money!", output: "High" },
        { input: "I have a small question about the billing cycle.", output: "Low" }
      ]
    }
  };
  const keys = Object.keys(pools);
  const k = keys[Math.floor(t() * keys.length)];
  const d = pools[k];
  const u = d.pool.slice().sort(() => t() - 0.5).slice(0, 10);
  return { ...d, key: k, sample: u };
}

const TOKEN_MISER_PROMPTS = [
  "Reply one category only.",
  "Single word: category name.",
  "Output label word alone.",
  "State category, nothing else.",
  "Answer one category token."
];

async function solveTokenMiserLive(email, apiToken) {
  const task = buildTokenMiserTask(email);
  if (!apiToken || !apiToken.trim()) {
    return {
      title: "The Token Miser",
      filter: `${task.title} — add AIPipe token in page field to auto-test`,
      answer: TOKEN_MISER_PROMPTS.join("\n"),
      answerDisplay: TOKEN_MISER_PROMPTS[0]
    };
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiToken.trim()}`
  };
  let best = { prompt: "", score: -1 };
  const prompts = TOKEN_MISER_PROMPTS.filter((p) => p.trim().split(/\s+/).length <= 4);
  for (const prompt of prompts) {
    const results = await Promise.all(
      task.sample.map(async (g) => {
        const v = await fetch("https://aipipe.org/openai/v1/chat/completions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: g.input }
            ],
            temperature: 0,
            max_tokens: 5
          })
        });
        if (!v.ok) throw new Error(await v.text());
        const h = (await v.json()).choices?.[0]?.message?.content?.trim() || "";
        const k = h.replace(/[^a-zA-Z]/g, "").toLowerCase();
        const A = g.output.toLowerCase();
        return k === A;
      })
    );
    const score = results.filter(Boolean).length;
    if (score > best.score) best = { prompt, score };
    if (score >= 8) break;
  }
  const line = best.score >= 8 ? best.prompt : `${best.prompt} (only ${best.score}/10 — try manual tuning)`;
  return {
    title: "The Token Miser",
    filter: task.title,
    answer: line,
    answerDisplay: line
  };
}

async function runPyodideExam(email) {
  const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs");
  const pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/" });
  await pyodide.loadPackage("pandas");

  async function runFile(path, qid) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Cannot fetch ${path} (${res.status}). Serve the site over HTTP (e.g. Live Server), not file://`);
    const src = await res.text();
    pyodide.globals.set("EXAM_SEED", `${email}#${qid}`);
    await pyodide.runPythonAsync(src);
    const raw = pyodide.globals.get("__exam_gen__");
    return JSON.parse(String(raw));
  }

  const contract = await runFile("ga6_py_contract.py", "q-data-contract-violation");
  const train = await runFile("ga6_py_traintest.py", "q-train-test-contamination");
  const idem = await runFile("ga6_py_idempotency.py", "q-idempotency-prober");

  return { contract, train, idem };
}

function solveDataContractFromJson(j) {
  const n = j.correct_answer;
  return {
    title: "Data Contract Violation Detector",
    filter: j.domain,
    answer: String(n),
    answerDisplay: String(n)
  };
}

function solveTrainTestFromJson(j) {
  const line = `${j.leaked_count}, ${j.leaked_accuracy}, ${j.clean_accuracy}, ${j.inflation_pp}`;
  return {
    title: "Train-Test Contamination Scanner",
    filter: `reported ${j.reported_acc}%`,
    answer: line,
    answerDisplay: line
  };
}

function solveIdempotencyFromJson(j) {
  const line = `${j.idempotency_violations}, ${j.monotonicity_violations}, ${j.null_stability_violations}`;
  return {
    title: "The Idempotency Prober",
    filter: `${j.function_name}, N=${j.N}, monotone_col=${j.monotone_col}`,
    answer: line,
    answerDisplay: line
  };
}

globalThis.GA6_EXTRA = {
  solveFlakyTestFinder,
  solveCoverageGapFull,
  solveBugHunter,
  solveBinaryRubric,
  buildTokenMiserTask,
  solveTokenMiserLive,
  runPyodideExam,
  solveDataContractFromJson,
  solveTrainTestFromJson,
  solveIdempotencyFromJson
};
