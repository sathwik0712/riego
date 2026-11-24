"""Background collector service for periodic field weather and forecast snapshots."""

import asyncio
import time
from typing import Any, Dict
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from services.weather import fetch_field_weather, WeatherUnavailable
from services.auto_recommend import ensure_recommendation

COLLECT_EVERY_MINUTES = 60
PAUSE_BETWEEN_FIELDS_SECONDS = 2
AUTO_RECOMMEND_ENABLED = True


def run_collection_once() -> Dict[str, int]:
    """
    Open a database session, fetch fresh weather and forecast for all fields
    with valid coordinates, and save readings/snapshots respecting the 10-minute check.
    Closes the session at the end.
    """
    db: Session = SessionLocal()
    saved_count = 0
    skipped_count = 0
    unavailable_count = 0
    error_count = 0

    rec_created = 0
    rec_open = 0
    rec_paused = 0
    rec_not_needed = 0
    rec_no_data = 0
    rec_stale = 0
    rec_error = 0

    try:
        fields = (
            db.query(models.Field)
            .filter(models.Field.latitude.isnot(None), models.Field.longitude.isnot(None))
            .order_by(models.Field.id.asc())
            .all()
        )
        total_fields = len(fields)

        for idx, field in enumerate(fields):
            if idx > 0 and PAUSE_BETWEEN_FIELDS_SECONDS > 0:
                time.sleep(PAUSE_BETWEEN_FIELDS_SECONDS)

            field_label = f"Field {field.id}" + (f" ({field.nickname})" if field.nickname else "")

            # Check snapshot ID before call to see if a new row gets added
            latest_before = (
                db.query(models.ForecastSnapshot)
                .filter(models.ForecastSnapshot.field_id == field.id)
                .order_by(models.ForecastSnapshot.fetched_at.desc())
                .first()
            )
            before_id = latest_before.id if latest_before else None

            weather_saved = False
            try:
                fetch_field_weather(db, field)

                # Check if a new row was saved or skipped by 10-minute rule
                latest_after = (
                    db.query(models.ForecastSnapshot)
                    .filter(models.ForecastSnapshot.field_id == field.id)
                    .order_by(models.ForecastSnapshot.fetched_at.desc())
                    .first()
                )
                after_id = latest_after.id if latest_after else None

                if after_id != before_id:
                    saved_count += 1
                    print(f"[Collector] {field_label}: saved")
                else:
                    skipped_count += 1
                    print(f"[Collector] {field_label}: skipped")
                weather_saved = True
            except WeatherUnavailable:
                unavailable_count += 1
                print(f"[Collector] {field_label}: weather unavailable")
            except Exception as e:
                error_count += 1
                print(f"[Collector] {field_label}: failed ({e})")

            # After a field's weather is saved, call ensure_recommendation for that field
            if AUTO_RECOMMEND_ENABLED:
                try:
                    rec_res = ensure_recommendation(db, field.id)
                    outcome = rec_res.get("result", "not_needed")
                    if outcome == "created":
                        rec_created += 1
                        print(f"[Collector] {field_label} recommendation: created")
                    elif outcome == "already_open":
                        rec_open += 1
                        print(f"[Collector] {field_label} recommendation: already open")
                    elif outcome == "paused_after_irrigation":
                        rec_paused += 1
                        print(f"[Collector] {field_label} recommendation: paused after irrigation")
                    elif outcome == "not_needed":
                        rec_not_needed += 1
                        print(f"[Collector] {field_label} recommendation: not needed")
                    elif outcome == "not_enough_data":
                        rec_no_data += 1
                        print(f"[Collector] {field_label} recommendation: not enough data")
                    elif outcome == "stale":
                        rec_stale += 1
                        print(f"[Collector] {field_label} recommendation: stale")
                    else:
                        rec_not_needed += 1
                        print(f"[Collector] {field_label} recommendation: {outcome}")
                except Exception as e:
                    rec_error += 1
                    print(f"[Collector] {field_label} recommendation: error ({e})")

        print(
            f"[Collector] Collection complete: {saved_count} saved, {skipped_count} skipped, "
            f"{unavailable_count} weather unavailable, {error_count} errors; "
            f"recommendations: {rec_created} created, {rec_open} already open, "
            f"{rec_paused} paused after irrigation, "
            f"{rec_not_needed} not needed, {rec_no_data} not enough data, "
            f"{rec_stale} stale, {rec_error} errors ({total_fields} fields total)"
        )

        return {
            "total": total_fields,
            "saved": saved_count,
            "skipped": skipped_count,
            "unavailable": unavailable_count,
            "error": error_count,
            "rec_created": rec_created,
            "rec_already_open": rec_open,
            "rec_paused_after_irrigation": rec_paused,
            "rec_not_needed": rec_not_needed,
            "rec_not_enough_data": rec_no_data,
            "rec_stale": rec_stale,
            "rec_error": rec_error,
        }
    finally:
        db.close()


async def collector_loop():
    """
    Asynchronous collector loop that waits 30 seconds after startup,
    then executes run_collection_once() in a separate thread every COLLECT_EVERY_MINUTES.
    Logs any unexpected error and keeps running.
    """
    try:
        await asyncio.sleep(30)
    except asyncio.CancelledError:
        print("[Collector] Background loop cancelled before first collection.")
        return

    while True:
        try:
            await asyncio.to_thread(run_collection_once)
        except asyncio.CancelledError:
            print("[Collector] Background loop cancelled.")
            break
        except Exception as e:
            print(f"[Collector] Unexpected error in collector loop: {e}")

        try:
            await asyncio.sleep(COLLECT_EVERY_MINUTES * 60)
        except asyncio.CancelledError:
            print("[Collector] Background loop cancelled during sleep.")
            break
