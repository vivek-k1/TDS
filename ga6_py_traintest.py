
import pandas as pd
import random
import json

def _generate(seed):
    rng = random.Random(seed)

    n_test_choices = [200, 300, 400]
    leak_fracs = [0.05, 0.10, 0.15]
    n_train = rng.choice([800, 1000, 1200])
    n_test = rng.choice(n_test_choices)
    leak_frac = rng.choice(leak_fracs)
    leaked_count = int(n_test * leak_frac)

    # Feature columns: age, income, education, hours_per_week
    def make_row(r):
        return {
            "age": r.randint(18, 70),
            "income": round(r.uniform(15000, 120000), 2),
            "education": r.choice(["high_school", "bachelors", "masters", "phd", "associate"]),
            "hours_per_week": r.randint(10, 60),
        }

    # Generate training data
    train_rows = [make_row(rng) for _ in range(n_train)]
    for i, row in enumerate(train_rows):
        row["label"] = rng.choice([0, 1])

    # Generate clean test rows (not in training)
    clean_count = n_test - leaked_count
    clean_rows = [make_row(rng) for _ in range(clean_count)]

    # Leaked rows: copy feature columns from random training rows
    leak_indices = rng.sample(range(n_train), leaked_count)
    leaked_rows = []
    for idx in leak_indices:
        row = {k: v for k, v in train_rows[idx].items() if k != "label"}
        leaked_rows.append(row)

    # Combine test rows
    test_rows = clean_rows + leaked_rows
    rng.shuffle(test_rows)

    # Assign true labels and predictions
    # Leaked rows: higher accuracy (85-95%)
    # Clean rows: lower accuracy (70-80%)
    leaked_acc = rng.uniform(0.85, 0.95)
    clean_acc = rng.uniform(0.70, 0.80)

    # Build a set of feature tuples from training for lookup
    feature_cols = ["age", "income", "education", "hours_per_week"]
    train_features = set()
    for row in train_rows:
        train_features.add(tuple(row[c] for c in feature_cols))

    correct_leaked = 0
    correct_clean = 0
    total_leaked = 0
    total_clean = 0

    for row in test_rows:
        feat = tuple(row[c] for c in feature_cols)
        is_leaked = feat in train_features
        true_label = rng.choice([0, 1])
        row["label"] = true_label

        if is_leaked:
            total_leaked += 1
            is_correct = rng.random() < leaked_acc
        else:
            total_clean += 1
            is_correct = rng.random() < clean_acc

        if is_correct:
            row["predicted_label"] = true_label
            if is_leaked:
                correct_leaked += 1
            else:
                correct_clean += 1
        else:
            row["predicted_label"] = 1 - true_label
        row["is_correct"] = 1 if row["predicted_label"] == row["label"] else 0

    actual_leaked_acc = round(correct_leaked / total_leaked * 100, 2) if total_leaked > 0 else 0
    actual_clean_acc = round(correct_clean / total_clean * 100, 2) if total_clean > 0 else 0
    reported_acc = round(sum(r["is_correct"] for r in test_rows) / len(test_rows) * 100, 2)
    inflation_pp = round(reported_acc - actual_clean_acc, 2)

    # Build CSVs
    train_df = pd.DataFrame(train_rows)
    test_df = pd.DataFrame(test_rows)

    col_list = ", ".join(feature_cols)

    return {
        "train_csv": train_df[feature_cols + ["label"]].to_csv(index=False),
        "test_csv": test_df[feature_cols + ["label", "predicted_label", "is_correct"]].to_csv(index=False),
        "n_train": n_train,
        "n_test": n_test,
        "col_list": col_list,
        "reported_acc": reported_acc,
        "leaked_count": total_leaked,
        "leaked_accuracy": actual_leaked_acc,
        "clean_accuracy": actual_clean_acc,
        "inflation_pp": inflation_pp,
    }

__exam_gen__ = json.dumps(_generate(EXAM_SEED))
