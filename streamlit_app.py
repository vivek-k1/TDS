"""
TDS GA4 Answer Checker — Streamlit deployment.
Embeds the same client-side checker (HTML + JS) in an iframe so answers match the exam exactly.
"""
import datetime as dt
import json
import os
from functools import lru_cache

import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path

try:
    import gspread
    from google.oauth2.service_account import Credentials
except Exception:
    gspread = None
    Credentials = None

# Page config (must be first Streamlit command)
st.set_page_config(
    page_title="TDS Answer Checker",
    page_icon="📋",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# Paths relative to this script
BASE = Path(__file__).resolve().parent
INDEX_HTML = BASE / "index.html"
APP_JS = BASE / "app.js"
INDEX_GA5_HTML = BASE / "index_ga5.html"
APP_GA5_JS = BASE / "app_ga5.js"
INDEX_GA6_HTML = BASE / "index_ga6.html"
APP_GA6_EMBEDDINGS_JS = BASE / "app_ga6_embeddings_data.js"
APP_GA6_JS = BASE / "app_ga6.js"
APP_GA6_MORE_JS = BASE / "app_ga6_more.js"
GA6_TOKEN_MISER_POOLS_JS = BASE / "ga6_token_miser_pools.js"
INDEX_GA7_HTML = BASE / "index_ga7.html"
APP_GA7_JS = BASE / "app_ga7.js"
INDEX_PROJECT1_HTML = BASE / "index_project1.html"
APP_PROJECT1_ANSWERS_JS = BASE / "app_project1_answers.js"
APP_PROJECT1_JS = BASE / "app_project1.js"
INDEX_PROJECT2_HTML = BASE / "index_project2.html"
APP_PROJECT2_ANSWERS_JS = BASE / "app_project2_answers.js"
SEEDRANDOM_JS = BASE / "seedrandom.min.js"
DATA_DIR = BASE / "data"
CHECKS_FILE = DATA_DIR / "checks.txt"
ADMIN_EMAIL = "vivek@tds"
GA4_URL = "https://exam.sanand.workers.dev/tds-2026-01-ga4"
# Assumed patterns for GA5 and Project 1 exam pages; update if your URLs differ.
GA5_URL = "https://exam.sanand.workers.dev/tds-2026-01-ga5"
GA6_URL = "https://exam.sanand.workers.dev/tds-2026-01-ga6"
GA7_URL = "https://exam.sanand.workers.dev/tds-2026-01-ga7"
PROJECT1_URL = "https://exam.sanand.workers.dev/tds-2026-01-p1"
PROJECT2_URL = "https://exam.sanand.workers.dev/tds-2026-01-p2"
PROJECT2B_URL = "https://exam.sanand.workers.dev/tds-2026-01-p2b"
# Pyodide fetches ga6_py_*.py; Streamlit iframe has no local static origin — use CDN (override via env).
GA6_PY_FETCH_PREFIX = os.environ.get(
    "GA6_PY_FETCH_PREFIX",
    "https://cdn.jsdelivr.net/gh/vivek-k1/TDS@main",
)


def load_seedrandom():
    """Load seedrandom: from local file if present, else minimal inline that sets Math.seedrandom."""
    if SEEDRANDOM_JS.exists():
        return SEEDRANDOM_JS.read_text(encoding="utf-8")
    # Minimal UMD bundle that exposes seedrandom (from cdn jsdelivr seedrandom@3.0.5)
    return r"""
!function(f,a,c){var s,l=256,p="random",d=c.pow(l,6),g=c.pow(2,52),y=2*g,h=l-1;function n(n,t,r){function e(){for(var n=u.g(6),t=d,r=0;n<g;)n=(n+r)*l,t*=l,r=u.g(1);for(;y<=n;)n/=2,t/=2,r>>>=1;return(n+r)/t}var o=[],i=j(function n(t,r){var e,o=[],i=typeof t;if(r&&"object"==i)for(e in t)try{o.push(n(t[e],r-1))}catch(n){}return o.length?o:"string"==i?t:t+"\0"}((t=1==t?{entropy:!0}:t||{}).entropy?[n,S(a)]:null==n?function(){try{var n;return s&&(n=s.randomBytes)?n=n(l):(n=new Uint8Array(l),(f.crypto||f.msCrypto).getRandomValues(n)),S(n)}catch(n){var t=f.navigator,r=t&&t.plugins;return[+new Date,f,r,f.screen,S(a)]}}():n,3),o),u=new m(o);return e.int32=function(){return 0|u.g(4)},e.quick=function(){return u.g(4)/4294967296},e.double=e,j(S(u.S),a),(t.pass||r||function(n,t,r,e){return e&&(e.S&&v(e,u),n.state=function(){return v(u,{})}),r?(c[p]=n,t):n})(e,i,"global"in t?t.global:this==c,t.state)}function m(n){var t,r=n.length,u=this,e=0,o=u.i=u.j=0,i=u.S=[];for(r||(n=[r++]);e<l;)i[e]=e++;for(e=0;e<l;e++)i[e]=i[o=h&o+n[e%r]+(t=i[e])],i[o]=t;(u.g=function(n){for(var t,r=0,e=u.i,o=u.j,i=u.S;n--;)t=i[e=h&e+1],r=r*l+i[h&(i[e]=i[o=h&o+t])+(i[o]=t)];return u.i=e,u.j=o,r})(l)}function v(n,t){return t.i=n.i,t.j=n.j,t.S=n.S.slice(),t}function j(n,t){for(var r,e=n+"",o=0;o<e.length;)t[h&o]=h&(r^=19*t[h&o])+e.charCodeAt(o++);return S(t)}function S(n){return String.fromCharCode.apply(0,n)}if(j(c.random(),a),"object"==typeof module&&module.exports){module.exports=n;try{s=require("crypto")}catch(n){}}else"function"==typeof define&&define.amd?define(function(){return n}):c["seed"+p]=n}("undefined"!=typeof self?self:this,[],Math);
"""


def build_embedded_html(prefill_email: str | None = None, exam: str = "ga4") -> str:
    """Build HTML with Bootstrap + seedrandom + app JS inlined for iframe embedding.

    exam: \"ga4\" | \"ga5\" | \"ga6\" | \"ga7\" | \"p1\" | \"p2\" | \"p2b\"
    """
    if exam == "ga6":
        index_file = INDEX_GA6_HTML
        html = index_file.read_text(encoding="utf-8")
        seedrandom_src = load_seedrandom()
        emb = APP_GA6_EMBEDDINGS_JS.read_text(encoding="utf-8")
        app6 = APP_GA6_JS.read_text(encoding="utf-8")
        more6 = APP_GA6_MORE_JS.read_text(encoding="utf-8")
        tm_pools = GA6_TOKEN_MISER_POOLS_JS.read_text(encoding="utf-8")
        prefix_lit = json.dumps(GA6_PY_FETCH_PREFIX)
        old_ga6 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_ga6_embeddings_data.js?v=2"></script>
  <script src="ga6_token_miser_pools.js?v=1"></script>
  <script src="app_ga6.js?v=2"></script>
  <script src="app_ga6_more.js?v=2"></script>"""
        new_scripts = f"""  <script>{seedrandom_src}</script>
  <script>globalThis.GA6_PY_FETCH_PREFIX={prefix_lit};</script>
  <script>{tm_pools}</script>
  <script>{emb}</script>
  <script>{app6}</script>
  <script>{more6}</script>"""
        html = html.replace(old_ga6, new_scripts)
    elif exam == "ga7":
        index_file = INDEX_GA7_HTML
        html = index_file.read_text(encoding="utf-8")

        seedrandom_src = load_seedrandom()
        app7_js_src = APP_GA7_JS.read_text(encoding="utf-8")

        old_ga7 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_ga7.js?v=1"></script>"""
        new_scripts = f"""  <script>{seedrandom_src}</script>
  <script>{app7_js_src}</script>"""
        html = html.replace(old_ga7, new_scripts)
    elif exam == "p1":
        index_file = INDEX_PROJECT1_HTML
        html = index_file.read_text(encoding="utf-8")

        seedrandom_src = load_seedrandom()
        answers_js = APP_PROJECT1_ANSWERS_JS.read_text(encoding="utf-8")
        p1_js = APP_PROJECT1_JS.read_text(encoding="utf-8") if APP_PROJECT1_JS.exists() else ""

        old_p1_v1 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_project1_answers.js?v=1"></script>"""
        old_p1_v2 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_project1_answers.js?v=2"></script>"""
        old_p1_plain = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_project1_answers.js"></script>"""
        new_scripts = f"""  <script>{seedrandom_src}</script>
  <script>{answers_js}</script>
  <script>{p1_js}</script>"""
        html = (
            html.replace(old_p1_v1, new_scripts)
            .replace(old_p1_v2, new_scripts)
            .replace(old_p1_plain, new_scripts)
        )
    elif exam == "p2" or exam == "p2b":
        index_file = INDEX_PROJECT2_HTML
        html = index_file.read_text(encoding="utf-8")

        if exam == "p2b":
            html = html.replace(
                'href="https://exam.sanand.workers.dev/tds-2026-01-p2"',
                f'href="{PROJECT2B_URL}"',
            )
            html = html.replace(
                "<h1 class=\"mb-0\">TDS Project&nbsp;2</h1>",
                "<h1 class=\"mb-0\">TDS Project&nbsp;2&nbsp;B</h1>",
            )
            html = html.replace(
                "TDS&nbsp;2026‑01 Project&nbsp;2",
                "TDS&nbsp;2026‑01 Project&nbsp;2&nbsp;B",
            )

        seedrandom_src = load_seedrandom()
        answers_js = APP_PROJECT2_ANSWERS_JS.read_text(encoding="utf-8")

        old_p2 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_project2_answers.js?v=1"></script>"""
        new_scripts = f"""  <script>{seedrandom_src}</script>
  <script>{answers_js}</script>"""
        html = html.replace(old_p2, new_scripts)
    else:
        ga5 = exam == "ga5"
        index_file = INDEX_GA5_HTML if ga5 else INDEX_HTML
        app_file = APP_GA5_JS if ga5 else APP_JS
        html = index_file.read_text(encoding="utf-8")

        seedrandom_src = load_seedrandom()
        app_js_src = app_file.read_text(encoding="utf-8")

        old_ga4 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app.js?v=3"></script>"""
        old_ga5 = """  <script src="https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/seedrandom.min.js"></script>
  <script src="app_ga5.js?v=1"></script>"""
        new_scripts = f"""  <script>{seedrandom_src}</script>
  <script>{app_js_src}</script>"""
        html = html.replace(old_ga4, new_scripts).replace(old_ga5, new_scripts)

    if prefill_email:
        esc = prefill_email.replace("\\", "\\\\").replace('"', '\\"').replace("<", "\\u003c")
        if exam == "p1":
            inject = (
                '<script>document.addEventListener("DOMContentLoaded",function(){'
                f'var e=document.getElementById("p1-email");'
                f'if(e){{e.value="{esc}";e.dispatchEvent(new Event("input"));}}'
                '});</script>'
            )
        elif exam in ("p2", "p2b"):
            inject = (
                '<script>document.addEventListener("DOMContentLoaded",function(){'
                f'var e=document.getElementById("p2-email");'
                f'if(e){{e.value="{esc}";e.dispatchEvent(new Event("input"));}}'
                '});</script>'
            )
        else:
            inject = f'<script>document.addEventListener("DOMContentLoaded",function(){{var e=document.getElementById("emailInput");if(e)e.value="{esc}";}});</script>'
        html = html.replace("</body>", inject + "\n</body>")

    return html


@lru_cache(maxsize=1)
def _get_google_sheet():
    """Return a Google Sheet instance if configured, else None."""
    if gspread is None or Credentials is None:
        return None
    try:
        service_info = st.secrets["gcp_service_account"]
        sheet_id = st.secrets.get("VISITOR_SHEET_ID")
    except Exception:
        return None
    if not sheet_id:
        return None
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    try:
        creds = Credentials.from_service_account_info(service_info, scopes=scopes)
        client = gspread.authorize(creds)
        sheet = client.open_by_key(sheet_id).sheet1
        # Ensure headers exist on a brand new sheet
        if not sheet.get_all_values():
            sheet.append_row(["timestamp_utc", "email"])
        return sheet
    except Exception:
        return None


def _load_emails_from_sheet() -> list[str] | None:
    """Load emails from Google Sheet if configured. Returns None on any failure."""
    sheet = _get_google_sheet()
    if sheet is None:
        return None
    try:
        values = sheet.col_values(2)
        # Skip header row, keep non-empty entries
        return [v.strip() for v in values[1:] if v.strip()]
    except Exception:
        return None


def log_visitor(email: str) -> None:
    """Append visitor email to a persistent store (Google Sheet if available, else local file)."""
    email_clean = email.strip()

    # Primary: Google Sheet (persists across Streamlit restarts)
    sheet = _get_google_sheet()
    if sheet is not None:
        try:
            ts = dt.datetime.utcnow().isoformat(timespec="seconds")
            sheet.append_row([ts, email_clean])
            return
        except Exception:
            # If something goes wrong, fall back to local file
            pass

    # Fallback: local text file (works locally, but ephemeral on Streamlit Cloud)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CHECKS_FILE, "a", encoding="utf-8") as f:
        f.write(email_clean + "\n")


def render_admin_view() -> None:
    """Show how many people checked in and list their emails."""
    st.subheader("Visitor stats")

    # Try Google Sheet first
    emails = _load_emails_from_sheet()

    # If sheet not configured or errored, fall back to local file
    if emails is None:
        if not CHECKS_FILE.exists():
            st.info("No check-ins yet.")
            return
        lines = CHECKS_FILE.read_text(encoding="utf-8").strip().splitlines()
        emails = [ln.strip() for ln in lines if ln.strip()]

    if not emails:
        st.info("No check-ins yet.")
        return

    st.metric("Total check-ins", len(emails))
    st.write("**Emails:**")
    for i, e in enumerate(emails, 1):
        st.text(f"{i}. {e}")


# Google AdSense client ID
ADSENSE_CLIENT = "ca-pub-9674118663923293"


def render_adsense():
    """Inject Google AdSense script and a responsive ad unit."""
    html = f"""
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}"
     crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="{ADSENSE_CLIENT}"
     data-ad-slot="YOUR_AD_SLOT_ID"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({{}});</script>
"""
    components.html(html, height=100)


def main():
    st.title("TDS Answer Checker")

    exam_choice = st.selectbox(
        "Exam / Project",
        ("GA4", "GA5", "GA6", "GA7", "Project 1", "Project 2", "Project 2 B"),
        index=0,
    )

    if exam_choice == "GA4":
        st.caption(
            "Compute answers for "
            f"[TDS 2026-01 GA4]({GA4_URL}) "
            "using your registered email."
        )
    elif exam_choice == "GA5":
        st.caption(
            "Compute answers for "
            f"[TDS 2026-01 GA5]({GA5_URL}) "
            "using your registered email."
        )
    elif exam_choice == "GA6":
        st.caption(
            "Compute answers for "
            f"[TDS 2026-01 GA6]({GA6_URL}) "
            "using your registered email. Python items load via Pyodide from the published repo (jsDelivr)."
        )
    elif exam_choice == "GA7":
        st.caption(
            "Compute answers for "
            f"[TDS 2026-01 GA7]({GA7_URL}) "
            "using your registered email."
        )
    elif exam_choice == "Project 1":
        st.caption(
            f"Project 1 helper for [{PROJECT1_URL}]({PROJECT1_URL})."
        )
    elif exam_choice == "Project 2":
        st.caption(
            f"Project 2 helper for [{PROJECT2_URL}]({PROJECT2_URL})."
        )
    else:
        st.caption(
            f"Project 2 B helper for [{PROJECT2B_URL}]({PROJECT2B_URL})."
        )

    render_adsense()

    # Local answer checker using embedded HTML + inlined JS
    exam_key = {
        "GA4": "ga4",
        "GA5": "ga5",
        "GA6": "ga6",
        "GA7": "ga7",
        "Project 1": "p1",
        "Project 2": "p2",
        "Project 2 B": "p2b",
    }[exam_choice]
    if exam_key == "ga6":
        required = [
            INDEX_GA6_HTML,
            APP_GA6_EMBEDDINGS_JS,
            GA6_TOKEN_MISER_POOLS_JS,
            APP_GA6_JS,
            APP_GA6_MORE_JS,
        ]
    elif exam_key == "ga7":
        required = [INDEX_GA7_HTML, APP_GA7_JS]
    elif exam_key == "ga5":
        required = [INDEX_GA5_HTML, APP_GA5_JS]
    elif exam_key == "p1":
        required = [INDEX_PROJECT1_HTML, APP_PROJECT1_ANSWERS_JS]
    elif exam_key in ("p2", "p2b"):
        required = [INDEX_PROJECT2_HTML, APP_PROJECT2_ANSWERS_JS]
    else:
        required = [INDEX_HTML, APP_JS]
    for path in required:
        if not path.exists():
            st.error(f"Missing {path}. Run this app from the project root (e.g. `streamlit run streamlit_app.py`).")
            return

    with st.form("email_form"):
        email = st.text_input("Email address", placeholder="you@example.com", key="visitor_email")
        submitted = st.form_submit_button("Go")

    if submitted and email and email.strip().lower() == ADMIN_EMAIL.lower():
        render_admin_view()
        return

    if submitted and email and email.strip():
        log_visitor(email.strip())
        prefill = email.strip()
    else:
        prefill = None

    embedded = build_embedded_html(prefill_email=prefill, exam=exam_key)
    iframe_h = 5200 if exam_key in ("p2", "p2b") else 900
    components.html(embedded, height=iframe_h, scrolling=True)


if __name__ == "__main__":
    main()
