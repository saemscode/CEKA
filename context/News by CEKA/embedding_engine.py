"""
embedding_engine.py - CEKA News Intelligence Engine: Embeddings
==================================================================
Two real providers, both output 768 dimensions to match the
`vector(768)` columns in schema_news_intelligence.sql.

Primary: gemini-embedding-001 via the `google-genai` SDK, with
output_dimensionality=768. NOTE: text-embedding-004 and
models/embedding-001 are deprecated as of 2026 - do not use them.
gemini-embedding-001 defaults to 3072 dimensions; this engine
explicitly requests 768 via output_dimensionality and applies the
manual L2 normalisation Google's docs require for any dimension
other than the native 3072.

Fallback: sentence-transformers/all-mpnet-base-v2, run locally,
no API key required, also native 768-dim output - no truncation,
no mismatch.

pip install google-genai sentence-transformers numpy
"""

import os
import logging
from typing import List, Optional

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [EMBED] - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

EMBEDDING_DIM = 768


def _l2_normalize(vec: List[float]) -> List[float]:
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return vec
    return (arr / norm).tolist()


class EmbeddingEngine:
    """
    Ordered provider chain. First provider that returns a valid
    768-dim vector wins. Failures fall through silently (logged),
    matching the resilience pattern used elsewhere in the CEKA
    pipeline (MultiLLMOrchestrator, RemoteOCREngine).
    """

    def __init__(self):
        self._gemini_client = None
        self._st_model = None
        self.metrics = {"gemini_calls": 0, "gemini_failed": 0, "local_calls": 0, "local_failed": 0}

    # -------------------------------------------------------------
    #  Provider 1: Gemini gemini-embedding-001
    # -------------------------------------------------------------
    def _get_gemini_client(self):
        if self._gemini_client is not None:
            return self._gemini_client
        api_key = os.environ.get("CEKA_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_GEMINI_API_KEY")
        if not api_key:
            return None
        try:
            from google import genai
            self._gemini_client = genai.Client(api_key=api_key)
            return self._gemini_client
        except ImportError:
            logger.warning("google-genai not installed. pip install google-genai")
            return None
        except Exception as e:
            logger.warning(f"Gemini client init failed: {e}")
            return None

    def _embed_gemini(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[List[float]]:
        client = self._get_gemini_client()
        if client is None:
            return None
        self.metrics["gemini_calls"] += 1
        try:
            from google.genai import types
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text[:8000],
                config=types.EmbedContentConfig(
                    output_dimensionality=EMBEDDING_DIM,
                    task_type=task_type,
                ),
            )
            if not result.embeddings:
                self.metrics["gemini_failed"] += 1
                return None
            values = result.embeddings[0].values
            if len(values) != EMBEDDING_DIM:
                logger.warning(f"Gemini returned {len(values)} dims, expected {EMBEDDING_DIM}. Discarding.")
                self.metrics["gemini_failed"] += 1
                return None
            # Google's docs: manual L2 normalisation is required for any
            # output_dimensionality other than the native 3072.
            return _l2_normalize(values)
        except Exception as e:
            logger.warning(f"Gemini embedding failed: {e}")
            self.metrics["gemini_failed"] += 1
            return None

    # -------------------------------------------------------------
    #  Provider 2: local sentence-transformers (no API key needed)
    # -------------------------------------------------------------
    def _get_st_model(self):
        if self._st_model is not None:
            return self._st_model
        try:
            from sentence_transformers import SentenceTransformer
            self._st_model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
            return self._st_model
        except ImportError:
            logger.warning("sentence-transformers not installed. pip install sentence-transformers")
            return None
        except Exception as e:
            logger.warning(f"Local embedding model load failed: {e}")
            return None

    def _embed_local(self, text: str) -> Optional[List[float]]:
        model = self._get_st_model()
        if model is None:
            return None
        self.metrics["local_calls"] += 1
        try:
            vec = model.encode(text[:8000], normalize_embeddings=True)
            values = vec.tolist()
            if len(values) != EMBEDDING_DIM:
                logger.warning(f"Local model returned {len(values)} dims, expected {EMBEDDING_DIM}.")
                self.metrics["local_failed"] += 1
                return None
            return values
        except Exception as e:
            logger.warning(f"Local embedding failed: {e}")
            self.metrics["local_failed"] += 1
            return None

    # -------------------------------------------------------------
    #  Public API
    # -------------------------------------------------------------
    def embed(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[List[float]]:
        if not text or not text.strip():
            return None
        vec = self._embed_gemini(text, task_type=task_type)
        if vec is not None:
            return vec
        logger.info("Falling back to local sentence-transformers embedding.")
        vec = self._embed_local(text)
        if vec is not None:
            return vec
        logger.error("All embedding providers failed for this text. real data unavailable - no embedding stored.")
        return None

    def cosine_similarity(self, a: List[float], b: List[float]) -> float:
        va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
        denom = (np.linalg.norm(va) * np.linalg.norm(vb))
        if denom == 0:
            return 0.0
        return float(np.dot(va, vb) / denom)


if __name__ == "__main__":
    engine = EmbeddingEngine()
    sample_text = os.environ.get("EMBED_TEST_TEXT")
    if not sample_text:
        logger.error("Set EMBED_TEST_TEXT to a real string to test embedding generation. real data unavailable.")
    else:
        result = engine.embed(sample_text)
        if result:
            logger.info(f"Embedding OK. dim={len(result)} first_5={result[:5]}")
        else:
            logger.error("Embedding failed on all providers.")
