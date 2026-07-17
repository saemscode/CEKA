"""
CEKA Forum - Large Whisper Audio Transcription Pipeline
Transcribes the full recorded meeting WAV file using faster-whisper large-v3
with VAD filtering, outputting a clean, timestamped transcript.

Audio Source: C:/Users/Administrator/CEKA_LocalCapture/audio/20260715_102513_Forum_Session_1.wav
Output:       d:/CEKA/ceka v010/CEKA/AUDIO_TRANSCRIPT_LARGE_V3.md
"""

import time
from pathlib import Path
from datetime import datetime

AUDIO_FILE = Path(r"C:\Users\Administrator\CEKA_LocalCapture\audio\20260715_102513_Forum_Session_1.wav")
OUT_FILE   = Path(r"d:\CEKA\ceka v010\CEKA\AUDIO_TRANSCRIPT_LARGE_V3.md")
MODEL_NAME = "large-v3"
DEVICE     = "cpu"
COMPUTE    = "int8"  # keeps RAM usage manageable on CPU


def format_ts(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def main():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 70)
    print("  CEKA Forum - Large Whisper Transcription Pipeline")
    print(f"  Started: {now}")
    print("=" * 70)

    # Validate audio file
    if not AUDIO_FILE.exists():
        print(f"[ERROR] Audio file not found: {AUDIO_FILE}")
        return

    audio_size_mb = AUDIO_FILE.stat().st_size / (1024 * 1024)
    print(f"  Audio File : {AUDIO_FILE.name}")
    print(f"  File Size  : {audio_size_mb:.1f} MB")
    print(f"  Model      : {MODEL_NAME}")
    print(f"  Device     : {DEVICE} / compute={COMPUTE}")
    print()

    # Load model — will auto-download large-v3 weights (~3GB) on first run
    print(f"  [1/3] Loading Whisper {MODEL_NAME} model (downloading if not cached)...")
    print("        This may take several minutes on first run.")
    load_start = time.time()

    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE)
    load_elapsed = time.time() - load_start
    print(f"  [1/3] Model loaded in {load_elapsed:.1f}s\n")

    # Transcribe with VAD filtering
    print(f"  [2/3] Transcribing {audio_size_mb:.1f} MB audio file...")
    print("        VAD filter active — silence segments will be skipped.")
    print("        This will take considerable time on CPU. DO NOT close this window.\n")
    trans_start = time.time()

    segments, info = model.transcribe(
        str(AUDIO_FILE),
        beam_size=5,
        vad_filter=True,
        vad_parameters={
            "min_silence_duration_ms": 500,
            "speech_pad_ms": 200,
        },
        word_timestamps=False,
        language=None,       # auto-detect — handles Swahili/English mix
        condition_on_previous_text=True,
    )

    # Stream segments to file incrementally (safe against interruption)
    print(f"  [3/3] Streaming transcript to: {OUT_FILE.name}")
    print("        Each segment is written immediately — file is safe to read during processing.\n")

    segment_count = 0
    lines = []
    header = (
        f"# CEKA FORUM — AUDIO TRANSCRIPT (Whisper {MODEL_NAME})\n\n"
        f"> **Audio File:** {AUDIO_FILE.name}  \n"
        f"> **File Size:** {audio_size_mb:.1f} MB  \n"
        f"> **Model:** faster-whisper/{MODEL_NAME}  \n"
        f"> **Generated:** {now}  \n"
        f"> **Language Detection:** Automatic (Swahili/English)  \n\n"
        f"---\n\n"
    )

    OUT_FILE.write_text(header, encoding="utf-8")

    with OUT_FILE.open("a", encoding="utf-8") as f:
        for segment in segments:
            ts_start = format_ts(segment.start)
            ts_end   = format_ts(segment.end)
            text     = segment.text.strip()
            if not text:
                continue

            line = f"**[{ts_start} → {ts_end}]** {text}\n\n"
            f.write(line)
            f.flush()
            segment_count += 1

            # Progress indicator every 50 segments
            if segment_count % 50 == 0:
                elapsed = time.time() - trans_start
                print(f"    ...{segment_count} segments processed ({elapsed:.0f}s elapsed)")

    trans_elapsed = time.time() - trans_start
    out_size_kb = OUT_FILE.stat().st_size / 1024

    # Append footer with stats
    with OUT_FILE.open("a", encoding="utf-8") as f:
        f.write(f"\n---\n\n")
        f.write(f"## Processing Statistics\n\n")
        f.write(f"| Metric | Value |\n|---|---|\n")
        f.write(f"| Total Segments | {segment_count} |\n")
        f.write(f"| Model Load Time | {load_elapsed:.1f}s |\n")
        f.write(f"| Transcription Time | {trans_elapsed:.1f}s ({trans_elapsed/60:.1f} min) |\n")
        f.write(f"| Output File Size | {out_size_kb:.1f} KB |\n")
        f.write(f"| Audio Duration (detected) | {info.duration:.1f}s ({info.duration/60:.1f} min) |\n")
        f.write(f"| Detected Language | {info.language} (confidence: {info.language_probability:.2%}) |\n")

    print("\n" + "=" * 70)
    print(f"  TRANSCRIPTION COMPLETE")
    print(f"  Total Segments   : {segment_count}")
    print(f"  Audio Duration   : {info.duration/60:.1f} minutes")
    print(f"  Detected Language: {info.language} ({info.language_probability:.1%} confidence)")
    print(f"  Processing Time  : {trans_elapsed/60:.1f} minutes")
    print(f"  Output File      : {OUT_FILE}")
    print(f"  Output Size      : {out_size_kb:.1f} KB")
    print("=" * 70)


if __name__ == "__main__":
    main()
