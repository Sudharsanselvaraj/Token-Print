# TokenPrint trace validation follow-up (separate contribution)

This follow-up addresses the trace parser in the uploaded source snapshot. The parser claims to reject unsupported trace versions, but currently accepts versions greater than `TRACE_VERSION`, and it only checks the existence—not the shape—of `meta`, `frames`, and `done`.

## Complete replacement files

- `backend/app/trace.py`
- `backend/tests/test_trace.py` (new)

The modified parser accepts the current version 1 only, rejects booleans masquerading as integers, verifies the key container types, requires frame objects with `type: token`, and requires a completion object with `type: done`. It intentionally does not validate every backend-specific token payload field.

## Validation performed

- `python -m pytest -q tests/test_trace.py`: **14 passed**.
- The parser also accepted the repository's `fixtures/traces/baseline.json` and `frontend/public/demo/hello-world.json` traces.

Keep this change separate from the inference-reliability PR unless the selected issue explicitly covers trace validation. Run request-size limits at the API boundary separately; this parser validation does not prevent a huge JSON request from being read into memory before validation.
