"use strict";

// Static helper answers for Project 1 questions that don't depend on email or external servers.
// Currently includes Question 2: 300‑digit number & its SHA‑256 hash.

const PROJECT1_ANSWERS = [
  {
    id: "p1-q2-300-digit-sha256",
    title: "Q2 – 300‑digit number & SHA‑256 hash",
    filter: "Submit JSON with shape {\"number\":\"(300 digit)\",\"hash\":\"sha256-hex\"}",
    number:
      "474636484571546781212569179841302837334502170583696482942361638482970333146883524445787274655350328256438440436916694881996284097223769214862366328589324227572342687653551258868849899559652741026178136799801568920656653212443072989262721366518360594911343448015048928601410510328910600704828965313876",
    hash: "baab7aadb4c45af173444cd9f3922d1ec54bcc72d90d1eddcafb4850c99a846d",
  },
];

function renderProject1Answers() {
  const results = document.getElementById("results");
  if (!results) return;

  let html = `<h2 class="mb-4" style="font-weight:700;letter-spacing:-0.03em">Project 1 Helper Answers</h2>`;

  PROJECT1_ANSWERS.forEach((q, i) => {
    const json = JSON.stringify({ number: q.number, hash: q.hash });
    const jsonId = `p1-json-${i}`;

    html += `
      <div class="answer-card mb-3">
        <div class="d-flex align-items-start gap-3">
          <div class="q-number">${i + 1}</div>
          <div class="flex-grow-1">
            <div class="q-title">${escapeHtml(q.title)}</div>
            <div class="q-filter mt-1">${escapeHtml(q.filter)}</div>
            <div class="mt-3">
              <div class="answer-label">Number</div>
              <div class="answer-value">${escapeHtml(q.number)}</div>
            </div>
            <div class="mt-3">
              <div class="answer-label">SHA‑256 hash</div>
              <div class="answer-value">${escapeHtml(q.hash)}</div>
            </div>
            <div class="mt-3">
              <div class="answer-label">Submission JSON</div>
              <div class="answer-json" id="${jsonId}">${escapeHtml(json)}</div>
            </div>
            <div class="mt-2">
              <button class="copy-btn" onclick="copyProject1Json(${i})">
                <span>Copy JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  });

  results.innerHTML = html;
  results.style.display = "block";
}

function copyProject1Json(i) {
  const el = document.getElementById(`p1-json-${i}`);
  if (!el) return;
  const text = el.textContent.trim();
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const cards = document.querySelectorAll(".answer-card");
      const btn = cards[i]?.querySelector(".copy-btn");
      if (!btn) return;
      const original = btn.textContent;
      btn.textContent = "Copied!";
      btn.style.borderColor = "#22c55e";
      btn.style.color = "#bbf7d0";
      setTimeout(() => {
        btn.textContent = original;
        btn.style.borderColor = "";
        btn.style.color = "";
      }, 1500);
    })
    .catch(() => {});
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", renderProject1Answers);

