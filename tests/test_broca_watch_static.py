"""Static guards for Broca-wire chat: hitch background Letta runs; name-only Message-as."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "public" / "app.js").read_text(encoding="utf-8")
CHAT = (ROOT / "public" / "chat.html").read_text(encoding="utf-8")


class BrocaWatchStaticTests(unittest.TestCase):
    def test_watch_accepts_background_runs(self) -> None:
        i = APP.index("watchLettaRunAfterEnqueue")
        chunk = APP[i : i + 5000]
        self.assertIn("enqueue_at", chunk)
        self.assertIn("via: 'history'", chunk)
        self.assertNotIn("background === true", chunk)
        self.assertNotIn("background === 'true'", chunk)

    def test_hitch_does_not_skip_background(self) -> None:
        # tickActiveRuns / hitch path used to ignore Broca's background=True runs
        self.assertNotIn(
            "if (r.background === true || r.background === 'true')",
            CHAT,
        )

    def test_message_as_label_is_name_only(self) -> None:
        i = CHAT.index("function userLabel(u)")
        chunk = CHAT[i : i + 600]
        self.assertIn("name only", chunk)
        self.assertNotIn(" + u.platform + '/' + u.platform_user_id", chunk)


if __name__ == "__main__":
    unittest.main()
