"use strict";

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
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

