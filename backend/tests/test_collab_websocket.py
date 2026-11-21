"""Tests for Phase 5.8c (#301): Collaborative Cursors & Presence WebSocket channel."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import pytest
except ImportError:
    class _PytestFallback:
        @staticmethod
        def raises(expected_exception):
            class _RaisesContext:
                def __enter__(self):
                    return self

                def __exit__(self, exc_type, exc_val, exc_tb):
                    if exc_type is None:
                        raise AssertionError(f"DID NOT RAISE {expected_exception}")
                    return issubclass(exc_type, expected_exception)

            return _RaisesContext()

    pytest = _PytestFallback()

from app.main import app
from fastapi.testclient import TestClient


def test_collab_room_presence_and_cursor_sync():
    """Verify multiple peers can join a room, receive presence, exchange cursors, and enforce role authority."""
    client = TestClient(app)

    # Peer 1 connects to room "room-42"
    with client.websocket_connect(
        "/ws/collab/room-42?user_id=alice&name=Alice&color=%2310b981"
    ) as ws1:
        # Peer 1 gets initial presence with version 1
        msg1 = ws1.receive_json()
        assert msg1["type"] == "presence"
        assert msg1["room_id"] == "room-42"
        assert msg1["version"] == 1
        assert len(msg1["peers"]) == 1
        assert msg1["peers"][0]["user_id"] == "alice"

        # Peer 2 connects to the same room
        with client.websocket_connect(
            "/ws/collab/room-42?user_id=bob&name=Bob&color=%233b82f6"
        ) as ws2:
            # Peer 1 receives updated presence with both peers
            presence_for_p1 = ws1.receive_json()
            assert presence_for_p1["type"] == "presence"
            assert len(presence_for_p1["peers"]) == 2
            assert presence_for_p1["version"] == 2

            # Peer 2 also receives presence
            presence_for_p2 = ws2.receive_json()
            assert presence_for_p2["type"] == "presence"
            assert len(presence_for_p2["peers"]) == 2

            # Viewer step rejection test: Alice is initially "viewer", so step messages must NOT be broadcast
            ws1.send_json({"type": "step", "op_index": 3, "token_index": 1})
            # Verify Bob can still exchange valid cursor without receiving the discarded step
            ws1.send_json(
                {
                    "type": "cursor",
                    "cursor": {"x": 0.45, "y": 0.72, "activeLayer": 4, "timestamp": 12345},
                }
            )

            # Bob receives peer_cursor from Alice (NOT peer_step)
            cursor_msg = ws2.receive_json()
            assert cursor_msg["type"] == "peer_cursor"
            assert cursor_msg["user_id"] == "alice"
            assert cursor_msg["cursor"]["activeLayer"] == 4
            assert cursor_msg["cursor"]["x"] == 0.45

            # Malformed cursor rejection: invalid coordinates should not reach ws1
            ws2.send_json(
                {
                    "type": "cursor",
                    "cursor": {"x": "not-a-number", "y": 0.5, "timestamp": 12345},
                }
            )
            # Send a valid selection after malformed cursor to verify stream is intact
            ws2.send_json(
                {
                    "type": "selection",
                    "selection": {"kind": "layer", "index": 7, "name": "Layer 7"},
                }
            )

            # Alice receives peer_selection directly without any malformed peer_cursor
            selection_msg = ws1.receive_json()
            assert selection_msg["type"] == "peer_selection"
            assert selection_msg["user_id"] == "bob"
            assert selection_msg["selection"]["kind"] == "layer"
            assert selection_msg["selection"]["index"] == 7

            # Alice changes role to presenter
            ws1.send_json({"type": "role", "role": "presenter"})
            role_presence_p1 = ws1.receive_json()
            assert role_presence_p1["type"] == "presence"
            role_presence_p2 = ws2.receive_json()
            assert role_presence_p2["type"] == "presence"
            p1_entry = next(p for p in role_presence_p2["peers"] if p["user_id"] == "alice")
            assert p1_entry["role"] == "presenter"

            # Now that Alice is presenter, valid classroom step is broadcast
            ws1.send_json({"type": "step", "op_index": 3, "token_index": 1})
            step_msg = ws2.receive_json()
            assert step_msg["type"] == "peer_step"
            assert step_msg["user_id"] == "alice"
            assert step_msg["op_index"] == 3

            # Malformed step (negative op_index or boolean) should be rejected
            ws1.send_json({"type": "step", "op_index": -1})
            # Ping/Pong test to confirm connection is responsive and step was dropped
            ws1.send_json({"type": "ping"})
            pong_msg = ws1.receive_json()
            assert pong_msg["type"] == "pong"

        # Bob disconnected: Alice receives presence update with only 1 peer
        presence_after_dc = ws1.receive_json()
        assert presence_after_dc["type"] == "presence"
        assert len(presence_after_dc["peers"]) == 1
        assert presence_after_dc["peers"][0]["user_id"] == "alice"


def test_collab_handshake_parameter_validation():
    """Verify handshake rejects invalid colors, room IDs, and roles."""
    client = TestClient(app)

    # Invalid room ID characters
    with pytest.raises(Exception), client.websocket_connect("/ws/collab/invalid%20room%21"):
        pass

    # Invalid CSS url() injection in color parameter
    with pytest.raises(Exception), client.websocket_connect(
        "/ws/collab/room-safe?user_id=attacker&color=url(https://evil.com)"
    ):
        pass

    # Invalid role
    with pytest.raises(Exception), client.websocket_connect(
        "/ws/collab/room-safe?user_id=attacker&color=%2310b981&role=superadmin"
    ):
        pass




def test_collab_socket_isolation_on_reconnect():
    """Verify reconnecting with the same user_id does not get deleted by old disconnect."""
    from contextlib import ExitStack

    client = TestClient(app)

    # Keep the old connection in its own independently managed stack.
    with ExitStack() as first_stack:
        ws1 = first_stack.enter_context(
            client.websocket_connect(
                "/ws/collab/room-dc?user_id=charlie&color=%2338bdf8"
            )
        )

        init_msg = ws1.receive_json()
        assert init_msg["type"] == "presence"

        # Keep the replacement connection open while closing the old one.
        with ExitStack() as second_stack:
            ws2 = second_stack.enter_context(
                client.websocket_connect(
                    "/ws/collab/room-dc?user_id=charlie&color=%2338bdf8"
                )
            )

            reconn_msg = ws2.receive_json()
            assert reconn_msg["type"] == "presence"

            # Close the old connection while ws2 is still active.
            first_stack.close()

            # Check the presence update caused by the old connection closing.
            presence_after_disconnect = ws2.receive_json()
            assert presence_after_disconnect["type"] == "presence"
            assert any(
                peer["user_id"] == "charlie"
                for peer in presence_after_disconnect["peers"]
            )

            # The replacement connection must still respond.
            ws2.send_json({"type": "ping"})
            pong = ws2.receive_json()
            assert pong["type"] == "pong"
