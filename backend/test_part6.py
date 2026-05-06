import httpx
import json
import time

base_url = "http://127.0.0.1:8000/api"

print("\n=== 1. TEST HALLUCINATION ENDPOINT ===")
r_hal = httpx.post(
    f"{base_url}/evaluate/hallucination",
    json={
        "text": "The revenue was $10 million and profit was $5 million.",
        "context": "The company reported revenue of $10 million in Q3."
    },
    timeout=60,
)
print("Status:", r_hal.status_code)
print(json.dumps(r_hal.json(), indent=2))

print("\n=== 2. GET CURRENT ROUTING CONFIG ===")
r_get_routing = httpx.get(f"{base_url}/config/routing")
print("Status:", r_get_routing.status_code)
print(json.dumps(r_get_routing.json(), indent=2))

print("\n=== 3. TEST ROUTING ENDPOINT ===")
r_test_routing = httpx.post(
    f"{base_url}/config/test-routing",
    json={"query": "Compare all regional growth rates"},
    timeout=30,
)
print("Status:", r_test_routing.status_code)
print(json.dumps(r_test_routing.json(), indent=2))

print("\n=== 4. START BATCH EVALUATION ===")
r_batch = httpx.post(
    f"{base_url}/evaluate/batch",
    json={"dataset_path": "app/data/eval_dataset.json"},
    timeout=30,
)
print("Status:", r_batch.status_code)
print(json.dumps(r_batch.json(), indent=2))

# Wait for evaluation to finish (might take a bit, but we can just ping results history)
print("\nWaiting for batch eval to finish... (up to 2 minutes)")
for _ in range(24):
    time.sleep(5)
    r_results = httpx.get(f"{base_url}/evaluate/results/history")
    if r_results.status_code == 200 and len(r_results.json()) > 0:
        print("Batch complete!")
        break
    print(".", end="", flush=True)
print()

print("\n=== 5. GET EVALUATION RESULTS ===")
r_eval = httpx.get(f"{base_url}/evaluate/results")
print("Status:", r_eval.status_code)
if r_eval.status_code == 200:
    data = r_eval.json()
    print("Agentic Pass Rate:", data.get("pass_rate"))
    print("Summary:", data.get("summary"))

print("\n=== 6. UPDATE THRESHOLD ===")
r_thresh = httpx.put(
    f"{base_url}/config/thresholds",
    json={"hallucination_threshold": 0.15},
    timeout=30,
)
print("Status:", r_thresh.status_code)
print("New Threshold:", r_thresh.json().get("new_thresholds", {}).get("hallucination_threshold"))
