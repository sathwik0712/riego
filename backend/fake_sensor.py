import argparse
import os
import random
import time
from datetime import datetime
import requests


def parse_args():
    parser = argparse.ArgumentParser(description="Simulate an ESP32 capacitive soil moisture sensor.")
    parser.add_argument(
        "--device-id",
        type=str,
        default="ESP32-001",
        help="Device ID assigned to a field (default: ESP32-001)",
    )
    parser.add_argument(
        "--device-key",
        type=str,
        default=None,
        help="Device key for X-Device-Key authentication (overrides RIEGO_DEVICE_KEY env var)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Seconds between readings (default: 5)",
    )
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000/sensor-readings",
        help="Endpoint URL (default: http://localhost:8000/sensor-readings)",
    )
    parser.add_argument(
        "--skip-chance",
        type=float,
        default=0.0,
        help="Probability (0.0 to 1.0) of skipping a reading to simulate sensor failure (default: 0.0)",
    )
    parser.add_argument(
        "--stop-after",
        type=int,
        default=None,
        help="Stop after this many readings are sent (default: run forever)",
    )
    return parser.parse_args()


def simulate_sensor():
    args = parse_args()

    # Resolve device key: CLI flag takes precedence, then env var, then absent (will get 401)
    device_key = args.device_key or os.environ.get("RIEGO_DEVICE_KEY") or None

    # Initial reading around 2500 (higher raw = drier soil)
    current_value = 2500
    sent_count = 0

    print(f"Starting sensor simulator for device: {args.device_id}")
    print(f"Target URL: {args.url}")
    if args.stop_after:
        print(f"Will stop after {args.stop_after} reading(s) sent.")
    print(f"Sending readings every {args.interval}s. Press Ctrl+C to stop.\n")

    try:
        while True:
            # Normal drift: soil drying makes raw value slowly drift UP
            drift = random.randint(-5, 20)

            # About 1 in 10 readings (~10% chance), simulate an irrigation event with a big drop
            if random.random() < 0.10:
                drift -= random.randint(300, 600)

            current_value += drift

            # Keep reading clamped between 0 and 4095
            current_value = max(0, min(4095, current_value))

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Randomly skip sending this reading to simulate sensor failure
            if random.random() < args.skip_chance:
                print(f"[{timestamp}] Raw Value: {current_value:4d} | Skipped (simulated sensor failure)")
                time.sleep(args.interval)
                continue

            payload = {
                "device_id": args.device_id,
                "raw_value": current_value,
            }

            # Build headers with device key if available
            headers = {}
            if device_key:
                headers["X-Device-Key"] = device_key

            # Post reading to backend API
            try:
                response = requests.post(args.url, json=payload, headers=headers, timeout=5)
                if response.status_code == 201:
                    moisture = response.json().get("moisture_percent")
                    print(f"[{timestamp}] Raw Value: {current_value:4d} (Moisture: {moisture}%) | Status: {response.status_code}")
                else:
                    print(f"[{timestamp}] Raw Value: {current_value:4d} | Status: {response.status_code}")
            except requests.RequestException as error:
                # Handle connection errors without crashing
                print(f"[{timestamp}] Raw Value: {current_value:4d} | Request failed: {error.__class__.__name__}")

            sent_count += 1

            # Stop after the requested number of readings have been sent
            if args.stop_after is not None and sent_count >= args.stop_after:
                print(f"\nReached --stop-after limit of {args.stop_after} reading(s). Stopping.")
                break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        # Clean exit on Ctrl+C
        print("\nSensor simulation stopped.")


if __name__ == "__main__":
    simulate_sensor()
