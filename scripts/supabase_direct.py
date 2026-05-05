"""
supabase_direct.py — Lightweight Supabase REST wrapper
Uses apikey as a query param (bypasses NextAuth JWK header conflict).
Usage:
    from supabase_direct import SupabaseDirect
    db = SupabaseDirect()
    rows = db.select("bills", "id,title", limit=5)
    db.update("bills", {"summary": "..."}, eq="id", eq_val="some-uuid")
"""

import os
import json
import logging
import requests
from typing import Any, Dict, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass


class SupabaseDirect:
    """Direct Supabase REST client using apikey query parameter authentication."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            raise EnvironmentError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        })

    def _endpoint(self, table: str) -> str:
        return f"{self.url}/rest/v1/{table}"

    def _params(self, extra: Optional[Dict] = None) -> Dict:
        p = {"apikey": self.key}
        if extra:
            p.update(extra)
        return p

    def select(self, table: str, columns: str = "*", limit: Optional[int] = None,
               eq: Optional[str] = None, eq_val: Optional[str] = None) -> List[Dict]:
        params = self._params({"select": columns})
        if limit:
            params["limit"] = limit
        if eq and eq_val is not None:
            params[eq] = f"eq.{eq_val}"
        r = self.session.get(self._endpoint(table), params=params, timeout=30)
        r.raise_for_status()
        return r.json()

    def update(self, table: str, data: Dict[str, Any],
               eq: str = "id", eq_val: str = "") -> Dict:
        params = self._params({eq: f"eq.{eq_val}"})
        r = self.session.patch(
            self._endpoint(table),
            params=params,
            data=json.dumps(data),
            timeout=30
        )
        if r.status_code not in (200, 204):
            raise Exception(f"UPDATE failed [{r.status_code}]: {r.text[:200]}")
        return r.json() if r.text else {}

    def insert(self, table: str, data: Dict[str, Any]) -> Dict:
        params = self._params()
        r = self.session.post(
            self._endpoint(table),
            params=params,
            data=json.dumps(data),
            timeout=30
        )
        if r.status_code not in (200, 201):
            raise Exception(f"INSERT failed [{r.status_code}]: {r.text[:200]}")
        return r.json()
