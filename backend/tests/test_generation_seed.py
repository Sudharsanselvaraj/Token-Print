"""Seed zero is a valid reproducibility setting, not an omitted seed."""

import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from fastapi.testclient import TestClient


def test_websocket_preserves_zero_seed():
    engine = mock.MagicMock()
    engine.generate_steps.return_value = iter(
        [{"type": "done", "generated_text": "", "total_steps": 0}]
    )
    with (
        mock.patch("app.main.engine", engine),
        TestClient(app).websocket_connect("/ws/generate") as ws,
    ):
        ws.send_json({"prompt": "seed regression", "seed": 0, "max_new_tokens": 1})
        assert ws.receive_json()["type"] == "done"
    assert engine.generate_steps.call_args.args[-1] == 0
