"""
CEKA Forum - Groq Cloud Whisper-large-v3 Transcription Pipeline
Uses Groq API (whisper-large-v3) to transcribe the full 119 MB forum recording.
Groq is ~189x real-time: a 65-minute recording processes in ~20 seconds.

Groq free limit per file: 25 MB. Script chunks the WAV into segments automatically.
Output: d:/CEKA/ceka v010/CEKA/AUDIO_TRANSCRIPT_GROQ.md
"""

import os, time, math, tempfile, struct, wave
from pathlib import Path
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
AUDIO_FILE  = Path(r"C:\Users\Administrator\CEKA_LocalCapture\audio\20260715_102513_Forum_Session_1.wav")
OUT_FILE    = Path(r"d:\CEKA\ceka v010\CEKA\AUDIO_TRANSCRIPT_GROQ.md")
ENV_FILE    = Path(r"d:\CEKA\ceka v010\CEKA\.env")

# Groq hard limit is 25 MB per request. We use 24 MB to stay safely under.
MAX_CHUNK_BYTES = 24 * 1024 * 1024   # 24 MB
MODEL           = "whisper-large-v3"
LANGUAGE        = None               # None = auto-detect (Swahili + English)


# ── Load env ──────────────────────────────────────────────────────────────────
def load_env(path: Path) -> dict:
    env = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ── WAV chunking ──────────────────────────────────────────────────────────────
def get_wav_params(wav_path: Path):
    with wave.open(str(wav_path), "rb") as w:
        return {
            "nchannels":    w.getnchannels(),
            "sampwidth":    w.getsampwidth(),
            "framerate":    w.getframerate(),
            "nframes":      w.getnframes(),
            "comptype":     w.getcomptype(),
            "compname":     w.getcompname(),
        }


def write_wav_chunk(frames: bytes, params: dict, out_path: Path):
    with wave.open(str(out_path), "wb") as w:
        w.setnchannels(params["nchannels"])
        w.setsampwidth(params["sampwidth"])
        w.setframerate(params["framerate"])
        w.setcomptype(params["comptype"], params["compname"])
        w.writeframes(frames)


def split_wav(wav_path: Path, max_bytes: int):
    """Splits WAV into chunks <= max_bytes. Returns list of (Path, offset_seconds)."""
    params     = get_wav_params(wav_path)
    frame_size = params["nchannels"] * params["sampwidth"]
    framerate  = params["framerate"]
    # bytes per second of audio
    bps = framerate * frame_size
    # frames that fit in max_bytes (minus a small WAV header margin of 100 bytes)
    frames_per_chunk = (max_bytes - 100) // frame_size

    chunks = []
    tmp_dir = Path(tempfile.mkdtemp())
    with wave.open(str(wav_path), "rb") as w:
        chunk_idx     = 0
        offset_frames = 0
        while True:
            frames = w.readframes(frames_per_chunk)
            if not frames:
                break
            offset_secs = offset_frames / framerate
            chunk_path  = tmp_dir / f"chunk_{chunk_idx:03d}.wav"
            write_wav_chunk(frames, params, chunk_path)
            chunks.append((chunk_path, offset_secs))
            offset_frames += frames_per_chunk
            chunk_idx     += 1

    return chunks, tmp_dir


# ── Groq transcription ────────────────────────────────────────────────────────
def transcribe_chunk(client, chunk_path: Path, offset_secs: float, chunk_idx: int, total: int) -> str:
    size_mb = chunk_path.stat().st_size / (1024 * 1024)
    print(f"    Chunk {chunk_idx+1}/{total} | offset={offset_secs:.1f}s | size={size_mb:.1f} MB")
    start = time.time()

    with open(chunk_path, "rb") as f:
        kwargs = dict(
            file=(chunk_path.name, f, "audio/wav"),
            model=MODEL,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
        if LANGUAGE:
            kwargs["language"] = LANGUAGE
        result = client.audio.transcriptions.create(**kwargs)

    elapsed = time.time() - start
    print(f"    -> Done in {elapsed:.1f}s | {len(result.segments)} segments detected")

    # Re-timestamp segments relative to original file position
    # Groq SDK returns verbose_json segments as plain dicts
    lines = []
    for seg in result.segments:
        # Handle both dict and object forms
        if isinstance(seg, dict):
            abs_start = offset_secs + seg.get("start", 0)
            abs_end   = offset_secs + seg.get("end", 0)
            text      = seg.get("text", "").strip()
        else:
            abs_start = offset_secs + seg.start
            abs_end   = offset_secs + seg.end
            text      = seg.text.strip()
        ts_s = _fmt(abs_start)
        ts_e = _fmt(abs_end)
        if text:
            lines.append(f"**[{ts_s} -> {ts_e}]** {text}")

    return "\n\n".join(lines)


def _fmt(s: float) -> str:
    h, rem = divmod(int(s), 3600)
    m, sec = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{sec:02d}"


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 70)
    print("  CEKA Forum - Groq Whisper-large-v3 Transcription")
    print(f"  Started: {now}")
    print("=" * 70)

    # --- Validate audio
    if not AUDIO_FILE.exists():
        print(f"[ERROR] Audio file not found: {AUDIO_FILE}")
        return

    audio_size_mb = AUDIO_FILE.stat().st_size / (1024 * 1024)
    print(f"  Audio   : {AUDIO_FILE.name}")
    print(f"  Size    : {audio_size_mb:.1f} MB")
    print(f"  Model   : {MODEL} via Groq API")
    print()

    # --- Load API key
    env = load_env(ENV_FILE)
    groq_key = env.get("GROQ_API_KEY") or env.get("CEKA_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not groq_key:
        print("[ERROR] GROQ_API_KEY not found in .env or environment.")
        return
    print(f"  Groq key loaded: {groq_key[:12]}...")

    # --- Import Groq
    try:
        from groq import Groq
    except ImportError:
        print("[ERROR] groq package not installed. Running: pip install groq")
        import subprocess
        subprocess.run(["pip", "install", "groq", "-q"], check=True)
        from groq import Groq

    client = Groq(api_key=groq_key)

    # --- Split WAV into chunks
    print(f"\n  [1/3] Splitting {audio_size_mb:.1f} MB WAV into {MAX_CHUNK_BYTES//1024//1024} MB chunks...")
    split_start = time.time()
    chunks, tmp_dir = split_wav(AUDIO_FILE, MAX_CHUNK_BYTES)
    print(f"  -> {len(chunks)} chunks created in {time.time()-split_start:.1f}s  (temp: {tmp_dir})")

    # --- Transcribe each chunk
    print(f"\n  [2/3] Transcribing {len(chunks)} chunks via Groq API...")
    all_parts   = []
    total_start = time.time()

    for i, (chunk_path, offset_secs) in enumerate(chunks):
        retries = 0
        while retries < 3:
            try:
                part = transcribe_chunk(client, chunk_path, offset_secs, i, len(chunks))
                all_parts.append(part)
                break
            except Exception as e:
                retries += 1
                print(f"    [WARN] Chunk {i+1} failed (attempt {retries}/3): {e}")
                if retries < 3:
                    time.sleep(5 * retries)
                else:
                    all_parts.append(f"[CHUNK {i+1} TRANSCRIPTION FAILED: {e}]")

    total_elapsed = time.time() - total_start

    # --- Cleanup temp files
    import shutil
    try:
        shutil.rmtree(tmp_dir)
    except Exception:
        pass

    # --- Write output
    print(f"\n  [3/3] Writing output to: {OUT_FILE.name}")
    header = (
        f"# CEKA FORUM - FULL AUDIO TRANSCRIPT (Groq {MODEL})\n\n"
        f"> **Audio File:** {AUDIO_FILE.name}  \n"
        f"> **File Size:** {audio_size_mb:.1f} MB  \n"
        f"> **Model:** {MODEL} via Groq Cloud API  \n"
        f"> **Generated:** {now}  \n"
        f"> **Chunks Processed:** {len(chunks)}  \n\n"
        f"---\n\n"
    )

    full_transcript = "\n\n".join(all_parts)
    OUT_FILE.write_text(header + full_transcript, encoding="utf-8")

    # --- Append stats footer
    out_size_kb = OUT_FILE.stat().st_size / 1024
    with OUT_FILE.open("a", encoding="utf-8") as f:
        f.write(f"\n\n---\n\n## Processing Statistics\n\n")
        f.write(f"| Metric | Value |\n|---|---|\n")
        f.write(f"| Chunks Processed | {len(chunks)} |\n")
        f.write(f"| Total Transcription Time | {total_elapsed:.1f}s ({total_elapsed/60:.1f} min) |\n")
        f.write(f"| Output Size | {out_size_kb:.1f} KB |\n")

    print("\n" + "=" * 70)
    print(f"  COMPLETE")
    print(f"  Chunks       : {len(chunks)}")
    print(f"  Groq Time    : {total_elapsed:.1f}s  ({total_elapsed/60:.1f} min)")
    print(f"  Output       : {OUT_FILE}")
    print(f"  Output Size  : {out_size_kb:.1f} KB")
    print("=" * 70)


if __name__ == "__main__":
    main()
