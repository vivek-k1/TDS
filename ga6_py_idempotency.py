
import pandas as pd
import random
import json
import math

# Bank of preprocessing function variants.
# Each has a specific combination of property violations.
# The function takes a DataFrame row (as dict) and returns a processed dict.
FUNCTION_BANK = [
    {
        "name": "normalize_record_v1",
        "description": "Strips whitespace, scales numeric fields to 0-1 range, fills nulls with median",
        "code": '''def preprocess(df, monotone_col):
    """Normalize and clean records."""
    result = df.copy()
    # Strip whitespace from string columns
    for col in result.select_dtypes(include="object").columns:
        result[col] = result[col].str.strip()
    # Scale numeric columns to 0-1
    for col in result.select_dtypes(include="number").columns:
        mn, mx = result[col].min(), result[col].max()
        if mx > mn:
            result[col] = (result[col] - mn) / (mx - mn)
        else:
            result[col] = 0.0
    # Fill nulls with 0.5
    result = result.fillna(0.5)
    return result''',
        "bugs": {"idempotency": True, "monotonicity": False, "null_stability": False},
        "explanation": "Re-scaling after first pass changes min/max, so f(f(x)) != f(x)"
    },
    {
        "name": "normalize_record_v2",
        "description": "Clips values to [10th, 90th] percentile, forward-fills nulls",
        "code": '''def preprocess(df, monotone_col):
    """Clip outliers and fill missing values."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        lo = result[col].quantile(0.1)
        hi = result[col].quantile(0.9)
        result[col] = result[col].clip(lo, hi)
    result = result.ffill().bfill()
    return result''',
        "bugs": {"idempotency": False, "monotonicity": True, "null_stability": False},
        "explanation": "Clipping preserves idempotency but breaks ordering near boundaries"
    },
    {
        "name": "normalize_record_v3",
        "description": "Z-score normalization with null handling via computed ratio",
        "code": '''def preprocess(df, monotone_col):
    """Z-score normalize numeric columns, handle nulls via ratio."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        mean = result[col].mean()
        std = result[col].std()
        if std > 0:
            result[col] = (result[col] - mean) / std
        else:
            result[col] = 0.0
    # Fill remaining nulls using column ratio
    for col in result.columns:
        null_count = result[col].isna().sum()
        total = len(result)
        if null_count > 0:
            ratio = null_count / total
            result[col] = result[col].fillna(ratio)
    return result''',
        "bugs": {"idempotency": True, "monotonicity": False, "null_stability": False},
        "explanation": "Z-score re-normalization shifts values on second pass"
    },
    {
        "name": "normalize_record_v4",
        "description": "Rank-based normalization with null propagation",
        "code": '''def preprocess(df, monotone_col):
    """Rank-normalize numeric columns."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        result[col] = result[col].rank(method="average", na_option="keep")
        n = result[col].count()
        if n > 0:
            result[col] = result[col] / n
    return result''',
        "bugs": {"idempotency": True, "monotonicity": False, "null_stability": False},
        "explanation": "Rank normalization re-ranks on second pass, changing values"
    },
    {
        "name": "normalize_record_v5",
        "description": "Min-max scaling with log transform for skewed columns",
        "code": '''def preprocess(df, monotone_col):
    """Log-transform then min-max scale."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        # Log transform (shift to positive first)
        mn = result[col].min()
        if pd.notna(mn):
            result[col] = result[col] - mn + 1
            result[col] = result[col].apply(lambda x: x if pd.isna(x) else round(x, 6))
            result[col] = result[col].apply(lambda x: x if pd.isna(x) else max(x, 1e-6))
            import math
            result[col] = result[col].apply(lambda x: x if pd.isna(x) else math.log(x))
    # Fill nulls
    result = result.fillna(0)
    return result''',
        "bugs": {"idempotency": True, "monotonicity": False, "null_stability": False},
        "explanation": "Log transform applied twice changes values"
    },
    {
        "name": "normalize_record_v6",
        "description": "Percentile binning with null fill",
        "code": '''def preprocess(df, monotone_col):
    """Bin numeric values into percentile buckets."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        try:
            result[col] = pd.qcut(result[col], q=10, labels=False, duplicates="drop")
        except Exception:
            pass
    result = result.fillna(-1)
    return result''',
        "bugs": {"idempotency": False, "monotonicity": True, "null_stability": False},
        "explanation": "Binning is idempotent (re-binning same buckets) but breaks fine-grained ordering"
    },
    {
        "name": "normalize_record_v7",
        "description": "Robust scaler using median/IQR with division-based null fill",
        "code": '''def preprocess(df, monotone_col):
    """Robust scaling using median and IQR, with computed null fill."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        median = result[col].median()
        q1 = result[col].quantile(0.25)
        q3 = result[col].quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            result[col] = (result[col] - median) / iqr
        else:
            result[col] = 0.0
        # Fill nulls with column mean divided by std
        mean = result[col].mean()
        std = result[col].std()
        fill_val = mean / std if std != 0 else 0
        result[col] = result[col].fillna(fill_val)
    return result''',
        "bugs": {"idempotency": True, "monotonicity": False, "null_stability": False},
        "explanation": "Re-scaling changes median/IQR on second pass"
    },
    {
        "name": "normalize_record_v8",
        "description": "Simple clipping to fixed bounds with forward fill",
        "code": '''def preprocess(df, monotone_col):
    """Clip numeric values to [0, 100] and forward-fill nulls."""
    result = df.copy()
    for col in result.select_dtypes(include="number").columns:
        result[col] = result[col].clip(0, 100)
    result = result.ffill().fillna(0)
    return result''',
        "bugs": {"idempotency": False, "monotonicity": True, "null_stability": False},
        "explanation": "Clipping to fixed bounds is idempotent, but values near 0/100 boundary lose relative ordering"
    },
]

def _generate(seed):
    rng = random.Random(seed)

    # Pick a function variant
    variant_idx = rng.randint(0, len(FUNCTION_BANK) - 1)
    variant = FUNCTION_BANK[variant_idx]

    N = rng.choice([50, 80, 100])
    monotone_col = rng.choice(["value_a", "value_b", "score"])

    # Generate test records as a DataFrame
    records = []
    for i in range(N):
        row = {
            "id": f"R{i+1:04d}",
            "value_a": round(rng.uniform(-50, 200), 2),
            "value_b": round(rng.uniform(0, 500), 2),
            "score": round(rng.uniform(-10, 110), 2),
            "category": rng.choice(["A", "B", "C", "D"]),
        }
        # Inject some nulls (~10% chance per numeric column)
        if rng.random() < 0.10:
            null_col = rng.choice(["value_a", "value_b", "score"])
            row[null_col] = None
        records.append(row)

    df = pd.DataFrame(records)

    # Execute the function code
    exec_globals = {"pd": pd, "math": math}
    exec(variant["code"], exec_globals)
    preprocess = exec_globals["preprocess"]

    # Test idempotency: f(f(x)) == f(x)
    once = preprocess(df.copy(), monotone_col)
    twice = preprocess(once.copy(), monotone_col)
    idempotency_violations = 0
    for i in range(N):
        row_once = once.iloc[i]
        row_twice = twice.iloc[i]
        is_different = False
        for col in df.columns:
            v1 = row_once[col]
            v2 = row_twice[col]
            if pd.isna(v1) and pd.isna(v2):
                continue
            if pd.isna(v1) or pd.isna(v2):
                is_different = True
                break
            if isinstance(v1, float) and isinstance(v2, float):
                if abs(v1 - v2) > 1e-9:
                    is_different = True
                    break
            elif v1 != v2:
                is_different = True
                break
        if is_different:
            idempotency_violations += 1

    # Test monotonicity on the monotone_col
    monotonicity_violations = 0
    for i in range(N):
        for j in range(i + 1, N):
            orig_i = df.iloc[i][monotone_col]
            orig_j = df.iloc[j][monotone_col]
            if pd.isna(orig_i) or pd.isna(orig_j):
                continue
            if orig_i <= orig_j:
                continue
            # orig_i > orig_j strictly, check if once_i > once_j
            proc_i = once.iloc[i][monotone_col]
            proc_j = once.iloc[j][monotone_col]
            if pd.isna(proc_i) or pd.isna(proc_j):
                monotonicity_violations += 1
                continue
            if proc_i <= proc_j:
                monotonicity_violations += 1

    # Test null stability
    null_stability_violations = 0
    for i in range(N):
        orig_row = df.iloc[i]
        proc_row = once.iloc[i]
        if orig_row.isna().sum() == 0 and proc_row.isna().sum() > 0:
            null_stability_violations += 1

    return {
        "function_name": variant["name"],
        "function_code": variant["code"],
        "N": N,
        "monotone_col": monotone_col,
        "records_csv": df.to_csv(index=False),
        "idempotency_violations": idempotency_violations,
        "monotonicity_violations": monotonicity_violations,
        "null_stability_violations": null_stability_violations,
    }

__exam_gen__ = json.dumps(_generate(EXAM_SEED))
