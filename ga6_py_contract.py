
import pandas as pd
import random
import json
from datetime import date, timedelta

_DOMAINS = {
    "sales": {
        "label": "sales transactions", "id_prefix": "TXN",
        "cols": {"id": "transaction_id", "date": "sale_date", "amount": "amount",
                 "count": "quantity", "email": "customer_email", "fk": "region_id", "score": "discount_pct"},
        "fk_pool": ["REG01","REG02","REG03","REG04","REG05","REG06","REG07"],
        "amount_range": [5.0, 500.0], "count_range": [1, 50], "score_range": [0.0, 25.0],
        "date_bounds": ["2024-01-01", "2024-12-31"],
    },
    "sensor": {
        "label": "IoT sensor readings", "id_prefix": "SEN",
        "cols": {"id": "device_id", "date": "reading_date", "amount": "voltage",
                 "count": "packet_count", "email": "alert_email", "fk": "site_id", "score": "signal_strength"},
        "fk_pool": ["SITE01","SITE02","SITE03","SITE04","SITE05","SITE06"],
        "amount_range": [100.0, 240.0], "count_range": [10, 500], "score_range": [0.0, 100.0],
        "date_bounds": ["2024-01-01", "2024-12-31"],
    },
    "customer": {
        "label": "customer account records", "id_prefix": "ACC",
        "cols": {"id": "account_id", "date": "created_date", "amount": "account_balance",
                 "count": "login_count", "email": "email_address", "fk": "segment_id", "score": "satisfaction_score"},
        "fk_pool": ["SEG01","SEG02","SEG03","SEG04","SEG05"],
        "amount_range": [0.0, 10000.0], "count_range": [0, 200], "score_range": [1.0, 10.0],
        "date_bounds": ["2022-01-01", "2024-12-31"],
    },
    "inventory": {
        "label": "inventory records", "id_prefix": "SKU",
        "cols": {"id": "sku_id", "date": "last_updated", "amount": "unit_price",
                 "count": "stock_qty", "email": "supplier_email", "fk": "warehouse_id", "score": "fill_rate"},
        "fk_pool": ["WH01","WH02","WH03","WH04","WH05"],
        "amount_range": [1.0, 500.0], "count_range": [0, 1000], "score_range": [0.0, 100.0],
        "date_bounds": ["2024-01-01", "2024-12-31"],
    },
    "hr": {
        "label": "HR employee records", "id_prefix": "EMP",
        "cols": {"id": "employee_id", "date": "hire_date", "amount": "salary",
                 "count": "days_worked", "email": "work_email", "fk": "dept_id", "score": "performance_score"},
        "fk_pool": ["DEPT01","DEPT02","DEPT03","DEPT04","DEPT05","DEPT06"],
        "amount_range": [30000.0, 150000.0], "count_range": [1, 260], "score_range": [1.0, 5.0],
        "date_bounds": ["2015-01-01", "2024-12-31"],
    },
}

def _rand_dates(rng, n, s, e):
    start = date.fromisoformat(s)
    end = date.fromisoformat(e)
    delta = (end - start).days
    return [str(start + timedelta(days=rng.randint(0, delta))) for _ in range(n)]

def _rand_email(rng):
    name = "".join(rng.choices("abcdefghijklmnopqrstuvwxyz", k=rng.randint(4, 8)))
    dom = rng.choice(["gmail.com", "yahoo.com", "outlook.com", "corp.io"])
    return f"{name}@{dom}"

def _count_anomalous_rows(day1_df, day2_df):
    """
    Count rows in day2_df that are anomalous vs day1_df baseline.
    Rules (must match exactly what is shown to the student):
      - Numeric cols: value outside [Day1_min, Day1_max]
      - Date cols (YYYY-MM-DD strings): date is in the future (> today)
      - Any col: null where Day1 had zero nulls
      - Categorical string cols: value not present in Day1's unique set
    A row is anomalous if ANY column triggers a rule.
    """
    today = pd.Timestamp(date.today())
    bad = set()
    for col in day1_df.columns:
        d1, d2 = day1_df[col], day2_df[col]
        # null check
        if d1.isna().sum() == 0:
            bad.update(d2[d2.isna()].index.tolist())
        # numeric check
        num1 = pd.to_numeric(d1, errors="coerce")
        if num1.notna().mean() > 0.95:
            num2 = pd.to_numeric(d2, errors="coerce")
            lo, hi = num1.min(), num1.max()
            bad.update(d2[(num2 < lo) | (num2 > hi)].index.tolist())
            continue
        # date check
        parsed1 = pd.to_datetime(d1.dropna().astype(str), errors="coerce")
        if parsed1.notna().mean() > 0.9:
            parsed2 = pd.to_datetime(d2.astype(str), errors="coerce")
            bad.update(d2[parsed2 > today].index.tolist())
            continue
        # categorical check (only for low-cardinality columns, <=20 unique values in Day 1)
        valid = set(d1.dropna().astype(str).unique())
        if len(valid) <= 20:
            bad.update(d2[d2.notna() & ~d2.astype(str).isin(valid)].index.tolist())
    return len(bad)

def _generate(seed):
    rng = random.Random(seed)
    dkeys = list(_DOMAINS.keys())
    dk = dkeys[rng.randint(0, len(dkeys) - 1)]
    dom = _DOMAINS[dk]
    cols = dom["cols"]

    ALL_V = ["negative_values", "future_dates", "unexpected_nulls", "out_of_range",
             "string_format", "referential_integrity", "statistical_shift"]
    pool = ALL_V[:]
    violations = []
    for _ in range(5):
        idx = rng.randint(0, len(pool) - 1)
        violations.append(pool.pop(idx))

    # Each violation affects a different random number of rows (10\u201325), seeded
    nc_list = [rng.randint(10, 25) for _ in violations]
    total_rows = 200  # enough rows for all violations with room to spare

    prefix = dom["id_prefix"]
    fk_pool = dom["fk_pool"]
    amt_lo, amt_hi = dom["amount_range"]
    cnt_lo, cnt_hi = dom["count_range"]
    scr_lo, scr_hi = dom["score_range"]

    def clean_rows(n, offset=0):
        return {
            cols["id"]: [f"{prefix}-{offset + i + 1:06d}" for i in range(n)],
            cols["date"]: _rand_dates(rng, n, dom["date_bounds"][0], dom["date_bounds"][1]),
            cols["amount"]: [round(rng.uniform(amt_lo, amt_hi), 2) for _ in range(n)],
            cols["count"]: [rng.randint(cnt_lo, cnt_hi) for _ in range(n)],
            cols["email"]: [_rand_email(rng) for _ in range(n)],
            cols["fk"]: [rng.choice(fk_pool) for _ in range(n)],
            cols["score"]: [round(rng.uniform(scr_lo, scr_hi), 2) for _ in range(n)],
        }

    day1_df = pd.DataFrame(clean_rows(150, 0))
    day2_df = pd.DataFrame(clean_rows(total_rows, 150))
    today = date.today()
    WRONG = {"TXN": "ORD", "SEN": "DEV", "ACC": "USR", "SKU": "ITM", "EMP": "STF"}

    # Plant violations in non-overlapping row slices
    row_offset = 0
    for vtype, nc in zip(violations, nc_list):
        rows = list(range(row_offset, row_offset + nc))
        row_offset += nc
        if vtype == "negative_values":
            for r in rows:
                day2_df.loc[r, cols["amount"]] = round(rng.uniform(-amt_hi, -0.01), 2)
        elif vtype == "future_dates":
            for r in rows:
                day2_df.loc[r, cols["date"]] = str(today + timedelta(days=rng.randint(1, 365)))
        elif vtype == "unexpected_nulls":
            for r in rows:
                day2_df.loc[r, cols["email"]] = None
        elif vtype == "out_of_range":
            span = scr_hi - scr_lo
            for r in rows:
                if rng.random() < 0.5:
                    day2_df.loc[r, cols["score"]] = round(scr_hi + span * rng.uniform(0.2, 1.5), 2)
                else:
                    day2_df.loc[r, cols["score"]] = round(scr_lo - span * rng.uniform(0.2, 1.5), 2)
        elif vtype == "string_format":
            wp = WRONG.get(prefix, "WRG")
            for r in rows:
                day2_df.loc[r, cols["id"]] = f"{wp}-{rng.randint(1, 999999):06d}"
        elif vtype == "referential_integrity":
            bad = [f"UNKNOWN{i:02d}" for i in range(1, 6)]
            for r in rows:
                day2_df.loc[r, cols["fk"]] = rng.choice(bad)
        elif vtype == "statistical_shift":
            hi_val = max(cnt_hi * 3 + 1, cnt_hi * 6)
            for r in rows:
                day2_df.loc[r, cols["count"]] = rng.randint(cnt_hi * 3, hi_val)

    correct_answer = _count_anomalous_rows(day1_df, day2_df)

    return {
        "domain": dom["label"],
        "correct_answer": correct_answer,
        "day1_csv": day1_df.to_csv(index=False),
        "day2_csv": day2_df.to_csv(index=False),
    }

__exam_gen__ = json.dumps(_generate(EXAM_SEED))
