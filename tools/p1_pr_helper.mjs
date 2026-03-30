#!/usr/bin/env node
/**
 * Project 1 Q3 helper: create a tiny PR in a public repo.
 *
 * This script uses YOUR GitHub token to:
 * - (optionally) fork an upstream repo to your account
 * - create a branch on your fork
 * - update a single text file by replacing one string
 * - commit the change
 * - open a PR from your fork branch to upstream default branch
 *
 * Requirements:
 * - Node.js 18+
 * - env GITHUB_TOKEN = a GitHub PAT with `public_repo`
 *
 * Example:
 *   $env:GITHUB_TOKEN="ghp_..."
 *   node tools/p1_pr_helper.mjs ^
 *     --upstream "owner/repo" ^
 *     --path "README.md" ^
 *     --replace-old "teh" ^
 *     --replace-new "the" ^
 *     --branch "tds-p1-docfix" ^
 *     --title "Docs: fix typo" ^
 *     --body "Fixes a small typo in README."
 */
import process from "node:process";

const API = "https://api.github.com";

function usage(msg) {
  if (msg) console.error(msg);
  console.error(`
Usage:
  node tools/p1_pr_helper.mjs --upstream owner/repo --path FILE --replace-old STR --replace-new STR --branch BRANCH --title TITLE --body BODY

Env:
  GITHUB_TOKEN=... (PAT with public_repo)
`);
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) usage(`Unknown arg: ${a}`);
    const k = a.slice(2);
    const v = argv[++i];
    if (v == null) usage(`Missing value for --${k}`);
    out[k] = v;
  }
  return out;
}

async function gh(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = json?.message || text || `HTTP ${res.status}`;
    throw new Error(`${method} ${path} failed: ${msg}`);
  }
  return json;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function splitRepo(s) {
  const m = String(s || "").trim().match(/^([^/]+)\/([^/]+)$/);
  if (!m) usage(`Invalid --upstream: ${s} (expected owner/repo)`);
  return { owner: m[1], repo: m[2] };
}

function b64encodeUtf8(s) {
  return Buffer.from(String(s), "utf8").toString("base64");
}

function b64decodeUtf8(s) {
  return Buffer.from(String(s), "base64").toString("utf8");
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) usage("Set env GITHUB_TOKEN to a GitHub PAT (public_repo).");

  const args = parseArgs(process.argv);
  const upstream = splitRepo(args["upstream"]);
  const filePath = args["path"];
  const oldStr = args["replace-old"];
  const newStr = args["replace-new"];
  const branch = args["branch"] || "tds-p1-docfix";
  const title = args["title"] || "Docs: small fix";
  const body = args["body"] || "Small documentation fix for TDS Project 1 Q3.";

  if (!filePath || oldStr == null || newStr == null) {
    usage("Missing required args: --path, --replace-old, --replace-new");
  }

  const me = await gh(token, "GET", "/user");
  const login = me?.login;
  if (!login) throw new Error("Could not detect GitHub username from token.");

  const repoInfo = await gh(token, "GET", `/repos/${upstream.owner}/${upstream.repo}`);
  const defaultBranch = repoInfo?.default_branch || "main";
  const stars = Number(repoInfo?.stargazers_count ?? 0);
  console.log(`Upstream: ${upstream.owner}/${upstream.repo} (default=${defaultBranch}, stars=${stars})`);

  // Ensure fork exists (create if missing)
  let forkInfo = null;
  try {
    forkInfo = await gh(token, "GET", `/repos/${login}/${upstream.repo}`);
  } catch {
    console.log(`Fork not found. Creating fork to ${login}/${upstream.repo}...`);
    await gh(token, "POST", `/repos/${upstream.owner}/${upstream.repo}/forks`, { default_branch_only: true });
    // Poll for fork readiness
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      try {
        forkInfo = await gh(token, "GET", `/repos/${login}/${upstream.repo}`);
        break;
      } catch {
        // keep waiting
      }
    }
    if (!forkInfo) throw new Error("Fork did not become available in time.");
  }

  // Get base sha from fork default branch
  const baseRef = await gh(token, "GET", `/repos/${login}/${upstream.repo}/git/ref/heads/${defaultBranch}`);
  const baseSha = baseRef?.object?.sha;
  if (!baseSha) throw new Error("Could not read base branch SHA from fork.");

  // Create branch (or reuse if exists)
  const refName = `refs/heads/${branch}`;
  try {
    await gh(token, "GET", `/repos/${login}/${upstream.repo}/git/ref/heads/${branch}`);
    console.log(`Branch exists: ${login}/${upstream.repo}@${branch}`);
  } catch {
    await gh(token, "POST", `/repos/${login}/${upstream.repo}/git/refs`, { ref: refName, sha: baseSha });
    console.log(`Created branch: ${login}/${upstream.repo}@${branch}`);
  }

  // Read file contents from fork branch
  const file = await gh(
    token,
    "GET",
    `/repos/${login}/${upstream.repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`
  );
  if (file?.type !== "file" || typeof file?.content !== "string") {
    throw new Error(`Expected a file at --path "${filePath}"`);
  }

  const current = b64decodeUtf8(file.content.replace(/\n/g, ""));
  if (!current.includes(oldStr)) {
    throw new Error(`Did not find --replace-old string in ${filePath}`);
  }
  const updated = current.replace(oldStr, newStr);
  if (updated === current) {
    throw new Error("Replacement produced no changes.");
  }

  // Commit update via Contents API
  const put = await gh(token, "PUT", `/repos/${login}/${upstream.repo}/contents/${encodeURIComponent(filePath)}`, {
    message: `docs: ${title}`,
    content: b64encodeUtf8(updated),
    sha: file.sha,
    branch
  });
  if (!put?.commit?.sha) throw new Error("Commit failed (no sha returned).");
  console.log(`Committed: ${put.commit.sha}`);

  // Open PR
  const pr = await gh(token, "POST", `/repos/${upstream.owner}/${upstream.repo}/pulls`, {
    title,
    body,
    head: `${login}:${branch}`,
    base: defaultBranch
  });
  console.log(`PR created: ${pr.html_url}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

