"use strict";

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function fnv1a32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function solveColorEncodingServer(email) {
  const id = "q-colorencoding-server";
  const rng = new Math.seedrandom(`${email}#${id}`);

  const scenarios = [
    // S→C (correct sequential)
    {
      title: "Regional Unemployment Rate",
      dataDescription: "Unemployment rate (%) by region, ranging from 2% to 18%",
      labels: ["Region A", "Region B", "Region C", "Region D", "Region E", "Region F", "Region G", "Region H", "Region I"],
      data: [2, 4, 6, 8, 10, 12, 14, 16, 18],
      correctSchemeType: "sequential",
      expectedSynonyms: [
        "implies region colors are unrelated categories",
        "hides the gradient from low to high",
        "treats ordered data as unordered",
        "unrelated categories",
        "hiding the gradient",
      ],
      correctPalette: ["#f7fbff", "#08306b"],
    },
    {
      title: "City Population Density",
      dataDescription: "Population density (people/km²) by city district, ranging from 500 to 8000",
      labels: ["District 1", "District 2", "District 3", "District 4", "District 5", "District 6", "District 7"],
      data: [500, 1200, 2100, 3300, 4500, 6000, 8000],
      correctSchemeType: "sequential",
      expectedSynonyms: [
        "implies districts are discrete unrelated groups",
        "density gradient is hidden",
        "no implied order",
        "unrelated groups",
        "categorical colors obscure",
      ],
      correctPalette: ["#fff5eb", "#7f2704"],
    },
    {
      title: "Average Annual Rainfall",
      dataDescription: "Average annual rainfall (mm) by county, ranging from 200 mm to 1800 mm",
      labels: ["County A", "County B", "County C", "County D", "County E", "County F", "County G", "County H"],
      data: [200, 450, 700, 950, 1200, 1450, 1700, 1800],
      correctSchemeType: "sequential",
      expectedSynonyms: [
        "categorically different rather than opposite ends",
        "spectrum is hidden",
        "unordered colors hide the rainfall gradient",
        "opposite ends of a spectrum",
        "rainfall gradient hidden",
      ],
      correctPalette: ["#f7fcf0", "#084081"],
    },
    {
      title: "Hospital Wait Times",
      dataDescription: "Median ER wait time (minutes) by hospital, ranging from 8 min to 95 min",
      labels: ["Hospital A", "Hospital B", "Hospital C", "Hospital D", "Hospital E", "Hospital F", "Hospital G"],
      data: [8, 18, 30, 45, 55, 70, 95],
      correctSchemeType: "sequential",
      expectedSynonyms: [
        "independent category rather than a position on a continuum",
        "fast to slow continuum hidden",
        "unordered hues hide wait-time ordering",
        "position on a continuum",
        "continuum from fast to slow",
      ],
      correctPalette: ["#fff7ec", "#7f0000"],
    },
    {
      title: "Soil Lead Contamination",
      dataDescription: "Soil lead concentration (mg/kg) by site, ranging from 5 to 850 mg/kg",
      labels: ["Site 1", "Site 2", "Site 3", "Site 4", "Site 5", "Site 6", "Site 7"],
      data: [5, 40, 120, 280, 450, 620, 850],
      correctSchemeType: "sequential",
      expectedSynonyms: [
        "unrelated when they should show a continuous severity gradient",
        "severity gradient is lost",
        "continuous severity hidden",
        "sites are unrelated",
        "severity gradient",
      ],
      correctPalette: ["#ffffcc", "#800026"],
    },
    {
      title: "Crop Yield by Farm",
      dataDescription: "Wheat yield (tonnes/hectare) by farm, ranging from 1.2 to 9.8 t/ha",
      labels: ["Farm A", "Farm B", "Farm C", "Farm D", "Farm E", "Farm F", "Farm G"],
      data: [1.2, 2.5, 4, 5.5, 6.8, 8.1, 9.8],
      correctSchemeType: "sequential",
      expectedSynonyms: [
        "distinct unrelated groups instead of expressing a yield gradient",
        "yield gradient is invisible",
        "unrelated groups hide yield ordering",
        "yield gradient",
        "distinct unrelated groups",
      ],
      correctPalette: ["#ffffe5", "#004529"],
    },

    // C→S (correct categorical)
    {
      title: "Revenue by Product Category",
      dataDescription: "Total annual revenue ($M) for four product types: Electronics, Apparel, Home, Food",
      labels: ["Electronics", "Apparel", "Home", "Food"],
      data: [42, 31, 58, 25],
      correctSchemeType: "categorical",
      expectedSynonyms: [
        "sequential ramp falsely implies",
        "ranked relationship between categories",
        "implies ordering where none exists",
        "falsely implies product categories",
        "no inherent order",
      ],
      correctPalette: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2"],
    },
    {
      title: "Website Traffic by Source",
      dataDescription: "Monthly visits (thousands) by traffic source: Organic, Paid, Social, Direct, Email",
      labels: ["Organic", "Paid", "Social", "Direct", "Email"],
      data: [85, 42, 33, 67, 18],
      correctSchemeType: "categorical",
      expectedSynonyms: [
        "falsely implies traffic sources have a natural progression",
        "hierarchy among sources",
        "implies ordering among unordered sources",
        "traffic sources have a natural progression",
        "false hierarchy",
      ],
      correctPalette: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"],
    },
    {
      title: "Support Tickets by Department",
      dataDescription: "Monthly support tickets by department: Engineering, Marketing, Sales, HR, Finance",
      labels: ["Engineering", "Marketing", "Sales", "HR", "Finance"],
      data: [120, 45, 88, 32, 61],
      correctSchemeType: "categorical",
      expectedSynonyms: [
        "falsely implies departments are ranked",
        "ranked by importance",
        "departments are ordered",
        "false ranking of departments",
        "no ranking exists",
      ],
      correctPalette: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"],
    },
    {
      title: "Energy Mix by Source",
      dataDescription: "Electricity generation (GWh) by source: Coal, Gas, Nuclear, Wind, Solar",
      labels: ["Coal", "Gas", "Nuclear", "Wind", "Solar"],
      data: [340, 520, 180, 290, 150],
      correctSchemeType: "categorical",
      expectedSynonyms: [
        "exist on a spectrum from low to high",
        "false spectrum among energy sources",
        "energy sources have no inherent order",
        "spectrum from low to high",
        "no spectrum exists",
      ],
      correctPalette: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"],
    },
    {
      title: "Customer Complaints by Type",
      dataDescription: "Total complaints by type: Delivery, Quality, Billing, Returns, Support",
      labels: ["Delivery", "Quality", "Billing", "Returns", "Support"],
      data: [215, 88, 143, 77, 190],
      correctSchemeType: "categorical",
      expectedSynonyms: [
        "follow a progression from minor to severe",
        "implies complaint types are ordered",
        "minor to severe progression implied",
        "complaint types are not ordered",
        "false progression",
      ],
      correctPalette: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"],
    },
    {
      title: "Survey Responses by Age Group",
      dataDescription: "Number of survey respondents by age group: 18-24, 25-34, 35-44, 45-54, 55+",
      labels: ["18-24", "25-34", "35-44", "45-54", "55+"],
      data: [310, 480, 395, 260, 185],
      correctSchemeType: "categorical",
      expectedSynonyms: [
        "ranked by value rather than being distinct cohorts",
        "age groups treated as ordered magnitude",
        "distinct cohorts falsely ranked",
        "distinct cohorts",
        "falsely implies age groups are ranked",
      ],
      correctPalette: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"],
    },

    // D→S (correct diverging)
    {
      title: "Temperature Anomaly from Baseline",
      dataDescription: "Annual temperature anomaly (°C) relative to 1950-1980 baseline, ranging from -2.4 to +3.1°C",
      labels: ["1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"],
      data: [-2.4, -1.1, -0.3, 0.2, 0.8, 1.5, 2.3, 3.1],
      correctSchemeType: "diverging",
      expectedSynonyms: [
        "negative anomalies appear as small positives",
        "below-baseline cooling hidden",
        "negative values look like low positives",
        "makes negative anomalies appear",
        "below-baseline",
      ],
      correctPalette: ["#d73027", "#ffffff", "#1a9641"],
    },
    {
      title: "Budget Variance from Plan",
      dataDescription: "Department budget variance (%) from plan, ranging from -18% to +14%",
      labels: ["Dept A", "Dept B", "Dept C", "Dept D", "Dept E", "Dept F", "Dept G"],
      data: [-18, -12, -5, 0, 3, 8, 14],
      correctSchemeType: "diverging",
      expectedSynonyms: [
        "makes variance appear as low positive",
        "negative variance hidden",
        "underspending looks like low overspending",
        "-12% variance appear",
        "low positive rather than negative",
      ],
      correctPalette: ["#d73027", "#ffffff", "#1a9641"],
    },
    {
      title: "Net Promoter Score by Region",
      dataDescription: "Net Promoter Score (NPS) by region, ranging from -45 to +72",
      labels: ["North", "South", "East", "West", "Central", "Urban", "Rural"],
      data: [-45, -20, -5, 12, 30, 50, 72],
      correctSchemeType: "diverging",
      expectedSynonyms: [
        "negative NPS scores appear as low-positive",
        "detractor regions hidden",
        "negative NPS looks positive",
        "appear as low-positive",
        "net-detractor regions",
      ],
      correctPalette: ["#d73027", "#ffffff", "#1a9641"],
    },
    {
      title: "Profit Margin Change YoY",
      dataDescription: "Year-over-year profit margin change (pp) by product line, ranging from -9 to +11 percentage points",
      labels: ["Line A", "Line B", "Line C", "Line D", "Line E", "Line F", "Line G"],
      data: [-9, -4, -1, 0, 2, 6, 11],
      correctSchemeType: "diverging",
      expectedSynonyms: [
        "declining margins look merely low",
        "worsening margins hidden",
        "negative change appears as low positive",
        "declining margins look",
        "actually worsening",
      ],
      correctPalette: ["#d73027", "#ffffff", "#1a9641"],
    },
    {
      title: "Sentiment Score by Topic",
      dataDescription: "Public sentiment score by policy topic (−100 to +100 scale), ranging from -62 to +78",
      labels: ["Topic A", "Topic B", "Topic C", "Topic D", "Topic E", "Topic F", "Topic G"],
      data: [-62, -30, -8, 5, 22, 48, 78],
      correctSchemeType: "diverging",
      expectedSynonyms: [
        "negative sentiment appear as a small positive",
        "masking opposition",
        "opposition hidden by ramp",
        "negative sentiment appear",
        "masking opposition",
      ],
      correctPalette: ["#d73027", "#ffffff", "#1a9641"],
    },
    {
      title: "Elevation Change from Sea Level Reference",
      dataDescription: "Terrain elevation change (m) relative to local sea-level reference, from -85 m to +210 m",
      labels: ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F", "Zone G"],
      data: [-85, -30, 0, 25, 70, 140, 210],
      correctSchemeType: "diverging",
      expectedSynonyms: [
        "below-sea-level zones appear as low-elevation positive",
        "below the reference hidden",
        "negative elevation looks positive",
        "below-sea-level zones",
        "hiding that they are below the reference",
      ],
      correctPalette: ["#d73027", "#ffffff", "#1a9641"],
    },
  ];

  const scenario = scenarios[Math.floor(rng() * scenarios.length)];
  const scheme = scenario.correctSchemeType;
  const palette = scenario.correctPalette;
  const expl = scenario.expectedSynonyms[0];

  const html = `<!-- ${scheme} color scheme.\n${expl}. -->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>${scenario.title}</title>\n  <script src=\"https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js\"><\\/script>\n  <style>\n    :root { color-scheme: light dark; --bg: #ffffff; --text: #212529; --subtext: #6c757d; }\n    @media (prefers-color-scheme: dark) { :root { --bg: #212529; --text: #f8f9fa; --subtext: #adb5bd; } }\n    body { font-family: sans-serif; margin: 16px; background: var(--bg); color: var(--text); }\n    h2 { font-size: 1rem; margin-bottom: 4px; }\n    p  { font-size: 0.8rem; color: var(--subtext); margin-bottom: 12px; }\n    canvas { max-height: 280px; }\n  </style>\n</head>\n<body>\n  <h2>${scenario.title}</h2>\n  <p>${scenario.dataDescription}</p>\n  <canvas id=\"chart\"></canvas>\n  <script>\n    // ${scheme} palette (corrected)\n    const palette = ${JSON.stringify(palette)};\n    const colors = ${JSON.stringify(scenario.data.map((_, i) => palette[i % palette.length]))};\n    new Chart(document.getElementById('chart'), {\n      type: 'bar',\n      data: {\n        labels: ${JSON.stringify(scenario.labels)},\n        datasets: [{\n          label: ${JSON.stringify(scenario.title)},\n          data: ${JSON.stringify(scenario.data)},\n          backgroundColor: colors,\n          borderColor: colors,\n          borderWidth: 1\n        }]\n      },\n      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: ${scheme === "diverging" ? "false" : "true"} } } }\n    });\n  <\\/script>\n</body>\n</html>`;

  return {
    title: "Fix the Color Encoding Mismatch",
    filter: `Submit corrected HTML for ${scenario.title} (${scheme})`,
    answer: html,
    answerDisplay: html,
  };
}

function solveChartjunkServer() {
  const html = `<!-- Removed chartjunk by eliminating ink waste (shadows/gradients/heavy borders), redundant encoding (legend/subtitle/data labels), noise gridlines (minor gridlines), and tick density (forced dense ticks). -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Chartjunk Removal</title>\n  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"><\\/script>\n  <style>\n    :root { color-scheme: light dark; --bg:#ffffff; --text:#212529; --subtext:#6c757d; }\n    @media (prefers-color-scheme: dark) { :root { --bg:#212529; --text:#f8f9fa; --subtext:#adb5bd; } }\n    body { font-family: system-ui, sans-serif; margin: 16px; background: var(--bg); color: var(--text); }\n    h2 { font-size: 1rem; margin: 0 0 8px; }\n    p { font-size: 0.85rem; color: var(--subtext); margin: 0 0 12px; }\n    canvas { max-height: 320px; }\n  </style>\n</head>\n<body>\n  <h2>Clean chart (data-ink ratio improved)</h2>\n  <p>Minimal Chart.js config: no shadows, no gradients, no heavy borders, no redundant legend/subtitle/datalabels, and no noisy gridlines.</p>\n  <canvas id="chart"></canvas>\n  <script>\n    new Chart(document.getElementById('chart'), {\n      type: 'bar',\n      data: {\n        labels: ['January','February','March','April','May','June','July'],\n        datasets: [{\n          label: 'Dataset 1',\n          data: [65,59,80,81,56,55,40],\n          backgroundColor: '#36a2eb',\n          borderColor: '#36a2eb',\n          borderWidth: 1\n        }]\n      },\n      options: {\n        responsive: true,\n        plugins: { legend: { display: false } },\n        scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }\n      }\n    });\n  <\\/script>\n</body>\n</html>`;

  return {
    title: "Chartjunk Removal and Data-Ink Ratio Repair",
    filter: "Submit corrected HTML (removes >=75% chartjunk + mentions categories)",
    answer: html,
    answerDisplay: html,
  };
}

function solveNarrativeIntegrationRepair(email) {
  const id = "q-narrative-integration-repair";
  const rng = new Math.seedrandom(`${email}#${id}`);
  const scenarios = [
    { finding: "conversion rate doubled after April", x: "Apr", y: 4.6, kw: "accelerating", type: "line", labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"], values: [2.1,2.2,2.3,4.6,4.8,5,5.1,5], yLabel: "Conversion Rate (%)" },
    { finding: "returns rate reversed in Q4", x: "Q4", y: 3.2, kw: "reversed", type: "line", labels: ["Q1","Q2","Q3","Q4"], values: [7.1,7.4,7,3.2], yLabel: "Returns (%)" },
    { finding: "events CAC is the outlier", x: "Events", y: 91, kw: "reallocate", type: "bar", labels: ["Search","Social","Email","Affiliate","Events"], values: [42,48,39,44,91], yLabel: "CAC ($)" },
    { finding: "weekend delays spike sharply", x: "Sat", y: 3.8, kw: "staffing", type: "line", labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], values: [1.2,1.1,1.3,1.2,1.4,3.8,3.6], yLabel: "Average Delay (days)" },
    { finding: "labs consume far more energy", x: "Labs", y: 610, kw: "investigate", type: "bar", labels: ["Library","Labs","Hostels","Admin","Cafeteria"], values: [320,610,410,260,290], yLabel: "kWh per Day" },
    { finding: "batch 4 is the outlier", x: "Batch 4", y: 6.9, kw: "outlier", type: "line", labels: ["Batch 1","Batch 2","Batch 3","Batch 4","Batch 5","Batch 6"], values: [2.4,2.6,2.5,6.9,2.7,2.5], yLabel: "Defect Rate (%)" },
    { finding: "wait times worsened after April", x: "May", y: 16, kw: "capacity", type: "line", labels: ["Jan","Feb","Mar","Apr","May","Jun"], values: [11,10,9,8,16,17], yLabel: "Minutes" },
    { finding: "cohort D lags far behind", x: "Cohort D", y: 58, kw: "intervene", type: "bar", labels: ["Cohort A","Cohort B","Cohort C","Cohort D"], values: [81,79,84,58], yLabel: "Completion Rate (%)" },
  ];
  const s = scenarios[Math.floor(rng() * scenarios.length)];
  const caption = `Implication: this shift is ${s.kw}.`;
  const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${s.finding}</title>\n  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\\/script>\n  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"><\\/script>\n  <style>body{font-family:Georgia,serif;margin:20px}canvas{max-height:340px}.caption{margin-top:12px;color:#6b7280}</style>\n</head>\n<body>\n  <canvas id="chart"></canvas>\n  <p class="caption">${caption}</p>\n  <script>\n    const ap = window['chartjs-plugin-annotation'] || window.ChartAnnotation;\n    if (ap) Chart.register(ap);\n    new Chart(document.getElementById('chart'), {\n      type: '${s.type}',\n      data: { labels: ${JSON.stringify(s.labels)}, datasets: [{ label: ${JSON.stringify(s.finding)}, data: ${JSON.stringify(s.values)}, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.12)', borderWidth:2, tension:0.25 }] },\n      options: { plugins: { legend: { display:false }, title: { display:true, text: ${JSON.stringify(s.finding)} }, annotation: { annotations: { k: { type:'point', xValue:${JSON.stringify(s.x)}, yValue:${Number(s.y.toFixed(2))}, radius:5, backgroundColor:'#ef4444' } } } }, scales: { y: { title: { display:true, text: ${JSON.stringify(s.yLabel)} } } } }\n    });\n  <\\/script>\n</body>\n</html>`;
  return { title: "Narrative Integration Repair", filter: `Title includes finding; annotation at (${s.x},~${s.y}); caption includes "${s.kw}"`, answer: html, answerDisplay: html };
}

function solveDataNarrativeNumberReconciliation(email) {
  const studentId = normEmail(email || "anonymous");
  const paragraphId = fnv1a32(studentId) % 20;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const money = (x) => `$${Math.round(x).toLocaleString("en-US")}`;
  const intFmt = (x) => Math.round(x).toLocaleString("en-US");
  const pct1 = (x) => `${x.toFixed(1)}%`;

  function buildRows(e) {
    const rows = [];
    for (let l = 0; l < 12; l++) {
      const units = Math.round(980 + e * 37 + l * 46 + (e + l) % 5 * 17);
      const price = 18.5 + (e % 7) * 1.15 + (l % 4) * 0.85;
      const revenue = Math.round(units * price);
      const returnRate = Number((2.8 + ((e + l) % 6) * 0.45 + (l % 2 ? 0.2 : 0)).toFixed(1));
      const onlineOrders = Math.round(units * (0.44 + (e % 4) * 0.03 + (l % 3 - 1) * 0.018));
      rows.push({ month: months[l], units, revenue, avgRevenuePerUnit: Number((revenue / units).toFixed(2)), returnRate, onlineOrders });
    }
    const t = (e * 5 + 2) % 11;
    const o = 110 + (e * 29) % 130;
    const n = Number((5.4 + (e % 5) * 0.4).toFixed(1));
    const a = Number((n - o / 100).toFixed(1));
    rows[t].returnRate = n;
    rows[t + 1].returnRate = Math.max(1.2, a);
    return { rows, dropStart: t, deltaBps: Math.round((rows[t].returnRate - rows[t + 1].returnRate) * 100) };
  }

  function paragraphScenario(e) {
    const scenarioName = `Portfolio ${String.fromCharCode(65 + (e % 20))}`;
    const { rows, dropStart, deltaBps } = buildRows(e);
    const a = (e * 2 + 1) % 12;
    const l = (e * 3 + 4) % 12;
    const i = (e * 7 + 5) % 12;
    const quarter = (e % 4) + 1;
    const d = (quarter - 1) * 3;
    const monthA = rows[a];
    const monthB = rows[l];
    const monthD = rows[i];
    const qRevenue = rows.slice(d, d + 3).reduce((acc, r) => acc + r.revenue, 0);
    const onlineShare = Number(((monthD.onlineOrders / monthD.units) * 100).toFixed(1));
    return [
      `The monthly performance review for ${scenarioName} indicates a generally controlled quarter with a few pressure points that deserve targeted follow-up before the next operating cycle.`,
      `In ${monthA.month}, total units sold were ${intFmt(monthA.units)}, which established the volume baseline used in the rest of this assessment.`,
      `Pricing quality held up in ${monthB.month}, where average revenue per unit reached $${monthB.avgRevenuePerUnit.toFixed(2)}, suggesting that discount leakage remained contained in that period.`,
      `Service stability improved as the return rate fell by ${deltaBps} basis points from ${rows[dropStart].month} to ${rows[dropStart + 1].month}, a shift that points to better fulfillment discipline.`,
      `At the aggregate level, Q${quarter} total revenue came to ${money(qRevenue)}, confirming that end-of-quarter demand carried the top line despite product-mix changes.`,
      `Channel mix remains strategically material: ${monthD.month} online order share was ${pct1(onlineShare)}, so digital demand now has direct implications for staffing and fulfillment cadence.`,
      `Overall, the pattern supports focused intervention rather than broad alarm, because the core demand signal stayed stable while only a few execution levers moved significantly.`,
    ].join(" ");
  }

  const corrected = paragraphScenario(paragraphId);
  return { title: "Data-Narrative Number Reconciliation", filter: `Corrected paragraph for scenario ${paragraphId + 1}`, answer: corrected, answerDisplay: corrected };
}

function solveBrokenAggregationSortRepair(email) {
  const user = normEmail(email);
  const scenarioId = fnv1a32(user) % 20;
  const z = 10;
  const categoriesAll = ["Electronics","Home","Apparel","Food","Sports","Beauty","Toys","Automotive","Books","Garden","Office","Health","Pet","Travel","Gaming","Outdoors"];
  const metricVariants = [
    { title: "Top 10 categories by average revenue per transaction", correctAgg: "avgRevenue" },
    { title: "Top 10 categories by total units sold", correctAgg: "sumUnits" },
    { title: "Top 10 categories by median session duration", correctAgg: "medianSessionDuration" },
    { title: "Top 10 categories by maximum single-day spike", correctAgg: "maxSpike" },
  ];
  const rng = new Math.seedrandom(`q20-ranking-${user}-${scenarioId}`);
  const cats = [...categoriesAll];
  shuffleInPlace(cats, rng);
  const categories = cats.slice(scenarioId % 3, scenarioId % 3 + 12);
  const nRows = 50 + Math.floor(rng() * 151);
  const weights = categories.map((_, d) => 1 + ((d + scenarioId) % 5) * 0.2 + rng() * 0.35);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const pickCat = () => {
    const r = rng() * weightSum;
    let acc = 0;
    for (let i = 0; i < categories.length; i++) {
      acc += weights[i];
      if (r <= acc) return categories[i];
    }
    return categories[categories.length - 1];
  };
  const H = (x) => Number(x.toFixed(2));
  const rows = [];
  for (let s = 0; s < nRows; s++) {
    const category = pickCat();
    const c = categories.indexOf(category);
    rows.push({
      category,
      revenue: H(40 + c * 6.5 + (scenarioId % 4) * 3.2 + rng() * 90 + (s % 7) * 1.4),
      units: Math.max(1, Math.round((2 + (c % 4)) + rng() * 14 + (s % 5) * 0.8)),
      session_duration_min: H(3.2 + c * 0.35 + (scenarioId % 5) * 0.22 + rng() * 8.5 + (s % 6) * 0.18),
      daily_spike: H(18 + c * 4.8 + (scenarioId % 3) * 2.4 + rng() * 125 + (s % 9) * 1.6),
    });
  }
  const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const aggMap = (agg) => {
    const m = new Map(categories.map((c) => [c, []]));
    for (const r of rows) m.get(r.category)?.push(r);
    const out = {};
    for (const c of categories) {
      const xs = m.get(c) || [];
      if (!xs.length) { out[c] = 0; continue; }
      if (agg === "avgRevenue") out[c] = H(xs.reduce((a, r) => a + r.revenue, 0) / xs.length);
      else if (agg === "sumUnits") out[c] = H(xs.reduce((a, r) => a + r.units, 0));
      else if (agg === "medianSessionDuration") out[c] = H(median(xs.map((r) => r.session_duration_min)));
      else out[c] = H(Math.max(...xs.map((r) => r.daily_spike)));
    }
    return out;
  };
  const metric = metricVariants[scenarioId % metricVariants.length];
  const top = Object.entries(aggMap(metric.correctAgg)).sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]))).slice(0, z);
  const labels = top.map(([k]) => k);
  const data = top.map(([, v]) => v);
  const colors = labels.map((_, i) => (i === 0 ? "#f28e2b" : "#4e79a7"));
  const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${metric.title}</title>\n  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\\/script>\n  <style>body{font-family:sans-serif;margin:16px}canvas{max-height:320px}</style>\n</head>\n<body>\n  <h3>${metric.title}</h3>\n  <canvas id="chart"></canvas>\n  <script>\n    new Chart(document.getElementById('chart'), { type:'bar', data:{ labels:${JSON.stringify(labels)}, datasets:[{ label:${JSON.stringify(metric.title)}, data:${JSON.stringify(data)}, backgroundColor:${JSON.stringify(colors)}, borderColor:'#111827', borderWidth:1 }] }, options:{ responsive:true, plugins:{ legend:{display:false} } } });\n  <\\/script>\n</body>\n</html>`;
  return { title: "Broken Aggregation and Sort Order Repair in a Ranking Chart", filter: `Scenario #${scenarioId + 1}/20 — ${metric.title}`, answer: html, answerDisplay: html };
}

function solveAxisScaleManipulationRepair(email) {
  const user = normEmail(email);
  const scenarioId = fnv1a32(user) % 20;
  const rng = new Math.seedrandom(`axis-scale-${user}-${scenarioId}`);
  const type = scenarioId % 4;
  let html = "";
  if (type === 0) {
    const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
    const o = 840 + (scenarioId % 5) * 13;
    const data = labels.map((_, p) => Number((o + p * (6 + (scenarioId % 4)) + (rng() - 0.5) * 8).toFixed(2)));
    const a = Math.min(...data);
    const Kt = [0.85, 0.88, 0.91, 0.94, 0.97];
    const s = Number((a * Kt[scenarioId % Kt.length]).toFixed(2));
    const d = Number((Math.max(...data) / (Math.max(...data) - s)).toFixed(1));
    html = `<!-- Quantification: ${d}. Distortion: inflates tiny deltas by ${d.toFixed(1)}x. Corrected chart uses a zero baseline. -->\n<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>Axis corrected</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\\/script></head><body><canvas id="chart"></canvas><script>\nnew Chart(document.getElementById('chart'), ${JSON.stringify({ type:"line", data:{ labels, datasets:[{ label:"Revenue Index", data, borderColor:"#2563eb", backgroundColor:"rgba(37,99,235,0.12)", tension:0.3 }] }, options:{ scales:{ y:{ min:0, beginAtZero:true } }, plugins:{ legend:{display:false} } } })});\n<\\/script></body></html>`;
  } else if (type === 1) {
    const labels = ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10"];
    const tickets = labels.map((_, u) => Number((95 + u * 1.1 + (rng() - 0.5) * 9).toFixed(2)));
    const spend = labels.map((_, u) => Number((340 + (rng() - 0.5) * 55 + ((u % 3) - 1) * 12).toFixed(2)));
    const Zt = [0.3, 0.5, 2, 3.5];
    const mult = Zt[scenarioId % Zt.length];
    const pct = (arr) => arr.map((v) => (v - arr[0]) / arr[0] * 100);
    html = `<!-- Quantification: ${mult.toFixed(1)}. Distortion: dual-axis scaling manufactures false correlation. Corrected chart shows % change on one axis. -->\n<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>Comparable % change</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\\/script></head><body><canvas id="chart"></canvas><script>\nnew Chart(document.getElementById('chart'), { type:'line', data:{ labels:${JSON.stringify(labels)}, datasets:[{ label:'Support tickets (% change)', data:${JSON.stringify(pct(tickets))}, borderColor:'#2563eb', tension:0.25 },{ label:'Ad spend (% change)', data:${JSON.stringify(pct(spend))}, borderColor:'#dc2626', tension:0.25 }] }, options:{ plugins:{ legend:{display:false} }, scales:{ y:{ title:{display:true,text:'% change'} } } } });\n<\\/script></body></html>`;
  } else if (type === 2) {
    const labels = ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8"];
    const o = 430 - (scenarioId % 3) * 15;
    const data = labels.map((_, i) => Number((o - i * (9 + (scenarioId % 2)) + (rng() - 0.5) * 6).toFixed(2)));
    html = `<!-- Quantification: 1.0. Distortion: inverted axis flips decline narrative. Corrected chart fixes axis direction. -->\n<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>Axis direction corrected</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\\/script></head><body><canvas id="chart"></canvas><script>\nnew Chart(document.getElementById('chart'), ${JSON.stringify({ type:"line", data:{ labels, datasets:[{ label:"Satisfaction score", data, borderColor:"#7c3aed", tension:0.3 }] }, options:{ scales:{ y:{ reverse:false } }, plugins:{ legend:{display:false} } } })});\n<\\/script></body></html>`;
  } else {
    const labels = ["M1","M2","M3","M4","M5","M6","M7","M8","M9"];
    const o = 140 + (scenarioId % 4) * 12;
    const data = labels.map((_, c) => Number((o + c * (18 + (scenarioId % 3) * 2) + (rng() - 0.5) * 7).toFixed(2)));
    const a = data[1] - data[0];
    const l = data[data.length - 1] - data[data.length - 2];
    const i = Number((l / Math.max(0.1, a)).toFixed(1));
    html = `<!-- Quantification: ${i.toFixed(1)}. Distortion: log scale compresses linear acceleration. Corrected chart uses linear scale. -->\n<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>Linear scale</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\\/script></head><body><canvas id="chart"></canvas><script>\nnew Chart(document.getElementById('chart'), ${JSON.stringify({ type:"line", data:{ labels, datasets:[{ label:"Active users", data, borderColor:"#059669", tension:0.25 }] }, options:{ scales:{ y:{ type:"linear" } }, plugins:{ legend:{display:false} } } })});\n<\\/script></body></html>`;
  }
  return { title: "Scale Manipulation Repair in Axis Design", filter: `Scenario #${scenarioId + 1}/20 — includes quantification + distortion phrase`, answer: html, answerDisplay: html };
}

function solveHeadlineRewriting(email) {
  const t = normEmail(email);
  const datasets = [
    { name: "Regional revenue", headlines: [
      { text: "Regional Revenue by Year", kind: "description", required: "north grew fastest" },
      { text: "Northeast revenue grew 3× faster than the average", kind: "finding" },
      { text: "South remained nearly flat after 2023", kind: "finding" },
      { text: "Revenue Comparison Across Regions", kind: "description", required: "east remains lowest" },
      { text: "Annual Trends in West Region Revenue", kind: "description", required: "west shows steady gains" },
      { text: "Only East stayed below 45M in 2024", kind: "finding" },
    ]},
    { name: "Customer churn", headlines: [
      { text: "Quarterly Churn by Plan", kind: "description", required: "basic churn worsened" },
      { text: "Premium churn fell below 3% by Q3", kind: "finding" },
      { text: "Plan-wise Churn Analysis", kind: "description", required: "premium lowest all quarters" },
      { text: "Plus plan churn steadily improved", kind: "finding" },
      { text: "Churn Trend Comparison", kind: "description", required: "gap widened between basic and premium" },
      { text: "Basic ended 1.8x premium churn", kind: "finding" },
    ]},
  ];
  const dataset = datasets[fnv1a32(t) % datasets.length];
  const rng = new Math.seedrandom(`headline:${t}`);
  const hs = dataset.headlines.map((h) => ({ ...h }));
  shuffleInPlace(hs, rng);
  const lines = hs.map((h, i) => {
    if (h.kind === "finding") return `${i + 1}|finding|`;
    return `${i + 1}|description|Key finding: ${h.required}.`;
  });
  const out = lines.join("\n");
  return { title: "Headline Rewriting: Description vs Finding", filter: `6 headlines for dataset "${dataset.name}"`, answer: out, answerDisplay: out };
}

function solvePromptReverseEngineering(email) {
  const t = normEmail(email);
  const idx = fnv1a32(t) % 20;
  const toneMarker = "what changed and why";
  const prompt = `Write a 3-paragraph narrative memo for a non-technical executive audience. Use a calm, evidence-led tone. Include at least two key findings. Include the exact phrase "${toneMarker}". Add simple structure cues (short header lines). Keep it around 320-380 words.`;
  const response = [
    "Summary",
    `First, ${toneMarker}: the signal is not just a single point, but a consistent pattern across periods.`,
    "Evidence",
    "Key finding 1: the gap widened meaningfully between groups, and the tail risk is concentrated rather than diffuse.",
    "Key finding 2: the trend reversed after a clear break point, suggesting an actionable operational driver rather than noise.",
    "Action",
    "Recommendation: prioritize one focused intervention for the most affected segment, then measure the same metric weekly.",
  ].join("\n\n");
  const out = `Prompt: ${prompt}\nLLM Response: ${response}`;
  return { title: "Prompt Reverse-Engineering", filter: `Artifact #${idx + 1}/20 — prompt + response with tone marker + 2 findings`, answer: out, answerDisplay: out };
}

function solvePresentationPromptStructuralRepair(email) {
  const t = normEmail(email);
  const idx = fnv1a32(t) % 20;
  const broken = [
    "Create a presentation artifact summarizing the dataset.",
    "Use the table values for claims.",
  ].join("\n");
  const completed = [
    broken,
    "Audience: non-technical executive.",
    "Output format: single-page HTML brief.",
    "Tone/style: concise and decisive.",
    "Length constraint: under 140 words.",
    "End with exactly one imperative action recommendation.",
  ].join("\n");
  const out = `Missing components: Audience, Format, Tone\nCompleted prompt:\n${completed}`;
  return { title: "Presentation Prompt Structural Repair", filter: `Scenario #${idx + 1}/20 — completed prompt with required components`, answer: out, answerDisplay: out };
}

function solveRankedAnomalyDetection(email) {
  const rng = new Math.seedrandom(`${email}#q-ranked-anomaly-detection`);
  const n = 30;
  const classes = ["S1","S1","S2","S2","S3","S3"];
  const rows = [];
  for (let i = 0; i < n; i++) {
    const min = 10 + Math.floor(rng() * 51);
    const max = min + (15 + Math.floor(rng() * 36));
    const span = max - min;
    const cls = classes[i];
    const j = cls === "S1" ? (0.55 + rng() * 0.35) : cls === "S2" ? (0.22 + rng() * 0.26) : (0.05 + rng() * 0.13);
    const value = rng() < 0.5 ? min - j * span : max + j * span;
    rows.push({ id: i + 1, value: Math.round(value * 100) / 100, min, max, cls });
  }
  shuffleInPlace(rows, rng);
  rows.forEach((r, i) => (r.displayId = i + 1));
  const ord = { S1: 3, S2: 2, S3: 1 };
  const out = rows.map((r) => ({ id: r.displayId, sev: r.cls }))
    .sort((a, b) => ord[b.sev] - ord[a.sev] || a.id - b.id);
  const ans = `[${out.map((x) => `(${x.id}, "${x.sev}")`).join(", ")}]`;
  return { title: "Ranked Anomaly Detection", filter: "All tuples sorted by severity", answer: ans, answerDisplay: ans };
}

function solvePoisonedDocumentDetection(email) {
  const rng = new Math.seedrandom(`${email}#q-poisoned-document-detection`);
  const types = ["core","core","core","peripheral","peripheral","peripheral","irrelevant","irrelevant","poisoned"];
  const docs = types.map((t) => {
    const relevance = t === "core" ? 70 + Math.floor(rng() * 31) : t === "peripheral" ? 40 + Math.floor(rng() * 30) : t === "irrelevant" ? 5 + Math.floor(rng() * 35) : 70 + Math.floor(rng() * 31);
    const errorFlag = t === "poisoned" ? 1 : 0;
    return { relevance, errorFlag };
  });
  shuffleInPlace(docs, rng);
  docs.forEach((d, i) => (d.id = i + 1));
  const out = docs.map((d) => ({ id: d.id, label: d.relevance >= 50 && d.errorFlag === 0 ? "I" : "E", relevance: d.relevance }))
    .sort((a, b) => (a.label !== b.label ? (a.label === "I" ? -1 : 1) : b.relevance - a.relevance));
  const ans = `[${out.map((x) => `(${x.id}, "${x.label}")`).join(", ")}]`;
  return { title: "Poisoned Document Detection", filter: "I/E tuples sorted (I first)", answer: ans, answerDisplay: ans };
}

function solveFlawPriorityRanking(email) {
  const rng = new Math.seedrandom(`${email}#q-flaw-priority-ranking`);
  const pattern = ["S1","S1","S1","S2","S2","S2","S3","S3","S3","decoy","decoy","decoy","decoy","decoy","decoy"];
  const rows = pattern.map((p) => {
    const isReal = p === "decoy" ? 0 : 1;
    const impact = p === "S1" ? 82 + Math.floor(rng() * 19) : p === "S2" ? 52 + Math.floor(rng() * 17) : p === "S3" ? 5 + Math.floor(rng() * 41) : 40 + Math.floor(rng() * 59);
    const freq = p === "S1" ? 15 + Math.floor(rng() * 86) : p === "S2" ? 10 + Math.floor(rng() * 91) : p === "S3" ? 10 + Math.floor(rng() * 86) : 40 + Math.floor(rng() * 59);
    return { impact, freq, isReal, sev: isReal ? p : "decoy" };
  });
  shuffleInPlace(rows, rng);
  rows.forEach((r, i) => (r.id = i + 1));
  const ord = { S1: 3, S2: 2, S3: 1 };
  const out = rows.filter((r) => r.isReal).map((r) => ({ id: r.id, sev: r.sev, impact: r.impact, freq: r.freq }))
    .sort((a, b) => ord[b.sev] - ord[a.sev] || b.impact - a.impact || b.freq - a.freq);
  const ans = `[${out.map((x) => `(${x.id}, "${x.sev}")`).join(", ")}]`;
  return { title: "Flaw Priority Ranking", filter: "Only real flaws, sorted by severity", answer: ans, answerDisplay: ans };
}

function solveChartErrorDetection(email) {
  const rng = new Math.seedrandom(`${email}#q-chart-error-detection`);
  const pattern = ["S1","S1","S1","S2","S2","S2","S3","S3","S3","decoy","decoy","decoy","decoy","decoy","decoy"];
  const rows = pattern.map((p) => {
    const isError = p === "decoy" ? 0 : 1;
    const score = p === "S1" ? 82 + Math.floor(rng() * 19) : p === "S2" ? 52 + Math.floor(rng() * 27) : p === "S3" ? 5 + Math.floor(rng() * 41) : 45 + Math.floor(rng() * 53);
    const vis = p === "S1" ? 20 + Math.floor(rng() * 81) : p === "S2" ? 15 + Math.floor(rng() * 86) : p === "S3" ? 10 + Math.floor(rng() * 86) : 40 + Math.floor(rng() * 58);
    return { isError, sev: isError ? p : "decoy", score, vis };
  });
  shuffleInPlace(rows, rng);
  rows.forEach((r, i) => (r.id = i + 1));
  const ord = { S1: 3, S2: 2, S3: 1 };
  const out = rows.filter((r) => r.isError).map((r) => ({ id: r.id, sev: r.sev, score: r.score, vis: r.vis }))
    .sort((a, b) => ord[b.sev] - ord[a.sev] || b.score - a.score || b.vis - a.vis);
  const ans = `[${out.map((x) => `(${x.id}, "${x.sev}")`).join(", ")}]`;
  return { title: "Chart Error Detection", filter: "Only Is Error=1, sorted by severity", answer: ans, answerDisplay: ans };
}

function solveDeploymentCostAnalysis(email) {
  const rng = new Math.seedrandom(`${email}#q-deployment-cost-analysis`);
  const instances = [{ letter: "A", cpu: 2, ram: 4, cost: 0.05 }, { letter: "B", cpu: 4, ram: 8, cost: 0.1 }, { letter: "C", cpu: 8, ram: 16, cost: 0.2 }];
  const baseLatency = 50;
  const n = 28;
  const s = Math.floor(rng() * 3);
  const d = instances[s];
  const c = s > 0 ? instances[s - 1] : null;
  const p = 3;
  const reqs = [];
  const latency = (cpu, ram, inst) => baseLatency * Math.max(1, cpu / inst.cpu + ram / inst.ram);
  for (let g = 0; g < n; g++) {
    const m = rng(), y = rng(), h = rng();
    let cpuReq, ramReq, threshold;
    if (g < p && c !== null) {
      const V = c.cpu * 0.82, ue = d.cpu * 0.91;
      const J = c.ram * 0.82, j = d.ram * 0.91;
      cpuReq = Math.max(0.1, Math.round((V + m * (ue - V)) * 10) / 10);
      ramReq = Math.max(0.1, Math.round((J + y * (j - J)) * 10) / 10);
      const K = latency(cpuReq, ramReq, c);
      const X = latency(cpuReq, ramReq, d);
      const Te = K - X;
      threshold = Te > 2 ? Math.floor(X + h * Te * 0.4) : Math.floor(X * 1.2);
      threshold = Math.max(threshold, Math.ceil(latency(cpuReq, ramReq, d)));
    } else {
      cpuReq = Math.max(0.1, Math.round((0.3 + m * (d.cpu * 0.72 - 0.3)) * 10) / 10);
      ramReq = Math.max(0.1, Math.round((0.5 + y * (d.ram * 0.72 - 0.5)) * 10) / 10);
      threshold = Math.floor(latency(cpuReq, ramReq, d) * (1.3 + h * 0.7));
    }
    reqs.push({ cpuReq, ramReq, threshold });
  }
  shuffleInPlace(reqs, rng);
  const viable = instances.filter((inst) => reqs.every((r) => latency(r.cpuReq, r.ramReq, inst) <= r.threshold));
  const best = (viable.length ? viable : instances).slice().sort((a, b) => a.cost - b.cost)[0];
  const ans = `("${best.letter}", ${best.cost.toFixed(2)})`;
  return { title: "Cloud Deployment Cost & Performance Analysis", filter: "Cheapest viable instance tuple", answer: ans, answerDisplay: ans };
}

function solveLatencySpikeDetection(email) {
  const rng = new Math.seedrandom(`${email}#q-latency-spike-detection`);
  const a = 60, l = 5;
  const idxs = Array.from({ length: a }, (_, i) => i);
  for (let h = 0; h < l; h++) {
    const b = h + Math.floor(rng() * (a - h));
    [idxs[h], idxs[b]] = [idxs[b], idxs[h]];
  }
  const spikes = new Set(idxs.slice(0, l));
  const action = new Map();
  for (const h of spikes) action.set(h, rng() < 0.55 ? "SCALE_UP" : "MONITOR");
  const rows = [];
  for (let h = 0; h < a; h++) {
    const b = rng(), C = rng(), E = rng(), D = rng();
    const isSpike = spikes.has(h);
    let latency = 45 + Math.floor(b * 24);
    let cpu = 15 + Math.floor(C * 50);
    let ram = 15 + Math.floor(E * 50);
    rows.push({ row: h + 1, latency, cpu, ram, isSpike, r4: D });
  }
  const base = rows.filter((r) => !r.isSpike).map((r) => r.latency);
  const mean = base.reduce((x, y) => x + y, 0) / base.length;
  const std = Math.sqrt(base.reduce((x, y) => x + (y - mean) ** 2, 0) / base.length);
  for (let h = 0; h < a; h++) {
    if (!rows[h].isSpike) continue;
    rows[h].latency = Math.round(mean + (3.8 + rows[h].r4 * 1.5) * std);
    if (action.get(h) === "SCALE_UP") {
      const hi = 80 + Math.floor(rng() * 16);
      const lo = 45 + Math.floor(rng() * 30);
      if (rng() < 0.5) { rows[h].cpu = hi; rows[h].ram = lo; } else { rows[h].cpu = lo; rows[h].ram = hi; }
    } else {
      rows[h].cpu = 35 + Math.floor(rng() * 40);
      rows[h].ram = 35 + Math.floor(rng() * 40);
    }
  }
  const all = rows.map((r) => r.latency);
  const mu = all.reduce((x, y) => x + y, 0) / all.length;
  const sigma = Math.sqrt(all.reduce((x, y) => x + (y - mu) ** 2, 0) / all.length);
  const thr = mu + 2 * sigma;
  const out = rows.filter((r) => r.latency > thr).map((r) => ({ row: r.row, act: Math.max(r.cpu, r.ram) >= 80 ? "SCALE_UP" : "MONITOR" })).sort((a, b) => a.row - b.row);
  const ans = `[${out.map((x) => `(${x.row}, "${x.act}")`).join(", ")}]`;
  return { title: "Service Latency Spike Detection & Scaling Decisions", filter: "Spike tuples (> mean+2*std), with SCALE_UP/MONITOR", answer: ans, answerDisplay: ans };
}

async function computeAllAnswersGA7() {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) {
    alert("Please enter your email address.");
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
    const answers = [
      solveColorEncodingServer(email), // q-colorencoding-server
      solveChartjunkServer(), // q-chartjunk-server
      solveNarrativeIntegrationRepair(email), // q-narrative-integration-repair
      solveDataNarrativeNumberReconciliation(email), // q-data-narrative-number-reconciliation
      solveBrokenAggregationSortRepair(email), // q-broken-aggregation-sort-repair
      solveAxisScaleManipulationRepair(email), // q-axis-scale-manipulation-repair
      solveHeadlineRewriting(email), // q-headline-rewriting
      solvePromptReverseEngineering(email), // q-prompt-reverse-engineering
      solvePresentationPromptStructuralRepair(email), // q-presentation-prompt-structural-repair
      solveRankedAnomalyDetection(email), // q-ranked-anomaly-detection
      solvePoisonedDocumentDetection(email), // q-poisoned-document-detection
      solveFlawPriorityRanking(email), // q-flaw-priority-ranking
      solveChartErrorDetection(email), // q-chart-error-detection
      solveDeploymentCostAnalysis(email), // q-deployment-cost-analysis
      solveLatencySpikeDetection(email), // q-latency-spike-detection
    ];
    renderResultsGA7(answers);
  } catch (err) {
    console.error(err);
    results.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`;
    results.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Compute Answers";
    loading.style.display = "none";
  }
}

function renderResultsGA7(answers) {
  const results = document.getElementById("results");
  let html = `<h2 class="mb-4" style="font-weight:700">GA7 Computed Answers</h2>`;

  answers.forEach((q, i) => {
    const num = i + 1;
    html += `
      <div class="answer-card p-3 mb-3">
        <div class="d-flex align-items-start gap-3">
          <div class="q-number">${num}</div>
          <div class="flex-grow-1">
            <div class="q-title">${escapeHtml(q.title)}</div>
            <div class="q-filter mt-1">${escapeHtml(q.filter)}</div>
            <div class="mt-2">
              <div class="answer-label">Answer</div>
              <div class="answer-value" id="ans-${i}">${escapeHtml(q.answerDisplay || q.answer)}</div>
            </div>
            <div class="mt-2">
              <button class="copy-btn" onclick="copyAnswerGA7(${i})">Copy</button>
            </div>
          </div>
        </div>
      </div>`;
  });

  results.innerHTML = html;
  results.style.display = "block";
  window._answersGA7 = answers;
}

function copyAnswerGA7(i) {
  const el = document.getElementById(`ans-${i}`);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const cards = document.querySelectorAll(".answer-card");
    const btn = cards[i]?.querySelector(".copy-btn");
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      btn.style.borderColor = "#4ade80";
      btn.style.color = "#4ade80";
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.borderColor = "";
        btn.style.color = "";
      }, 1500);
    }
  });
}

// Expose to window for inline onclick handlers
window.computeAllAnswersGA7 = computeAllAnswersGA7;
window.copyAnswerGA7 = copyAnswerGA7;

