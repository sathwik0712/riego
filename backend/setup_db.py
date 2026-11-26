"""Database setup and migration script for Riego.

Safe to run repeatedly. Never drops, truncates, or deletes anything.
Supports --check to inspect database state without making changes.
"""

import argparse
import ast
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in sys.path
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import models
from database import Base


def get_hypertables_from_main() -> List[Tuple[str, str, str]]:
    """Extract hypertable queries from main.py so logic is reused, not copied.
    Returns list of (table_name, time_column, query_sql).
    """
    main_path = _BACKEND_DIR / "main.py"
    if not main_path.exists():
        return []
    content = main_path.read_text()
    pattern = r"SELECT\s+create_hypertable\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"][^;]*\);"
    results = []
    for m in re.finditer(pattern, content, re.IGNORECASE):
        table_name = m.group(1)
        time_col = m.group(2)
        query = m.group(0)
        results.append((table_name, time_col, query))
    return results


def get_main_seed_farmer_kwargs() -> Optional[Dict[str, Any]]:
    """Inspect main.py AST. If main.py seeds farmer_001 on startup, extract
    the keyword arguments so the seeding logic and data are reused directly from main.py.
    Returns None if main.py does not seed farmer_001.
    """
    main_path = _BACKEND_DIR / "main.py"
    if not main_path.exists():
        return None
    try:
        tree = ast.parse(main_path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                is_farmer = False
                if isinstance(node.func, ast.Attribute) and node.func.attr == "Farmer":
                    is_farmer = True
                elif isinstance(node.func, ast.Name) and node.func.id == "Farmer":
                    is_farmer = True
                if is_farmer:
                    kw_dict = {}
                    for kw in node.keywords:
                        if isinstance(kw.value, ast.Constant):
                            kw_dict[kw.arg] = kw.value.value
                    if kw_dict.get("farmer_id") == "farmer_001":
                        return kw_dict
    except Exception:
        pass
    return None


def check_db(engine) -> List[str]:
    """Check database schema against models and main.py requirements.
    Returns list of missing items. Never modifies the database.
    """
    missing: List[str] = []
    inspector = inspect(engine)

    with engine.connect() as conn:
        # 1. Check TimescaleDB extension
        ext_exists = conn.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'")
        ).scalar()
        if not ext_exists:
            missing.append("TimescaleDB extension")

        # 2. Check tables and columns
        existing_tables = set(inspector.get_table_names())
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                missing.append(f"table: {table.name}")
            else:
                existing_cols = {col["name"]: col for col in inspector.get_columns(table.name)}
                for column in table.columns:
                    if column.name not in existing_cols:
                        if not column.nullable and column.default is None and column.server_default is None:
                            missing.append(
                                f"column: {table.name}.{column.name} (NOT NULL with no default, cannot auto-add)"
                            )
                        else:
                            missing.append(f"column: {table.name}.{column.name}")

        # 3. Check hypertables
        if ext_exists:
            try:
                db_hypertables = set(
                    row[0] for row in conn.execute(
                        text("SELECT hypertable_name FROM timescaledb_information.hypertables")
                    ).fetchall()
                )
            except Exception:
                db_hypertables = set()
        else:
            db_hypertables = set()

        for table_name, _, _ in get_hypertables_from_main():
            if table_name not in db_hypertables:
                missing.append(f"hypertable: {table_name}")

        # 4. Check seed data if main.py seeds it
        seed_kwargs = get_main_seed_farmer_kwargs()
        if seed_kwargs and "farmers" in existing_tables:
            farmer_exists = conn.execute(
                text("SELECT 1 FROM farmers WHERE farmer_id = :fid"),
                {"fid": seed_kwargs["farmer_id"]}
            ).scalar()
            if not farmer_exists:
                missing.append(f"seed data: farmer {seed_kwargs['farmer_id']}")

    return missing


def setup_db(engine) -> List[str]:
    """Apply schema setup and missing columns.
    Never drops, truncates, or deletes anything.
    Returns list of changes made.
    """
    changes: List[str] = []

    # 1. Make sure TimescaleDB extension exists
    with engine.begin() as conn:
        ext_exists = conn.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'")
        ).scalar()
        if not ext_exists:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            changes.append("Created extension: timescaledb")

    # 2. Run create_all for all models
    inspector = inspect(engine)
    existing_tables_before = set(inspector.get_table_names())
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    existing_tables_after = set(inspector.get_table_names())
    new_tables = existing_tables_after - existing_tables_before
    for t in sorted(new_tables):
        changes.append(f"Created table: {t}")

    # 3. For every model column missing in its table, run ALTER TABLE ... ADD COLUMN IF NOT EXISTS
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name in existing_tables_after:
                existing_cols = {col["name"]: col for col in inspector.get_columns(table.name)}
                for column in table.columns:
                    if column.name not in existing_cols:
                        if not column.nullable and column.default is None and column.server_default is None:
                            print(f"Warning: Column {table.name}.{column.name} is NOT NULL with no default. Skipping.")
                            continue

                        # Add column as nullable
                        col_type = column.type.compile(engine.dialect)
                        sql = f'ALTER TABLE "{table.name}" ADD COLUMN IF NOT EXISTS "{column.name}" {col_type};'
                        conn.execute(text(sql))
                        changes.append(f"Added column: {table.name}.{column.name} ({col_type})")

    # 4. Make sensor_readings and weather_readings hypertables (if_not_exists) reusing code from main.py
    with engine.begin() as conn:
        try:
            db_hypertables = set(
                row[0] for row in conn.execute(
                    text("SELECT hypertable_name FROM timescaledb_information.hypertables")
                ).fetchall()
            )
        except Exception:
            db_hypertables = set()

        for table_name, time_col, query in get_hypertables_from_main():
            if table_name not in db_hypertables:
                try:
                    conn.execute(text(query))
                    changes.append(f"Created hypertable: {table_name} on {time_col}")
                except Exception as e:
                    print(f"Notice: hypertable creation for {table_name}: {e}")

    # 5. Seed farmer_001 only if main.py seeds it on startup
    seed_kwargs = get_main_seed_farmer_kwargs()
    if seed_kwargs:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        try:
            exists = db.query(models.Farmer).filter(
                models.Farmer.farmer_id == seed_kwargs["farmer_id"]
            ).first()
            if not exists:
                db.add(models.Farmer(**seed_kwargs))
                db.commit()
                changes.append(f"Seeded sample farmer: {seed_kwargs['farmer_id']}")
        finally:
            db.close()

    return changes


def main():
    parser = argparse.ArgumentParser(description="Database setup and migration script for Riego.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report missing tables, columns, hypertables without making changes.",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Database connection URL (defaults to DATABASE_URL environment variable).",
    )
    args = parser.parse_args()

    # Load .env if DATABASE_URL not already set
    if "DATABASE_URL" not in os.environ and (_BACKEND_DIR / ".env").exists():
        load_dotenv(_BACKEND_DIR / ".env")

    db_url = args.db_url or os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set and --db-url not provided.")
        sys.exit(1)

    # Never print db_url or credentials
    engine = create_engine(db_url)

    if args.check:
        missing = check_db(engine)
        if not missing:
            print("No changes needed")
        else:
            for item in missing:
                print(f"Missing: {item}")
    else:
        changes = setup_db(engine)
        if not changes:
            print("No changes needed")
        else:
            for c in changes:
                print(c)


if __name__ == "__main__":
    main()
