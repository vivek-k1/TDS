"use strict";

const GA6_TE = 32;

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function l2Normalize(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  s = Math.sqrt(s);
  return v.map((x) => x / s);
}

function boxMullerPair(rng) {
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomNormalVector(rng, dim) {
  const t = [];
  for (let i = 0; i < dim; i++) t.push(boxMullerPair(rng));
  return l2Normalize(t);
}

function addNoiseAndNormalize(base, scale, rng) {
  const s = [];
  for (let a = 0; a < GA6_TE; a++) {
    s.push(base[a] + scale * boxMullerPair(rng));
  }
  return l2Normalize(s);
}

function dot(a, b) {
  let e = 0;
  for (let s = 0; s < GA6_TE; s++) e += a[s] * b[s];
  return e;
}

/** Exam `X(id, rng)` â€” synthetic embedding from keyed RNG. */
function embeddingX(id, rng) {
  const letter = id.slice(-1);
  const base = id.slice(0, -1);
  const sr = new Math.seedrandom(`base_${base}`);
  const r = randomNormalVector(sr, GA6_TE);
  if (letter === "p") return addNoiseAndNormalize(r, 0.08, rng);
  if (letter === "q") return addNoiseAndNormalize(r, 0.2, rng);
  const p = r.map((n) => -n);
  return addNoiseAndNormalize(p, 0.1, rng);
}

function roundVec6(v) {
  return v.map((x) => Math.round(x * 1e6) / 1e6);
}

function solveEmbeddingAuditor(email) {
  const id = "q-embedding-auditor";
  const rng = new Math.seedrandom(`${email}#${id}`);
  const kn = globalThis.GA6_EMBEDDING_PAIRS || [];
  if (kn.length === 0) {
    return {
      title: "The Embedding Auditor",
      filter: "Load app_ga6_embeddings_data.js",
      answer: "Missing GA6_EMBEDDING_PAIRS",
      answerDisplay: "Missing embedding pair data."
    };
  }
  const companies = ["EmbedLabs", "VectorIQ", "SemanticOS", "NLPForge", "TextGraph"];
  const domains = ["science facts", "cooking instructions", "legal clauses", "code documentation", "customer reviews"];
  pick(companies, rng);
  pick(domains, rng);

  const r = kn.map(([c, f]) => [c, f]);
  shuffleInPlace(r, rng);
  const i = Object.fromEntries(r);
  const p = { paraphrase: 14, negation: 14, near_duplicate: 12 };
  const n = [];
  const used = new Set();
  const nextBase = () => {
    for (const [c] of r) {
      const f = c.slice(0, -1);
      if (!used.has(f)) {
        used.add(f);
        return f;
      }
    }
    return null;
  };

  for (let c = 0; c < p.paraphrase; c++) {
    const f = nextBase();
    if (!f) break;
    const w = `${f}p`;
    const q = `${f}q`;
    if (!(w in i) || !(q in i)) {
      c--;
      continue;
    }
    const T = embeddingX(w, rng);
    const x = embeddingX(q, rng);
    const g = dot(roundVec6(T), roundVec6(x));
    n.push({ type: "paraphrase", cosine_sim: g, fails: g < 0.8 });
  }
  used.clear();

  for (let c = 0; c < p.negation; c++) {
    const f = nextBase();
    if (!f) break;
    const w = `${f}p`;
    const neg = `${f}r`;
    if (!(w in i) || !(neg in i)) {
      c--;
      continue;
    }
    const T = embeddingX(w, rng);
    const x = embeddingX(neg, rng);
    const g = dot(roundVec6(T), roundVec6(x));
    n.push({ type: "negation", cosine_sim: g, fails: g > 0.5 });
  }
  used.clear();

  for (let c = 0; c < p.near_duplicate; c++) {
    const f = nextBase();
    if (!f) break;
    const w = `${f}p`;
    if (!(w in i)) {
      c--;
      continue;
    }
    const embA = embeddingX(w, rng);
    const noiseScale = rng() < 0.25 ? 0.18 : 0.03;
    const embB = addNoiseAndNormalize(embA, noiseScale, rng);
    const g = dot(roundVec6(embA), roundVec6(embB));
    n.push({ type: "near_duplicate", cosine_sim: g, fails: g < 0.97 });
  }

  shuffleInPlace(n, rng);
  const paraphrase_failures = n.filter((x) => x.type === "paraphrase" && x.fails).length;
  const negation_failures = n.filter((x) => x.type === "negation" && x.fails).length;
  const near_duplicate_failures = n.filter((x) => x.type === "near_duplicate" && x.fails).length;
  const ans = `${paraphrase_failures}, ${negation_failures}, ${near_duplicate_failures}`;
  return {
    title: "The Embedding Auditor",
    filter: "Three counts: paraphrase, negation, near_duplicate failures",
    answer: ans,
    answerDisplay: ans
  };
}

// â”€â”€ Benchmark Overfitter (q-benchmark-overfitter) â”€â”€
function solveBenchmarkOverfitter(email) {
  const id = "q-benchmark-overfitter";
  const rng = new Math.seedrandom(`${email}#${id}`);
  const T = pick([10, 20, 50, 100, 200], rng);
  const nTest = pick([500, 1000, 2000, 5000], rng);
  const p = pick([0.82, 0.85, 0.88, 0.91, 0.94], rng);
  const sigma = Math.sqrt((p * (1 - p)) / nTest);
  const inflation = sigma * Math.sqrt(2 * Math.log(T)) * 100;
  const c = {
    sigma: Math.round(sigma * 1e6) / 1e6,
    inflation_pp: Math.round(inflation * 1e3) / 1e3,
    adjusted_accuracy: Math.round((p * 100 - inflation) * 1e3) / 1e3
  };
  const ans = `${c.sigma}, ${c.inflation_pp}, ${c.adjusted_accuracy}`;
  return {
    title: "The Benchmark Overfitter",
    filter: `T=${T}, n_test=${nTest}, p=${p.toFixed(4)}`,
    answer: ans,
    answerDisplay: ans
  };
}

// â”€â”€ Multi-Model Robustness (q-minimal-prompt-robustness) â”€â”€
function buildRobustnessScenario(email) {
  const id = "q-minimal-prompt-robustness";
  const rng = new Math.seedrandom(`${email}#${id}`);
  const span = (lo, hi) => lo + rng() * (hi - lo);
  const models = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-5-mini"];
  const nInst = 21;
  const biases = {
    "gpt-4o": Math.round(span(-2.5, -1) * 100) / 100,
    "gpt-4.1": Math.round(span(-2, -0.5) * 100) / 100,
    "gpt-4.1-mini": Math.round(span(-3.5, -2) * 100) / 100,
    "gpt-5-mini": Math.round(span(-1.5, 0.5) * 100) / 100
  };
  const fragments = [
    "Step-by-step.", "Act as Expert.", "JSON Output.", "No yapping.", "Few-shot (3).",
    "Chain of Thought.", "Explain reasoning.", "Professional tone.", "Strict format.", "Avoid jargon.",
    "Summary first.", "Double check.", "Self-reflect.", "Contextualize.", "Verify logic.", "Brevity.",
    "Analogies.", "Citations.", "Persona: Mentor.", "Persona: Auditor.", "JSON schema."
  ];
  const instructions = [];
  for (let d = 0; d < nInst; d++) {
    const contribs = {};
    models.forEach((u) => {
      let m = span(-0.4, 1.4);
      if (u === "gpt-5-mini" && d < 6) m -= 0.6;
      if (u === "gpt-4.1-mini" && d > 15) m += 0.5;
      contribs[u] = Math.round(m * 100) / 100;
    });
    instructions.push({
      id: `I${d + 1}`,
      text: fragments[d],
      word_count: Math.floor(span(5, 18)),
      contribs
    });
  }
  const interactions = [];
  for (let d = 0; d < 50; d++) {
    let i = Math.floor(rng() * nInst);
    let u = Math.floor(rng() * nInst);
    if (i === u) continue;
    const ids = [i + 1, u + 1].sort((a, b) => a - b).map((c) => `I${c}`);
    if (interactions.find((c) => c.ids[0] === ids[0] && c.ids[1] === ids[1])) continue;
    interactions.push({ ids, bonus: Math.round(span(-0.7, 0.7) * 100) / 100 });
  }
  return {
    instructions,
    interactions,
    biases,
    models,
    meanTarget: 0.97,
    floorTarget: 0.92
  };
}

function evalRobustnessSubset(ids, scenario) {
  const set = new Set(ids);
  let wordCount = 0;
  const metrics = {};
  scenario.models.forEach((model) => {
    let d = scenario.biases[model];
    scenario.instructions.forEach((inst) => {
      if (set.has(inst.id)) {
        d += inst.contribs[model];
        if (model === scenario.models[0]) wordCount += inst.word_count;
      }
    });
    scenario.interactions.forEach((inter) => {
      if (set.has(inter.ids[0]) && set.has(inter.ids[1])) d += inter.bonus;
    });
    metrics[model] = sigmoid(d);
  });
  const vals = Object.values(metrics);
  const meanAcc = vals.reduce((a, b) => a + b, 0) / vals.length;
  const floorAcc = Math.min(...vals);
  return { meanAcc, floorAcc, metrics, wordCount };
}

function bruteRobustnessOptimal(scenario) {
  const h = scenario.instructions.length;
  const A = 10;
  const y = [];
  const E = [];
  const I = [];
  scenario.interactions.forEach((b) => {
    const R = parseInt(b.ids[0].slice(1), 10) - 1;
    const L = parseInt(b.ids[1].slice(1), 10) - 1;
    const mask = (1 << R) | (1 << L);
    if (R < A && L < A) y.push({ mask, bonus: b.bonus });
    else if (R >= A && L >= A) E.push({ mask: mask >> A, bonus: b.bonus });
    else I.push({ mask, bonus: b.bonus });
  });

  const buildBlock = (model, startIdx, len, pairBonuses) => {
    const lo = new Float32Array(1 << len);
    const wc = new Int32Array(1 << len);
    for (let U = 0; U < 1 << len; U++) {
      for (let j = 0; j < len; j++) {
        if (U >> j & 1) {
          lo[U] += scenario.instructions[startIdx + j].contribs[model];
          if (model === "gpt-4o") wc[U] += scenario.instructions[startIdx + j].word_count;
        }
      }
      pairBonuses.forEach((pb) => {
        if ((U & pb.mask) === pb.mask) lo[U] += pb.bonus;
      });
    }
    return { lo, wc };
  };

  const q = {};
  const N = {};
  scenario.models.forEach((b) => {
    q[b] = buildBlock(b, 0, A, y);
    N[b] = buildBlock(b, A, h - A, E);
  });

  let bestWC = Infinity;
  let bestMean = 0;
  let bestMask = 0;
  for (let b = 0; b < 1 << h; b++) {
    const R = b & 1023;
    const L = b >> 10;
    const W = q["gpt-4o"].wc[R] + N["gpt-4o"].wc[L];
    if (W > bestWC) continue;
    let V = 0;
    I.forEach((Y) => {
      if ((b & Y.mask) === Y.mask) V += Y.bonus;
    });
    let J = 0;
    let U = 2;
    for (const Y of scenario.models) {
      const ce = 1 / (1 + Math.exp(-(scenario.biases[Y] + q[Y].lo[R] + N[Y].lo[L] + V)));
      J += ce;
      if (ce < U) U = ce;
    }
    const j = J / 4;
    if (j >= scenario.meanTarget && U >= scenario.floorTarget) {
      if (W < bestWC) {
        bestWC = W;
        bestMean = j;
        bestMask = b;
      } else if (W === bestWC && j > bestMean) {
        bestMean = j;
        bestMask = b;
      }
    }
  }
  return { bestWC, bestMean, bestMask };
}

function maskToInstructionIds(mask, h) {
  const out = [];
  for (let j = 0; j < h; j++) if (mask >> j & 1) out.push(`I${j + 1}`);
  return out;
}

function solveRobustnessAudit(email) {
  const scenario = buildRobustnessScenario(email);
  const h = scenario.instructions.length;
  const { bestWC, bestMean, bestMask } = bruteRobustnessOptimal(scenario);
  const optIds = maskToInstructionIds(bestMask, h);
  const { meanAcc, floorAcc, wordCount } = evalRobustnessSubset(optIds, scenario);
  const line = `${optIds.join(", ")}; ${wordCount}; ${(meanAcc * 100).toFixed(2)}; ${(floorAcc * 100).toFixed(2)}`;
  return {
    title: "The Multi-Model Robustness Audit",
    filter: `Optimal WC=${bestWC}, meanâ‰ˆ${bestMean.toFixed(4)} (â‰¥97% macro / â‰¥92% floor)`,
    answer: line,
    answerDisplay: line
  };
}

// â”€â”€ Slice Detective (q-slice-detective) â”€â”€
function buildSliceDetectiveData(email) {
  const id = "q-slice-detective";
  const t = new Math.seedrandom(`${email}#${id}`);
  const e = (h) => h[Math.floor(t() * h.length)];
  const s = (lo, hi) => lo + Math.floor(t() * (hi - lo + 1));
  const domains = ["product reviews", "support tickets", "news comments", "social media posts"];
  const companies = ["TechCorp", "RetailCo", "MediaHub", "FinanceNow", "HealthPlus"];
  const platforms = ["mobile", "desktop", "api"];
  const langs = ["en", "es", "fr", "hi", "zh"];
  const buckets = ["short", "medium", "long"];
  const labels = ["positive", "negative", "neutral"];
  const texts = [
    "Great experience overall, highly recommend",
    "Had trouble with the interface today",
    "Delivery was faster than expected",
    "Not satisfied with the response time",
    "Works exactly as described, very happy",
    "The quality could be better for the price",
    "Support team was helpful and responsive",
    "Encountered repeated errors in the app",
    "Outstanding service from start to finish",
    "Wish the process was more straightforward"
  ];
  const domain = e(domains);
  const company = e(companies);
  const plat0 = e(platforms);
  const lang0 = langs.slice(1)[Math.floor(t() * (langs.length - 1))];
  const l = 0.35 + t() * 0.16;
  const d = 0.83 + t() * 0.09;
  const minSize = s(25, 44);
  const u = minSize + s(10, 22);
  const m = s(800, 1199);
  const rows = [];
  for (let h = 0; h < u; h++) {
    const k = labels[Math.floor(t() * 3)];
    const useMatch = t() < l;
    const others = labels.filter((x) => x !== k);
    const pred = useMatch ? k : others[Math.floor(t() * 2)];
    rows.push({
      text: texts[Math.floor(t() * texts.length)],
      true_label: k,
      predicted_label: pred,
      platform: plat0,
      language_detected: lang0,
      message_length_bucket: e(buckets)
    });
  }
  for (let h = u; h < m; h++) {
    const plat = e(platforms);
    const lang = e(langs);
    const trueL = labels[Math.floor(t() * 3)];
    const pMatch = plat === plat0 && lang === lang0 ? l : d;
    const useMatch = t() < pMatch;
    const others = labels.filter((q) => q !== trueL);
    const pred = useMatch ? trueL : others[Math.floor(t() * 2)];
    rows.push({
      text: texts[Math.floor(t() * texts.length)],
      true_label: trueL,
      predicted_label: pred,
      platform: plat,
      language_detected: lang,
      message_length_bucket: e(buckets)
    });
  }
  shuffleInPlace(rows, t);
  const overallAccuracy = rows.filter((h) => h.true_label === h.predicted_label).length / rows.length;
  const meta = ["platform", "language_detected", "message_length_bucket"];
  let defn = "";
  let acc = Infinity;
  let size = 0;
  for (const col of meta) {
    const bucketsMap = {};
    for (const row of rows) {
      const key = row[col];
      if (!bucketsMap[key]) bucketsMap[key] = { c: 0, tt: 0 };
      bucketsMap[key].tt++;
      if (row.true_label === row.predicted_label) bucketsMap[key].c++;
    }
    for (const [key, { c: cc, tt }] of Object.entries(bucketsMap)) {
      if (tt >= minSize && cc / tt < acc) {
        acc = cc / tt;
        defn = `${col} = '${key}'`;
        size = tt;
      }
    }
  }
  for (let h = 0; h < meta.length; h++) {
    for (let k = h + 1; k < meta.length; k++) {
      const mp = {};
      for (const row of rows) {
        const key = `${row[meta[h]]}\0${row[meta[k]]}`;
        if (!mp[key]) mp[key] = { c: 0, tt: 0 };
        mp[key].tt++;
        if (row.true_label === row.predicted_label) mp[key].c++;
      }
      for (const [key, { c: E, tt }] of Object.entries(mp)) {
        if (tt >= minSize && E / tt < acc) {
          const [I, M] = key.split("\0");
          acc = E / tt;
          defn = `${meta[h]} = '${I}' AND ${meta[k]} = '${M}'`;
          size = tt;
        }
      }
    }
  }
  return {
    domain,
    company,
    minSize,
    overallAccuracy,
    worstSlice: { accuracy: acc, size, definition: defn }
  };
}

function solveSliceDetective(email) {
  const r = buildSliceDetectiveData(email);
  const oa = (r.overallAccuracy * 100).toFixed(1);
  const sa = (r.worstSlice.accuracy * 100).toFixed(1);
  // Do not prefix with /* */ — exam only allows queries that trim() to start WITH or SELECT.
  const sql = `WITH overall AS (
  SELECT AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END) AS oa FROM predictions
),
one AS (
  SELECT 'platform = ''' || platform || '''' AS slice_definition, COUNT(*) AS slice_size,
    AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END) AS slice_accuracy,
    (SELECT oa FROM overall) AS overall_accuracy FROM predictions GROUP BY platform HAVING COUNT(*) >= ${r.minSize}
  UNION ALL
  SELECT 'language_detected = ''' || language_detected || '''', COUNT(*),
    AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END),
    (SELECT oa FROM overall) FROM predictions GROUP BY language_detected HAVING COUNT(*) >= ${r.minSize}
  UNION ALL
  SELECT 'message_length_bucket = ''' || message_length_bucket || '''', COUNT(*),
    AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END),
    (SELECT oa FROM overall) FROM predictions GROUP BY message_length_bucket HAVING COUNT(*) >= ${r.minSize}
),
two AS (
  SELECT 'platform = ''' || platform || ''' AND language_detected = ''' || language_detected || '''' AS slice_definition,
    COUNT(*) AS slice_size,
    AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END) AS slice_accuracy,
    (SELECT oa FROM overall) AS overall_accuracy
  FROM predictions GROUP BY platform, language_detected HAVING COUNT(*) >= ${r.minSize}
  UNION ALL
  SELECT 'platform = ''' || platform || ''' AND message_length_bucket = ''' || message_length_bucket || '''', COUNT(*),
    AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END), (SELECT oa FROM overall)
  FROM predictions GROUP BY platform, message_length_bucket HAVING COUNT(*) >= ${r.minSize}
  UNION ALL
  SELECT 'language_detected = ''' || language_detected || ''' AND message_length_bucket = ''' || message_length_bucket || '''', COUNT(*),
    AVG(CASE WHEN true_label = predicted_label THEN 1.0 ELSE 0.0 END), (SELECT oa FROM overall)
  FROM predictions GROUP BY language_detected, message_length_bucket HAVING COUNT(*) >= ${r.minSize}
)
SELECT * FROM (SELECT * FROM one UNION ALL SELECT * FROM two) u
ORDER BY slice_accuracy ASC, slice_size DESC, slice_definition ASC LIMIT 1;`;
  return {
    title: "The Slice Detective",
    filter: `${r.company} / ${r.domain}, minSize ${r.minSize}, overall ~${oa}%`,
    answer: sql,
    answerDisplay: sql
  };
}

function clamp01(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function sampleScore(rng, mean, scale) {
  const u = Math.max(1e-10, rng());
  const v = rng();
  const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return clamp01(mean + scale * g, 1e-4, 0.9999);
}

// â”€â”€ Threshold Engineer (q-threshold-engineer) â”€â”€
function buildThresholdData(email) {
  const id = "q-threshold-engineer";
  const t = new Math.seedrandom(`${email}#${id}`);
  const e = (arr) => arr[Math.floor(t() * arr.length)];
  const company = e(["ContentFlow", "SafeWatch", "ModerateIQ", "TrustNet", "ClearVoice"]);
  const fnCost = e([3, 5, 7, 10]);
  const N = e([500, 800, 1000]);
  const pPos = 0.58 + 0.12 * t();
  const nMean = 0.28 + 0.14 * t();
  const pScale = 0.13 + 0.06 * t();
  const nScale = 0.13 + 0.06 * t();
  const posFrac = 0.25 + 0.2 * t();
  const rows = [];
  for (let g = 0; g < N; g++) {
    const v = t() < posFrac ? 1 : 0;
    const S = v === 1 ? sampleScore(t, pPos, pScale) : sampleScore(t, nMean, nScale);
    rows.push({ score: Math.round(S * 1e4) / 1e4, true_label: v });
  }
  const thresholds = [];
  for (let g = 5; g <= 95; g += 5) thresholds.push(Math.round(g) / 100);
  let bestT = thresholds[0];
  let bestCost = Infinity;
  const metrics = {};
  for (const th of thresholds) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const y of rows) {
      const pred = y.score >= th ? 1 : 0;
      if (pred === 1 && y.true_label === 1) tp++;
      else if (pred === 1 && y.true_label === 0) fp++;
      else if (pred === 0 && y.true_label === 1) fn++;
    }
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const cost = (fnCost * fn + fp) / N;
    metrics[th] = { cost, prec, rec };
    if (cost < bestCost) {
      bestCost = cost;
      bestT = th;
    }
  }
  const b = metrics[bestT];
  return {
    company,
    fnCost,
    N,
    csvText: null,
    correct: {
      optimal_threshold: bestT,
      precision: Math.round(b.prec * 1e4) / 1e4,
      recall: Math.round(b.rec * 1e4) / 1e4,
      expected_cost: Math.round(b.cost * 1e6) / 1e6
    },
    allMetrics: metrics
  };
}

function solveThresholdEngineer(email) {
  const r = buildThresholdData(email);
  const sql = `WITH thresholds AS (
  SELECT t / 100.0 AS thr FROM generate_series(5, 95, 5) AS gs(t)
),
m AS (
  SELECT thr,
    SUM(CASE WHEN score >= thr AND true_label = 1 THEN 1 ELSE 0 END) AS tp,
    SUM(CASE WHEN score >= thr AND true_label = 0 THEN 1 ELSE 0 END) AS fp,
    SUM(CASE WHEN score < thr AND true_label = 1 THEN 1 ELSE 0 END) AS fn
  FROM thresholds CROSS JOIN predictions GROUP BY thr
),
costed AS (
  SELECT thr AS optimal_threshold,
    ROUND(tp * 1.0 / NULLIF(tp + fp, 0), 4) AS precision_at_threshold,
    ROUND(tp * 1.0 / NULLIF(tp + fn, 0), 4) AS recall_at_threshold,
    ROUND((${r.fnCost} * fn + fp) * 1.0 / ${r.N}, 6) AS expected_cost_at_threshold
  FROM m
)
SELECT * FROM costed ORDER BY expected_cost_at_threshold ASC LIMIT 1;`;
  return {
    title: "The Threshold Engineer",
    filter: `${r.company}, FN cost ${r.fnCost}x, N=${r.N}`,
    answer: `Expected row: threshold=${r.correct.optimal_threshold}, prec=${r.correct.precision}, rec=${r.correct.recall}, cost=${r.correct.expected_cost}\n\n${sql}`,
    answerDisplay: sql
  };
}

function percentileLinear(sorted, p) {
  const n = sorted.length;
  if (n === 0) return 0;
  const e = p * (n - 1);
  const s = Math.floor(e);
  const a = Math.ceil(e);
  if (s === a) return sorted[s];
  return sorted[s] + (sorted[a] - sorted[s]) * (e - s);
}

// â”€â”€ Latency SLA (q-latency-sla-checker) â”€â”€
function buildLatencySlaData(email) {
  const id = "q-latency-sla-checker";
  const t = new Math.seedrandom(`${email}#${id}`);
  const e = (arr) => arr[Math.floor(t() * arr.length)];
  const company = e(["StreamCore", "DataPulse", "CloudNova", "SyncGrid", "FlowStack"]);
  const nEp = 3 + Math.floor(t() * 3);
  const epPool = ["/api/search", "/api/users", "/api/orders", "/api/auth", "/api/reports", "/api/upload", "/api/analytics", "/api/notifications"];
  const picked = [];
  const seen = new Set();
  for (let _ = 0; _ < nEp; _++) {
    let T;
    do {
      T = e(epPool);
    } while (seen.has(T));
    seen.add(T);
    picked.push(T);
  }
  const p50Sla = e([50, 80, 100]);
  const p95Sla = e([200, 300, 400]);
  const p99Sla = e([500, 800, 1000]);
  const errSla = e([1, 2, 5]);
  const types = ["pass", "latency_tail", "error_rate"];
  while (types.length < nEp) types.push(e(["pass", "latency_tail"]));
  shuffleInPlace(types, t);
  const base = new Date("2025-01-15T00:00:00Z");
  const logs = [];
  const summary = [];
  for (let _ = 0; _ < nEp; _++) {
    const endpoint = picked[_];
    const x = types[_];
    const g = 500 + Math.floor(t() * 500);
    const v = p50Sla * (0.4 + 0.3 * t());
    const S = v * 0.3;
    let h = 0;
    let k = 0;
    let A = 0;
    if (x === "latency_tail") {
      h = 0.04 + 0.04 * t();
      k = p99Sla * (1.5 + t());
      A = k * 0.3;
    }
    let errP = x === "error_rate" ? errSla + 0.5 + t() * 3 : errSla * (0.1 + 0.4 * t());
    const latencies = [];
    let errs = 0;
    for (let C = 0; C < g; C++) {
      let b;
      if (h > 0 && t() < h) b = sampleScore(t, k, A);
      else b = sampleScore(t, v, S);
      b = Math.round(b * 100) / 100;
      const R = t() < errP / 100;
      if (R) errs++;
      const L = new Date(base.getTime() + Math.floor(t() * 7 * 86400000));
      logs.push({
        endpoint,
        latency_ms: b,
        is_error: R,
        logged_at: L.toISOString().replace("T", " ").slice(0, 19)
      });
      latencies.push(b);
    }
    latencies.sort((a, b) => a - b);
    const I = percentileLinear(latencies, 0.5);
    const M = percentileLinear(latencies, 0.95);
    const q = percentileLinear(latencies, 0.99);
    const N = Math.round(errs / g * 1e4) / 100;
    const D = [];
    if (I > p50Sla) D.push("p50");
    if (M > p95Sla) D.push("p95");
    if (q > p99Sla) D.push("p99");
    if (N > errSla) D.push("error_rate");
    summary.push({
      endpoint,
      p50_ms: Math.round(I * 100) / 100,
      p95_ms: Math.round(M * 100) / 100,
      p99_ms: Math.round(q * 100) / 100,
      error_rate_pct: N,
      sla_status: D.length === 0 ? "PASS" : "FAIL",
      violated_slas: D.sort().join(",")
    });
  }
  summary.sort((a, b) => a.endpoint.localeCompare(b.endpoint));
  return { company, p50_sla: p50Sla, p95_sla: p95Sla, p99_sla: p99Sla, error_sla: errSla, correct: summary };
}

globalThis.buildLatencySlaData = buildLatencySlaData;

function solveLatencySla(email) {
  const r = buildLatencySlaData(email);
  const p50 = r.p50_sla;
  const p95 = r.p95_sla;
  const p99 = r.p99_sla;
  const er = r.error_sla;
  const sql = `WITH m AS (
  SELECT endpoint,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms), 2) AS p50_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 2) AS p95_ms,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 2) AS p99_ms,
    ROUND(COUNT(*) FILTER (WHERE is_error) * 100.0 / COUNT(*), 2) AS error_rate_pct
  FROM api_logs
  GROUP BY endpoint
)
SELECT endpoint, p50_ms, p95_ms, p99_ms, error_rate_pct,
  CASE WHEN p50_ms <= ${p50} AND p95_ms <= ${p95} AND p99_ms <= ${p99} AND error_rate_pct <= ${er} THEN 'PASS' ELSE 'FAIL' END AS sla_status,
  regexp_replace(
    (CASE WHEN p50_ms > ${p50} THEN 'p50,' ELSE '' END) ||
    (CASE WHEN p95_ms > ${p95} THEN 'p95,' ELSE '' END) ||
    (CASE WHEN p99_ms > ${p99} THEN 'p99,' ELSE '' END) ||
    (CASE WHEN error_rate_pct > ${er} THEN 'error_rate,' ELSE '' END),
    ',+$', ''
  ) AS violated_slas
FROM m
ORDER BY endpoint;`;
  const expect = r.correct.map((x) => `${x.endpoint}: ${x.sla_status} ${x.violated_slas || "(none)"}`).join("\n");
  return {
    title: "The Latency SLA Checker",
    filter: r.company,
    answer: `${expect}\n\n/* SLAs: p50<=${p50} p95<=${p95} p99<=${p99} err<=${er}% */\n${sql}`,
    answerDisplay: sql
  };
}

function tokenizeLeakage(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).filter((w) => w.length > 0);
}

function ngramSet(tokens, n) {
  const s = new Set();
  for (let i = 0; i <= tokens.length - n; i++) {
    s.add(tokens.slice(i, i + n).join(" "));
  }
  return s;
}

function overlapScore(question, corpusNgrams, n) {
  const qt = tokenizeLeakage(question);
  if (qt.length < n) return 0;
  const qg = ngramSet(qt, n);
  let hits = 0;
  for (const g of qg) if (corpusNgrams.has(g)) hits++;
  return qg.size > 0 ? hits / qg.size : 0;
}

// â”€â”€ Leakage Auditor (q-leakage-auditor) â”€â”€
function buildLeakageData(email) {
  const id = "q-leakage-auditor";
  const t = new Math.seedrandom(`${email}#${id}`);
  const e = (arr) => arr[Math.floor(t() * arr.length)];
  const s = (lo, hi) => lo + Math.floor(t() * (hi - lo + 1));
  const domains = ["general trivia", "coding puzzles", "science questions", "history facts", "math word problems"];
  const companies = ["BenchmarkLab", "EvalForge", "TestCraft", "MetricsHub", "ValidAI"];
  // Same draw order as exam Dn(): Cn, An, Mn, In — keeps RNG stream aligned.
  const company = e(companies);
  const domain = e(domains);
  const N = e([40, 50, 60]);
  const threshold = e([0.3, 0.4, 0.5]);
  const corpusPool = [
    "the speed of light in a vacuum is approximately 299792 kilometres per second",
    "the mitochondria is often referred to as the powerhouse of the cell",
    "water boils at one hundred degrees celsius at standard atmospheric pressure",
    "the largest planet in our solar system is jupiter which has a diameter of about 143000 kilometres",
    "the great wall of china stretches over twenty one thousand kilometres",
    "deoxyribonucleic acid carries the genetic instructions for all living organisms",
    "the pythagorean theorem states that the square of the hypotenuse equals the sum of squares of the other sides",
    "photosynthesis is the process by which plants convert sunlight into chemical energy",
    "the amazon river discharges more freshwater into the ocean than any other river on earth",
    "the human brain contains approximately eighty six billion neurons",
    "the boiling point of ethanol is seventy eight point four degrees celsius",
    "mount everest is the highest mountain above sea level at eight thousand eight hundred forty nine metres",
    "the speed of sound in air at sea level is approximately three hundred forty three metres per second",
    "the first programmable electronic computer was eniac completed in nineteen forty five",
    "the average distance from the earth to the moon is three hundred eighty four thousand kilometres",
    "the formula for computing compound interest is a equals p times one plus r over n raised to nt",
    "a binary search algorithm finds an element in a sorted array in order log n time",
    "the french revolution began in seventeen eighty nine with the storming of the bastille",
    "isaac newton formulated the three laws of motion in his principia mathematica in sixteen eighty seven",
    "charles darwin published on the origin of species in eighteen fifty nine",
    "the human genome contains approximately three billion base pairs of dna",
    "the area of a circle is equal to pi times the radius squared",
    "the treaty of versailles was signed in nineteen nineteen ending the first world war",
    "the bohr model describes electrons orbiting the nucleus at fixed quantised energy levels",
    "an algorithm is said to run in polynomial time if its complexity is bounded by a polynomial function",
    "the riemann hypothesis concerns the distribution of prime numbers and remains unproven",
    "the haversine formula computes great circle distances between two points on a sphere",
    "gradient descent iteratively adjusts parameters by moving in the direction of the negative gradient",
    "a convolutional neural network applies learned filters across spatial dimensions of the input",
    "the central limit theorem states that sample means approach a normal distribution as sample size grows",
    "the krebs cycle is a series of chemical reactions used to generate energy in aerobic organisms",
    "ohms law states that voltage equals current multiplied by resistance",
    "the doppler effect describes how the observed frequency of a wave changes with relative motion",
    "bernoullis principle relates fluid speed to pressure in incompressible laminar flow",
    "the second law of thermodynamics states that entropy in an isolated system never decreases",
    "a blockchain is a distributed ledger that records transactions in cryptographically linked blocks",
    "the halting problem is undecidable meaning no algorithm can determine whether any program halts",
    "an api or application programming interface defines how software components communicate",
    "relational databases organise data into tables with rows and columns linked by foreign keys",
    "a hash function maps data of arbitrary size to a fixed size digest deterministically",
    "the tcp ip model divides network communication into four abstraction layers",
    "sql stands for structured query language and is used to manage relational databases",
    "a decision tree partitions the feature space using axis aligned splits to minimise impurity",
    "support vector machines find the hyperplane that maximises the margin between two classes",
    "backpropagation computes gradients of the loss with respect to each parameter via the chain rule",
    "regularisation techniques such as dropout reduce overfitting in neural networks",
    "the attention mechanism in transformers computes a weighted sum of values guided by query key similarity",
    "a confusion matrix shows the counts of true positives false positives true negatives and false negatives",
    "precision is the fraction of predicted positives that are truly positive",
    "recall is the fraction of actual positives that are correctly identified by the model"
  ];
  const l = [...corpusPool];
  shuffleInPlace(l, t);
  const d = l.slice(0, 38);
  const corpusText = d.join(". ") + ".";
  const corpusTok = tokenizeLeakage(corpusText);
  const corpusNgrams = ngramSet(corpusTok, 8);
  const cCount = s(5, 12);
  const genericQs = [
    "What is the difference between supervised and unsupervised learning?",
    "Explain how a hash table handles collisions using chaining.",
    "What is the time complexity of quicksort in the average case?",
    "How does transformer architecture differ from recurrent neural networks?",
    "What is the purpose of a validation set in machine learning?",
    "Describe the difference between precision and recall.",
    "What does it mean for a function to be pure in functional programming?",
    "Explain the concept of overfitting and how to detect it.",
    "What is the difference between a process and a thread?",
    "How does public key cryptography enable secure communication?",
    "What is the bias-variance tradeoff in statistical modelling?",
    "Explain what a race condition is and how it arises.",
    "What is the purpose of normalisation in relational databases?",
    "How does gradient clipping help training deep neural networks?",
    "What is the difference between accuracy and F1 score?",
    "Describe the MapReduce programming model.",
    "What is memoisation and when should you use it?",
    "Explain the difference between a stack and a queue.",
    "What is a deadlock and what conditions must hold for one to occur?",
    "How does the CAP theorem constrain distributed database design?",
    "What is the difference between a type I error and a type II error?",
    "Explain what cross-validation is used for.",
    "What does ACID stand for in database transactions?",
    "How does a bloom filter work and what is its false positive rate?",
    "What is the difference between eager and lazy evaluation?",
    "Explain the concept of idempotency in HTTP methods.",
    "What is the purpose of an index in a relational database?",
    "How does the attention mechanism help models handle long-range dependencies?",
    "What is a kernel trick and why is it used in SVMs?",
    "Explain what a RESTful API is and its key constraints.",
    "What is the difference between L1 and L2 regularisation?",
    "How does batch normalisation speed up neural network training?",
    "What is an abstract syntax tree and how is it used in compilation?",
    "Explain the concept of eventual consistency in distributed systems.",
    "What is the halting problem and why is it important in computer science?",
    "How does a generative adversarial network work?",
    "What is the difference between horizontal and vertical scaling?",
    "Explain what a pointer is and how pointer arithmetic works.",
    "What is the role of the learning rate in gradient descent?",
    "How does consistent hashing reduce rebalancing in distributed caches?",
    "What is the difference between a B-tree and a B+ tree?",
    "Explain the concept of tail-call optimisation.",
    "What is the purpose of a foreign key constraint?",
    "How does the EM algorithm handle latent variables?",
    "What is the difference between synchronous and asynchronous I/O?",
    "Explain how skip-gram word embeddings are trained.",
    "What is the danger of data leakage in machine learning pipelines?",
    "How does a lock-free data structure avoid the need for mutexes?",
    "What is the Liskov substitution principle?",
    "How does reinforcement learning differ from supervised learning?",
    "What is the significance of the Turing test?",
    "Explain the concept of information entropy.",
    "What is a sufficient statistic and why does it matter?",
    "How does the Floyd-Warshall algorithm compute all-pairs shortest paths?",
    "What is the difference between depth-first and breadth-first search?",
    "Explain how federated learning preserves data privacy.",
    "What is the purpose of the softmax function in classification?",
    "How does Monte Carlo sampling approximate intractable distributions?",
    "What is a Merkle tree and where is it used?",
    "Explain the difference between optimistic and pessimistic concurrency control."
  ];
  const templates = [
    (b) => `According to recent sources, ${b}. Is this statement correct?`,
    (b) => `True or false: ${b}.`,
    (b) => `A student claims that ${b}. Evaluate this claim.`,
    (b) => `Based on the following fact \u2014 "${b}" \u2014 what can be concluded?`,
    (b) => `Verify the following statement: ${b}.`,
    (b) => `The following was found online: "${b}". Assess its accuracy.`
  ];
  const contQs = d.slice(0, cCount).map((b) => templates[Math.floor(t() * templates.length)](b));
  const genericShuffled = genericQs.slice();
  shuffleInPlace(genericShuffled, t);
  const genericSlice = genericShuffled.slice(0, N - cCount);
  const gHigh = 0.72 + 0.15 * t();
  const gLow = 0.12 + 0.08 * t();
  const S = Math.min(0.97, gHigh + gLow);
  const h = gHigh;
  const allQ = [];
  for (const b of contQs) {
    allQ.push({ question: b, is_correct: t() < S ? 1 : 0, _contam: true });
  }
  for (const q of genericSlice) {
    allQ.push({ question: q, is_correct: t() < h ? 1 : 0, _contam: false });
  }
  shuffleInPlace(allQ, t);
  const overlaps = allQ.map((b) => overlapScore(b.question, corpusNgrams, 8));
  const contamFlags = overlaps.map((b) => b > threshold);
  const contaminatedCount = contamFlags.filter(Boolean).length;
  const reportedAccuracy = Math.round(allQ.reduce((a, b) => a + b.is_correct, 0) / allQ.length * 1e4) / 100;
  const clean = allQ.filter((_, R) => !contamFlags[R]);
  const adjustedAccuracy = clean.length > 0
    ? Math.round(clean.reduce((a, b) => a + b.is_correct, 0) / clean.length * 1e4) / 100
    : 0;
  return {
    company,
    domain,
    N,
    threshold,
    correctAnswer: { contaminatedCount, reportedAccuracy, adjustedAccuracy }
  };
}

function solveLeakageAuditor(email) {
  const r = buildLeakageData(email);
  const { contaminatedCount, reportedAccuracy, adjustedAccuracy } = r.correctAnswer;
  const ans = `${contaminatedCount}, ${reportedAccuracy.toFixed(2)}, ${adjustedAccuracy.toFixed(2)}`;
  return {
    title: "The Leakage Auditor",
    filter: `overlap threshold > ${r.threshold}, N=${r.N}`,
    answer: ans,
    answerDisplay: ans
  };
}

function solveNonDeterministicPlaceholder(title, body) {
  return {
    title,
    filter: "Requires exam UI, API token, or downloaded CSV",
    answer: body,
    answerDisplay: body
  };
}

async function computeAllAnswersGA6() {
  const email = (document.getElementById("emailInput")?.value || "").trim();
  if (!email) {
    alert("Enter your registered email.");
    return;
  }
  if (typeof Math.seedrandom !== "function") {
    alert("seedrandom failed to load.");
    return;
  }

  const btn = document.getElementById("computeBtn");
  const loading = document.getElementById("loading");
  const results = document.getElementById("results");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Computing...';
  loading.style.display = "block";
  results.style.display = "none";

  try {
    const X = globalThis.GA6_EXTRA;
    if (!X) throw new Error("Load app_ga6_more.js after app_ga6.js (see index_ga6.html).");

    let py = null;
    let pyErr = "";
    try {
      py = await X.runPyodideExam(email);
    } catch (e) {
      pyErr = e instanceof Error ? e.message : String(e);
    }

    const apiTok = (document.getElementById("apiToken")?.value || "").trim();

    const answers = [
      X.solveBugHunter(email),
      X.solveBinaryRubric(email),
      solveRobustnessAudit(email),
      await X.solveTokenMiserLive(email, apiTok),
      py
        ? X.solveDataContractFromJson(py.contract)
        : {
            title: "Data Contract Violation Detector",
            filter: "Pyodide",
            answer: `Serve this folder over http:// (Live Server) so ga6_py_contract.py loads.\n${pyErr}`,
            answerDisplay: pyErr || "Pyodide failed"
          },
      solveSliceDetective(email),
      solveThresholdEngineer(email),
      X.solveFlakyTestFinder(email),
      solveEmbeddingAuditor(email),
      solveLeakageAuditor(email),
      py
        ? X.solveTrainTestFromJson(py.train)
        : {
            title: "Train-Test Contamination Scanner",
            filter: "Pyodide",
            answer: pyErr,
            answerDisplay: pyErr || "—"
          },
      py
        ? X.solveIdempotencyFromJson(py.idem)
        : {
            title: "The Idempotency Prober",
            filter: "Pyodide",
            answer: pyErr,
            answerDisplay: pyErr || "—"
          },
      solveLatencySla(email),
      solveBenchmarkOverfitter(email),
      X.solveCoverageGapFull(email)
    ];

    renderResultsGA6(answers);
  } catch (err) {
    console.error(err);
    results.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtmlGA6(err.message)}</div>`;
    results.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Compute Answers";
    loading.style.display = "none";
  }
}

function renderResultsGA6(answers) {
  const results = document.getElementById("results");
  let html = `<h2 class="mb-4" style="font-weight:700">GA6 Computed Answers</h2>`;
  answers.forEach((q, i) => {
    const num = i + 1;
    const isCode = q.isCodeQuestion || (q.answerDisplay && q.answerDisplay.includes("SELECT"));
    const displayText = q.answerDisplay || String(q.answer);
    html += `
      <div class="answer-card p-3 mb-3">
        <div class="d-flex align-items-start gap-3">
          <div class="q-number">${num}</div>
          <div class="flex-grow-1">
            <div class="q-title">${escapeHtmlGA6(q.title)}</div>
            <div class="q-filter mt-1">${escapeHtmlGA6(q.filter)}</div>
            <div class="mt-2">
              <div class="answer-label">${isCode ? "SQL / guidance" : "Answer"}</div>
              <div class="answer-value" id="ans-${i}">${escapeHtmlGA6(displayText)}</div>
            </div>
            <div class="mt-2">
              <button type="button" class="copy-btn" onclick="copyAnswerGA6(${i})">Copy</button>
            </div>
          </div>
        </div>
      </div>`;
  });
  results.innerHTML = html;
  results.style.display = "block";
  window._answersGA6 = answers;
}

function copyAnswerGA6(i) {
  const el = document.getElementById(`ans-${i}`);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const cards = document.querySelectorAll(".answer-card");
    const btn = cards[i]?.querySelector(".copy-btn");
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  });
}

function escapeHtmlGA6(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
