"""Train and evaluate Random Forest and Gradient Boosting tabular models.

Tracked with local MLflow (file-based). Predicts:
  - Task A: irrigate_now (classification)
  - Task B: irrigation_duration_minutes (regression on positive rows)
  - Combined: two-stage irrigation duration on all test rows
Saves best models and threshold to backend/ml/models/.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    recall_score,
    roc_auc_score,
)

# Enable local file tracking for MLflow without deprecation exception
os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"
os.environ["MLFLOW_DISABLE_AGENT_HINT"] = "1"
import mlflow
import mlflow.sklearn


# =========================================================================
# CONSTANTS & CONFIGURATION
# =========================================================================

ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"
MLRUNS_DIR = ML_DIR / "mlruns"

EXPERIMENT_NAME = "riego-irrigation"

# Simple rule baseline threshold
SOIL_MOISTURE_BASELINE_THRESHOLD = 35.0

# Regressor duration rounding and limits
DURATION_ROUND_MINUTES = 5.0
DURATION_MIN_LIMIT = 10.0
DURATION_MAX_LIMIT = 180.0


def find_best_threshold(y_true: np.ndarray, probs: np.ndarray) -> Tuple[float, float]:
    """
    Find threshold on the validation set that maximizes F1 score.
    Never tunes on test data.
    """
    thresholds = np.linspace(0.05, 0.95, 91)
    best_thresh = 0.5
    best_f1 = -1.0

    for t in thresholds:
        preds = (probs >= t).astype(int)
        score = float(f1_score(y_true, preds, zero_division=0))
        if score > best_f1:
            best_f1 = score
            best_thresh = float(t)

    return best_thresh, best_f1


def evaluate_classifier(
    y_true: np.ndarray,
    probs: np.ndarray,
    threshold: float,
) -> Dict[str, float]:
    """Compute precision, recall, f1, pr_auc, roc_auc, and confusion matrix components."""
    preds = (probs >= threshold).astype(int)
    cm = confusion_matrix(y_true, preds, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    prec = float(precision_score(y_true, preds, zero_division=0))
    rec = float(recall_score(y_true, preds, zero_division=0))
    f1 = float(f1_score(y_true, preds, zero_division=0))

    try:
        pr_auc = float(average_precision_score(y_true, probs))
    except Exception:
        pr_auc = float("nan")

    try:
        roc_auc = float(roc_auc_score(y_true, probs))
    except Exception:
        roc_auc = float("nan")

    return {
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "pr_auc": pr_auc,
        "roc_auc": roc_auc,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "tp": tp,
    }


def get_feature_importances(
    model,
    feature_names: List[str],
    X_val: pd.DataFrame,
    y_val: np.ndarray,
    scoring: str = "f1",
) -> pd.DataFrame:
    """Extract top feature importances using permutation importance.

    Use scoring='f1' for classifiers and scoring='neg_mean_absolute_error'
    for regressors.
    """
    sample_size = min(5000, len(X_val))
    pi = permutation_importance(
        model,
        X_val.iloc[:sample_size],
        y_val[:sample_size],
        n_repeats=5,
        random_state=42,
        n_jobs=-1,
        scoring=scoring,
    )
    importances = pi.importances_mean

    df_imp = pd.DataFrame({
        "feature": feature_names,
        "importance": importances,
    }).sort_values(by="importance", ascending=False).reset_index(drop=True)

    return df_imp


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    MLRUNS_DIR.mkdir(parents=True, exist_ok=True)

    mlflow.set_tracking_uri(f"file://{MLRUNS_DIR.resolve()}")
    mlflow.set_experiment(EXPERIMENT_NAME)

    print("Loading datasets and feature columns...")
    with open(DATA_DIR / "feature_columns.json", "r") as f:
        feature_cols: List[str] = json.load(f)

    train_df = pd.read_csv(DATA_DIR / "train.csv")
    val_df   = pd.read_csv(DATA_DIR / "val.csv")
    test_df  = pd.read_csv(DATA_DIR / "test.csv")

    X_train = train_df[feature_cols]
    y_train_clf = train_df["irrigate_now"].values

    X_val = val_df[feature_cols]
    y_val_clf = val_df["irrigate_now"].values

    X_test = test_df[feature_cols]
    y_test_clf = test_df["irrigate_now"].values

    print(f"Features: {len(feature_cols)}")
    print(f"Train rows: {len(X_train):,}, Val rows: {len(X_val):,}, Test rows: {len(X_test):,}")

    # =========================================================================
    # TASK A: CLASSIFICATION (irrigate_now)
    # =========================================================================
    print("\n" + "=" * 70)
    print("TASK A: CLASSIFICATION (irrigate_now)")
    print("=" * 70)

    # 1. Random Forest Classifier
    rf_clf_params = {
        "n_estimators": 200,
        "max_depth": 12,
        "class_weight": "balanced",
        "n_jobs": -1,
        "random_state": 42,
    }
    print("Training Random Forest Classifier...")
    rf_clf = RandomForestClassifier(**rf_clf_params)
    rf_clf.fit(X_train, y_train_clf)

    rf_val_probs = rf_clf.predict_proba(X_val)[:, 1]
    rf_thresh, rf_val_f1_best = find_best_threshold(y_val_clf, rf_val_probs)
    rf_val_metrics = evaluate_classifier(y_val_clf, rf_val_probs, rf_thresh)

    rf_test_probs = rf_clf.predict_proba(X_test)[:, 1]
    rf_test_metrics = evaluate_classifier(y_test_clf, rf_test_probs, rf_thresh)

    rf_clf_imp = get_feature_importances(rf_clf, feature_cols, X_val, y_val_clf)
    rf_imp_csv = MODELS_DIR / "rf_clf_top15_importances.csv"
    rf_clf_imp.head(15).to_csv(rf_imp_csv, index=False)

    with mlflow.start_run(run_name="RandomForest_Classifier") as run_rf_clf:
        mlflow.log_params(rf_clf_params)
        mlflow.log_param("best_threshold", rf_thresh)
        mlflow.log_metrics({f"val_{k}": v for k, v in rf_val_metrics.items()})
        mlflow.log_metrics({f"test_{k}": v for k, v in rf_test_metrics.items()})
        mlflow.log_artifact(str(rf_imp_csv))
        mlflow.sklearn.log_model(rf_clf, name="model", serialization_format="pickle")

    # 2. HistGradientBoosting Classifier
    hgb_clf_params = {
        "class_weight": "balanced",
        "random_state": 42,
    }
    print("Training HistGradientBoosting Classifier...")
    hgb_clf = HistGradientBoostingClassifier(**hgb_clf_params)
    hgb_clf.fit(X_train, y_train_clf)

    hgb_val_probs = hgb_clf.predict_proba(X_val)[:, 1]
    hgb_thresh, hgb_val_f1_best = find_best_threshold(y_val_clf, hgb_val_probs)
    hgb_val_metrics = evaluate_classifier(y_val_clf, hgb_val_probs, hgb_thresh)

    hgb_test_probs = hgb_clf.predict_proba(X_test)[:, 1]
    hgb_test_metrics = evaluate_classifier(y_test_clf, hgb_test_probs, hgb_thresh)

    hgb_clf_imp = get_feature_importances(hgb_clf, feature_cols, X_val, y_val_clf)
    hgb_imp_csv = MODELS_DIR / "hgb_clf_top15_importances.csv"
    hgb_clf_imp.head(15).to_csv(hgb_imp_csv, index=False)

    with mlflow.start_run(run_name="HistGradientBoosting_Classifier") as run_hgb_clf:
        mlflow.log_params(hgb_clf_params)
        mlflow.log_param("best_threshold", hgb_thresh)
        mlflow.log_metrics({f"val_{k}": v for k, v in hgb_val_metrics.items()})
        mlflow.log_metrics({f"test_{k}": v for k, v in hgb_test_metrics.items()})
        mlflow.log_artifact(str(hgb_imp_csv))
        mlflow.sklearn.log_model(hgb_clf, name="model", serialization_format="pickle")

    # Baselines on test:
    # Baseline 1: Always 0
    always_0_preds = np.zeros_like(y_test_clf)
    always_0_cm = confusion_matrix(y_test_clf, always_0_preds, labels=[0, 1])
    always_0_metrics = {
        "precision": 0.0,
        "recall": 0.0,
        "f1": 0.0,
        "pr_auc": float(y_test_clf.mean()),
        "roc_auc": 0.5,
        "tn": int(always_0_cm[0, 0]),
        "fp": int(always_0_cm[0, 1]),
        "fn": int(always_0_cm[1, 0]),
        "tp": int(always_0_cm[1, 1]),
    }

    # Baseline 2: Simple rule (soil_moisture_pct < 35)
    rule_preds = (X_test["soil_moisture_pct"] < SOIL_MOISTURE_BASELINE_THRESHOLD).astype(int)
    rule_cm = confusion_matrix(y_test_clf, rule_preds, labels=[0, 1])
    rule_metrics = {
        "precision": float(precision_score(y_test_clf, rule_preds, zero_division=0)),
        "recall": float(recall_score(y_test_clf, rule_preds, zero_division=0)),
        "f1": float(f1_score(y_test_clf, rule_preds, zero_division=0)),
        "pr_auc": float(average_precision_score(y_test_clf, rule_preds)),
        "roc_auc": float(roc_auc_score(y_test_clf, rule_preds)),
        "tn": int(rule_cm[0, 0]),
        "fp": int(rule_cm[0, 1]),
        "fn": int(rule_cm[1, 0]),
        "tp": int(rule_cm[1, 1]),
    }

    # =========================================================================
    # TASK B: REGRESSION (irrigation_duration_minutes on positive rows)
    # =========================================================================
    print("\n" + "=" * 70)
    print("TASK B: REGRESSION (irrigation_duration_minutes on irrigate_now == 1)")
    print("=" * 70)

    train_pos_mask = (y_train_clf == 1)
    val_pos_mask   = (y_val_clf == 1)
    test_pos_mask  = (y_test_clf == 1)

    X_train_reg = X_train.loc[train_pos_mask]
    y_train_reg = train_df.loc[train_pos_mask, "irrigation_duration_minutes"].values

    X_val_reg = X_val.loc[val_pos_mask]
    y_val_reg = val_df.loc[val_pos_mask, "irrigation_duration_minutes"].values

    X_test_reg = X_test.loc[test_pos_mask]
    y_test_reg = test_df.loc[test_pos_mask, "irrigation_duration_minutes"].values

    print(f"Positive rows — Train: {len(X_train_reg):,}, Val: {len(X_val_reg):,}, Test: {len(X_test_reg):,}")

    # 1. Random Forest Regressor
    rf_reg_params = {
        "n_estimators": 200,
        "max_depth": 12,
        "random_state": 42,
        "n_jobs": -1,
    }
    print("Training Random Forest Regressor...")
    rf_reg = RandomForestRegressor(**rf_reg_params)
    rf_reg.fit(X_train_reg, y_train_reg)

    rf_val_reg_mae = float(mean_absolute_error(y_val_reg, rf_reg.predict(X_val_reg)))
    rf_test_reg_mae = float(mean_absolute_error(y_test_reg, rf_reg.predict(X_test_reg)))

    rf_reg_imp = get_feature_importances(rf_reg, feature_cols, X_val_reg, y_val_reg, scoring="neg_mean_absolute_error")
    rf_reg_imp_csv = MODELS_DIR / "rf_reg_top15_importances.csv"
    rf_reg_imp.head(15).to_csv(rf_reg_imp_csv, index=False)

    with mlflow.start_run(run_name="RandomForest_Regressor") as run_rf_reg:
        mlflow.log_params(rf_reg_params)
        mlflow.log_metric("val_mae", rf_val_reg_mae)
        mlflow.log_metric("test_mae", rf_test_reg_mae)
        mlflow.log_artifact(str(rf_reg_imp_csv))
        mlflow.sklearn.log_model(rf_reg, name="model", serialization_format="pickle")

    # 2. HistGradientBoosting Regressor
    hgb_reg_params = {
        "random_state": 42,
    }
    print("Training HistGradientBoosting Regressor...")
    hgb_reg = HistGradientBoostingRegressor(**hgb_reg_params)
    hgb_reg.fit(X_train_reg, y_train_reg)

    hgb_val_reg_mae = float(mean_absolute_error(y_val_reg, hgb_reg.predict(X_val_reg)))
    hgb_test_reg_mae = float(mean_absolute_error(y_test_reg, hgb_reg.predict(X_test_reg)))

    hgb_reg_imp = get_feature_importances(hgb_reg, feature_cols, X_val_reg, y_val_reg, scoring="neg_mean_absolute_error")
    hgb_reg_imp_csv = MODELS_DIR / "hgb_reg_top15_importances.csv"
    hgb_reg_imp.head(15).to_csv(hgb_reg_imp_csv, index=False)

    with mlflow.start_run(run_name="HistGradientBoosting_Regressor") as run_hgb_reg:
        mlflow.log_params(hgb_reg_params)
        mlflow.log_metric("val_mae", hgb_val_reg_mae)
        mlflow.log_metric("test_mae", hgb_test_reg_mae)
        mlflow.log_artifact(str(hgb_reg_imp_csv))
        mlflow.sklearn.log_model(hgb_reg, name="model", serialization_format="pickle")

    # Baseline: Training mean prediction
    train_mean_dur = float(y_train_reg.mean())
    baseline_val_mae = float(mean_absolute_error(y_val_reg, np.full_like(y_val_reg, train_mean_dur)))
    baseline_test_mae = float(mean_absolute_error(y_test_reg, np.full_like(y_test_reg, train_mean_dur)))

    # =========================================================================
    # COMBINED PIPELINE: Duration prediction across ALL test rows
    # =========================================================================
    y_test_all = test_df["irrigation_duration_minutes"].values

    def compute_combined_preds(clf, reg, threshold: float) -> np.ndarray:
        clf_pred = (clf.predict_proba(X_test)[:, 1] >= threshold).astype(int)
        raw_durations = reg.predict(X_test)
        rounded = np.round(raw_durations / DURATION_ROUND_MINUTES) * DURATION_ROUND_MINUTES
        clipped = np.clip(rounded, DURATION_MIN_LIMIT, DURATION_MAX_LIMIT)
        return np.where(clf_pred == 0, 0.0, clipped)

    rf_combined_preds = compute_combined_preds(rf_clf, rf_reg, rf_thresh)
    rf_combined_mae = float(mean_absolute_error(y_test_all, rf_combined_preds))

    hgb_combined_preds = compute_combined_preds(hgb_clf, hgb_reg, hgb_thresh)
    hgb_combined_mae = float(mean_absolute_error(y_test_all, hgb_combined_preds))

    # =========================================================================
    # SELECT & PERSIST BEST MODELS
    # =========================================================================
    if rf_val_metrics["f1"] >= hgb_val_metrics["f1"]:
        best_clf = rf_clf
        best_clf_name = "RandomForestClassifier"
        best_thresh = rf_thresh
        best_clf_imp = rf_clf_imp
        best_val_f1 = rf_val_metrics["f1"]
    else:
        best_clf = hgb_clf
        best_clf_name = "HistGradientBoostingClassifier"
        best_thresh = hgb_thresh
        best_clf_imp = hgb_clf_imp
        best_val_f1 = hgb_val_metrics["f1"]

    if rf_val_reg_mae <= hgb_val_reg_mae:
        best_reg = rf_reg
        best_reg_name = "RandomForestRegressor"
        best_val_mae = rf_val_reg_mae
    else:
        best_reg = hgb_reg
        best_reg_name = "HistGradientBoostingRegressor"
        best_val_mae = hgb_val_reg_mae

    joblib.dump(best_clf, MODELS_DIR / "best_classifier.joblib")
    joblib.dump(best_reg, MODELS_DIR / "best_regressor.joblib")

    threshold_metadata = {
        "best_classifier": best_clf_name,
        "decision_threshold": round(best_thresh, 4),
        "val_f1": round(best_val_f1, 4),
        "best_regressor": best_reg_name,
        "val_reg_mae_minutes": round(best_val_mae, 2),
    }
    with open(MODELS_DIR / "threshold.json", "w") as f:
        json.dump(threshold_metadata, f, indent=2)

    # =========================================================================
    # DISPLAY COMPARISON TABLES & METRICS
    # =========================================================================
    print("\n" + "=" * 90)
    print("MODEL COMPARISON SUMMARY")
    print("=" * 90)

    clf_summary = [
        {
            "Model": "Random Forest",
            "Thresh": f"{rf_thresh:.2f}",
            "Val F1": f"{rf_val_metrics['f1']:.4f}",
            "Test Prec": f"{rf_test_metrics['precision']:.4f}",
            "Test Rec": f"{rf_test_metrics['recall']:.4f}",
            "Test F1": f"{rf_test_metrics['f1']:.4f}",
            "Test PR-AUC": f"{rf_test_metrics['pr_auc']:.4f}",
            "Test ROC-AUC": f"{rf_test_metrics['roc_auc']:.4f}",
            "Test Conf Matrix [TN,FP,FN,TP]": f"[{rf_test_metrics['tn']},{rf_test_metrics['fp']},{rf_test_metrics['fn']},{rf_test_metrics['tp']}]",
        },
        {
            "Model": "HistGradientBoosting",
            "Thresh": f"{hgb_thresh:.2f}",
            "Val F1": f"{hgb_val_metrics['f1']:.4f}",
            "Test Prec": f"{hgb_test_metrics['precision']:.4f}",
            "Test Rec": f"{hgb_test_metrics['recall']:.4f}",
            "Test F1": f"{hgb_test_metrics['f1']:.4f}",
            "Test PR-AUC": f"{hgb_test_metrics['pr_auc']:.4f}",
            "Test ROC-AUC": f"{hgb_test_metrics['roc_auc']:.4f}",
            "Test Conf Matrix [TN,FP,FN,TP]": f"[{hgb_test_metrics['tn']},{hgb_test_metrics['fp']},{hgb_test_metrics['fn']},{hgb_test_metrics['tp']}]",
        },
        {
            "Model": "Baseline: Rule (moisture<35)",
            "Thresh": "35%",
            "Val F1": "-",
            "Test Prec": f"{rule_metrics['precision']:.4f}",
            "Test Rec": f"{rule_metrics['recall']:.4f}",
            "Test F1": f"{rule_metrics['f1']:.4f}",
            "Test PR-AUC": f"{rule_metrics['pr_auc']:.4f}",
            "Test ROC-AUC": f"{rule_metrics['roc_auc']:.4f}",
            "Test Conf Matrix [TN,FP,FN,TP]": f"[{rule_metrics['tn']},{rule_metrics['fp']},{rule_metrics['fn']},{rule_metrics['tp']}]",
        },
        {
            "Model": "Baseline: Always 0",
            "Thresh": "-",
            "Val F1": "-",
            "Test Prec": f"{always_0_metrics['precision']:.4f}",
            "Test Rec": f"{always_0_metrics['recall']:.4f}",
            "Test F1": f"{always_0_metrics['f1']:.4f}",
            "Test PR-AUC": f"{always_0_metrics['pr_auc']:.4f}",
            "Test ROC-AUC": f"{always_0_metrics['roc_auc']:.4f}",
            "Test Conf Matrix [TN,FP,FN,TP]": f"[{always_0_metrics['tn']},{always_0_metrics['fp']},{always_0_metrics['fn']},{always_0_metrics['tp']}]",
        },
    ]

    print("\n1. Classification (Task A - irrigate_now):")
    pd.set_option("display.max_columns", 10)
    pd.set_option("display.width", 1000)
    df_clf_summary = pd.DataFrame(clf_summary)
    print(df_clf_summary.to_string(index=False))

    reg_summary = [
        {
            "Model": "Random Forest Regressor",
            "Val MAE (min)": f"{rf_val_reg_mae:.2f}",
            "Test MAE (min)": f"{rf_test_reg_mae:.2f}",
            "Combined All-Test MAE (min)": f"{rf_combined_mae:.2f}",
        },
        {
            "Model": "HistGradientBoosting Regressor",
            "Val MAE (min)": f"{hgb_val_reg_mae:.2f}",
            "Test MAE (min)": f"{hgb_test_reg_mae:.2f}",
            "Combined All-Test MAE (min)": f"{hgb_combined_mae:.2f}",
        },
        {
            "Model": "Baseline: Training Mean Duration",
            "Val MAE (min)": f"{baseline_val_mae:.2f}",
            "Test MAE (min)": f"{baseline_test_mae:.2f}",
            "Combined All-Test MAE (min)": "-",
        },
    ]

    print("\n2. Regression (Task B - Duration) & Combined Pipeline:")
    df_reg_summary = pd.DataFrame(reg_summary)
    print(df_reg_summary.to_string(index=False))

    print("\nNote: Labels are noisy on purpose (about 8% false negatives and 3% false positives), so perfect scores are not possible.")

    print("\n" + "=" * 70)
    print("BEST MODELS & MLFLOW RUNS")
    print("=" * 70)
    print(f"Best Classifier : {best_clf_name} (Val F1: {best_val_f1:.4f}, Threshold: {best_thresh:.2f})")
    print(f"Best Regressor  : {best_reg_name} (Val MAE: {best_val_mae:.2f} min)")
    print(f"Saved artifacts : {MODELS_DIR / 'best_classifier.joblib'}, {MODELS_DIR / 'best_regressor.joblib'}, {MODELS_DIR / 'threshold.json'}")

    print("\nTop 5 Most Important Features for Best Classifier:")
    for idx, row in best_clf_imp.head(5).iterrows():
        print(f"  {idx + 1}. {row['feature']:<30} (importance: {row['importance']:.4f})")

    print("\nMLflow Run Names:")
    print(f"  - {run_rf_clf.info.run_name} (run_id: {run_rf_clf.info.run_id})")
    print(f"  - {run_hgb_clf.info.run_name} (run_id: {run_hgb_clf.info.run_id})")
    print(f"  - {run_rf_reg.info.run_name} (run_id: {run_rf_reg.info.run_id})")
    print(f"  - {run_hgb_reg.info.run_name} (run_id: {run_hgb_reg.info.run_id})")


if __name__ == "__main__":
    main()
