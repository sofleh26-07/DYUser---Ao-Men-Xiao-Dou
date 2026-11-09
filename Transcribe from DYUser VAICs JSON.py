import os
import urllib.request
import urllib.error

# CRITICAL: Prevent OpenMP/CTranslate2 thread explosion and resource tracker errors
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

# --- ULTIMATE FIX: Completely neutralize multiprocessing resource_tracker ---
try:
    from multiprocessing import resource_tracker
    def _null_register(*args, **kwargs):
        pass
    def _null_unregister(*args, **kwargs):
        pass
    resource_tracker.register = _null_register
    resource_tracker.unregister = _null_unregister
except Exception:
    pass

import json
import argparse
import time
import threading
import warnings
import sys
from datetime import datetime
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
from faster_whisper import WhisperModel
import av

# Suppress all resource tracker and multiprocessing warnings
warnings.filterwarnings("ignore", category=UserWarning, module="multiprocessing.resource_tracker")
warnings.filterwarnings("ignore", category=UserWarning, module="resource_tracker")

MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")

# Thread-safe tracking structures
active_tasks = {}
active_tasks_lock = threading.Lock()
completed_stats = []
stats_lock = threading.Lock()

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

def format_duration_human(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    if hrs > 0:
        return f"{hrs}h {mins}m {secs:.1f}s"
    elif mins > 0:
        return f"{mins}m {secs:.1f}s"
    else:
        return f"{secs:.2f}s"

def get_current_malaysia_time():
    return datetime.now(MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M:%S %Z")

def get_audio_duration(audio_path):
    try:
        with av.open(audio_path) as container:
            if container.duration:
                return float(container.duration / av.time_base)
    except Exception:
        pass
    return 0.0

def get_output_paths(audio_path):
    abs_path = os.path.abspath(audio_path)
    path_parts = abs_path.split(os.sep)
    
    if "Audios" in path_parts:
        audios_index = path_parts.index("Audios")
        rel_parts = path_parts[audios_index + 1:]
        rel_path = os.path.join(*rel_parts)
    else:
        rel_path = os.path.basename(audio_path)

    rel_no_ext, _ = os.path.splitext(rel_path)
    output_dir = os.path.join("Transcriptions", rel_no_ext)
    
    return {
        "dir": output_dir,
        "json": os.path.join(output_dir, "T.json"),
        "srt": os.path.join(output_dir, "T.srt"),
        "txt": os.path.join(output_dir, "T.txt"),
        "tlog": os.path.join(output_dir, "T.tlog")
    }

def is_transcription_complete(paths):
    return (
        os.path.exists(paths["json"]) and
        os.path.exists(paths["srt"]) and
        os.path.exists(paths["txt"]) and
        os.path.exists(paths["tlog"])
    )



def download_audio(url, save_path):
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
        return True
    
    headers = {
        # 'accept': '*/*',
        # 'accept-encoding': 'identity;q=1, *;q=0',
        # 'accept-language': 'en-GB,en;q=0.5',
        # 'cache-control': 'no-cache',
        # 'connection': 'keep-alive',
        # 'host': 'v3-web.douyinvod.com',
        # 'pragma': 'no-cache',
        # 'range': 'bytes=0-',
        # 'referer': 'https://v3-web.douyinvod.com/72e280dd6acb12f00cc53cd608f8a1ff/6af14533/video/tos/cn/tos-cn-ve-15/o4CIDgMEgAhiAf7G9FfJKqDBvArQxEAPzAoMAt/media-audio-und-mp4a/?a=6383&ch=0&cr=8&dr=0&er=1&lr=default&cd=0%7C0%7C0%7C3&cv=1&br=47&bt=47&cs=4&mime_type=video_mp4&qs=0&rc=ZTg3ODY2aTQzM2c5aDtkNEBpajkzbHc5cm1kZDMzNGkzM0AzLTQvM15gLTZfMGNfYDMuYSNscmFzMmQ0ZGphLS1kLTBzcw%3D%3D&btag=c0000e00028000&cquery=101r_100o&dy_q=1794110215&l=20261108115655CCC57E85BFD39F846536',
        # 'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Brave";v="150"',
        # 'sec-ch-ua-mobile': '?0',
        # 'sec-ch-ua-platform': '"macOS"',
        # 'sec-fetch-dest': 'video',
        # 'sec-fetch-mode': 'cors',
        # 'sec-fetch-site': 'same-origin',
        # 'sec-gpc': '1',
        # 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response, open(save_path, 'wb') as out_file:
            out_file.write(response.read())
        return True
        
    except urllib.error.HTTPError as e:
        # If it's a 403, capture the partial response body written by the server anyway
        if e.code == 403:
            try:
                with open(save_path, 'wb') as out_file:
                    out_file.write(e.read())
                if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                    return True
            except Exception as write_err:
                print(f"[DOWNLOAD ERROR] Failed to write 403 fallback data for {url}: {write_err}", flush=True)
        
        print(f"[DOWNLOAD ERROR] Failed to download {url}: {e}", flush=True)
        return False

    except Exception as e:
        print(f"[DOWNLOAD ERROR] Failed to download {url}: {e}", flush=True)
        return False

def print_pool_status():
    with active_tasks_lock:
        print(" -------- Pool -----------", flush=True)
        if not active_tasks:
            print(" (Pool is currently idle)", flush=True)
        else:
            now = time.time()
            for path, info in active_tasks.items():
                elapsed = now - info["start_time"]
                dur_str = format_duration_human(info["duration"])
                print(f" • {path} | Audio Duration: {dur_str} | Elapsed: {elapsed:.1f}s", flush=True)
        print(" -------- Pool -----------", flush=True)

def process_single_item(item, index, total_files, model):
    audio_url = item["url"]
    audio_id = item["id"]
    audio_path = os.path.join("Audios", f"{audio_id}.mp3")
    
    paths = get_output_paths(audio_path)
    if is_transcription_complete(paths):
        print(f"[SKIPPED] [{index}/{total_files}] Transcription already exists for ID: {audio_id}", flush=True)
        return {}
        # with stats_lock:
        #     completed_stats.append({
        #         "file": audio_path,
        #         "audio_duration": audio_duration,
        #         "processing_time": 0.0,
        #         "skipped": True
        #     })

        # return {"file": audio_path, "success": True, "skipped": True, "elapsed": 0.0, "duration": audio_duration}
    print("audio_id, audio_path, paths, audio_url")
    print(audio_id, audio_path, paths, audio_url)

    success = download_audio(audio_url, audio_path)
    if not success or not os.path.exists(audio_path):
        return {"file": audio_path, "success": False, "error": "Download failed"}

    audio_duration = get_audio_duration(audio_path)
    dur_human = format_duration_human(audio_duration)


    os.makedirs(paths["dir"], exist_ok=True)

    start_time_monotonic = time.time()
    start_timestamp_str = get_current_malaysia_time()
    
    with active_tasks_lock:
        active_tasks[audio_path] = {
            "start_time": start_time_monotonic,
            "duration": audio_duration
        }

    print(f"\n[START] [{index}/{total_files}] ({start_timestamp_str}) ID: {audio_id} | Audio Duration: {dur_human}", flush=True)
    print_pool_status()
    
    try:
        segments_iter, info = model.transcribe(audio_path, beam_size=5, word_timestamps=True)

        segments = []
        full_text_parts = []
        
        transcription_start_time = time.time()

        with open(paths["tlog"], "w", encoding="utf-8") as log_file:
            log_file.write(f"File Index: {index} of {total_files}\n")
            log_file.write(f"Audio ID: {audio_id}\n")
            log_file.write(f"Audio Duration: {dur_human} ({audio_duration:.2f}s)\n")
            log_file.write(f"Start Time (Malaysia): {start_timestamp_str}\n")
            log_file.write(f"Detected Language: {info.language} (Prob: {info.language_probability:.2f})\n")
            log_file.write("-" * 80 + "\n")
            log_file.flush()

            for i, seg in enumerate(segments_iter, start=1):
                elapsed_time = time.time() - transcription_start_time
                word_count = len(seg.words) if seg.words else 0
                time_badge = f"[{format_time(seg.start)} --> {format_time(seg.end)}]"
                
                log_line = f"Segment #{i:<3} {time_badge} | Elapsed: {elapsed_time:>6.2f}s | Words: {word_count:<2} | Text: {seg.text.strip()}"
                
                log_file.write(log_line + "\n")
                log_file.flush()

                segments.append({
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text,
                    "words": [{"word": w.word, "start": w.start, "end": w.end} for w in (seg.words or [])]
                })
                full_text_parts.append(seg.text.strip())

            transcription_end_time = time.time()
            end_timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            transcription_duration = transcription_end_time - transcription_start_time
            
            pct_ratio = (transcription_duration / audio_duration * 100) if audio_duration > 0 else 0
            speed_ratio = (audio_duration / transcription_duration) if transcription_duration > 0 else 0

            log_file.write("-" * 80 + "\n")
            log_file.write(f"End Time (Malaysia): {end_timestamp_str}\n")
            log_file.write(f"Transcription Duration: {transcription_duration:.2f}s\n")
            log_file.write(f"Transcription / Audio Duration: {pct_ratio:.2f}%\n")
            log_file.write(f"Audio / Transcription Duration: {speed_ratio:.2f}x\n")
            log_file.flush()

        result = {"language": info.language, "segments": segments}

        with open(paths["json"], "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=4)
        with open(paths["txt"], "w", encoding="utf-8") as f:
            f.write(" ".join(full_text_parts))
        with open(paths["srt"], "w", encoding="utf-8") as f:
            for idx, segment in enumerate(segments, start=1):
                s_str = format_time(segment["start"])
                e_str = format_time(segment["end"])
                f.write(f"{idx}\n{s_str} --> {e_str}\n{segment['text'].strip()}\n\n")

        end_time_monotonic = time.time()
        end_timestamp_str = get_current_malaysia_time()
        elapsed_seconds = end_time_monotonic - start_time_monotonic
        
        with active_tasks_lock:
            active_tasks.pop(audio_path, None)

        with stats_lock:
            completed_stats.append({
                "file": audio_path,
                "audio_duration": audio_duration,
                "processing_time": elapsed_seconds,
                "skipped": False
            })

        print(f"\n[DONE]  [{index}/{total_files}] ({end_timestamp_str}) ID: {audio_id} | Start: {start_timestamp_str} | End: {end_timestamp_str} | Audio Duration: {dur_human} ({audio_duration:.2f}s) | Time Taken: {transcription_duration:.2f}s | Transc/Audio: {pct_ratio:.2f}% | Audio/Transc: {speed_ratio:.2f}x", flush=True)
        print_pool_status()
        os.remove(audio_path)
        print(f"Successfully removed: {audio_path}")

        return {"file": audio_path, "success": True, "skipped": False, "elapsed": elapsed_seconds, "duration": audio_duration}

    except Exception as e:
        with active_tasks_lock:
            active_tasks.pop(audio_path, None)

        print(f"\n[ERROR] [{index}/{total_files}] Failed processing ID {audio_id}: {str(e)}", flush=True)
        print_pool_status()

        return {"file": audio_path, "success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(
        description="🚀 High-Performance Batch Audio Download & Transcription Tool from JSON.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    parser.add_argument("json_file", type=str, help="Path to the JSON file containing the array of raw posts/audio objects.")
    parser.add_argument("-p", "--pool", type=int, default=5, help="Parallel queue pool size (number of concurrent workers). Default: 5")
    parser.add_argument("--model", type=str, default="small", help="Whisper model size (tiny, base, small, medium, large-v3). Default: base")
    parser.add_argument("--device", type=str, default="cpu", help="Computation device ('cpu' or 'cuda'). Default: cpu")
    parser.add_argument("--compute", type=str, default="int8", help="Compute type precision ('int8', 'float16'). Default: int8")

    args = parser.parse_args()

    if not os.path.exists(args.json_file):
        print(f"[ERROR] JSON file not found: {args.json_file}", flush=True)
        return

    with open(args.json_file, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    audios = []
    for item in raw_data:
        try:
            def safe_get(data, *keys):
                for key in keys:
                    if data is None:
                        return None
                    try:
                        data = data[key]
                    except (KeyError, IndexError, TypeError):
                        return None
                return data

            # Usage - perfectly mirrors the JS optional chaining:
            play_url = safe_get(item, "video", "bit_rate_audio", 0, "audio_meta", "url_list", "main_url")
            play_url = (
                
                safe_get(item, "music", "play_url", "url_list", 1)
                or safe_get(item, "music", "play_url", "url_list", 0)
                or safe_get(item, "video", "bit_rate_audio", 0, "audio_meta", "url_list", "main_url")
            )
            
            aweme_id = item["aweme_id"]
            # print(aweme_id, play_url, )
            audios.append({"url": play_url, "id": str(aweme_id)})
        except (KeyError, IndexError):
            continue

    total_files = len(audios)
    if total_files == 0:
        print("No valid audio items found in the JSON file matching the mapping criteria.", flush=True)
        return

    print(f"\n[Model Init] Loading Whisper model '{args.model}' on {args.device} ({args.compute})...", flush=True)
    shared_model = WhisperModel(args.model, device=args.device, compute_type=args.compute, cpu_threads=1)
    print("[Model Init] Model loaded successfully.\n", flush=True)

    print(f"[Batch Start] Mapped {total_files} audio item(s) from JSON. Running with parallel pool = {args.pool}", flush=True)
    print("=" * 70, flush=True)

    batch_start_time = time.time()
    success_count = 0
    skipped_count = 0
    interrupted = False

    try:
        with ThreadPoolExecutor(max_workers=args.pool) as executor:
            futures = {
                executor.submit(process_single_item, item, idx, total_files, shared_model): item 
                for idx, item in enumerate(audios, start=1)
            }

            for future in as_completed(futures):
                try:
                    res = future.result()
                    if res["success"]:
                        success_count += 1
                        if res.get("skipped"):
                            skipped_count += 1
                except Exception as exc:
                    print(f"[WORKER EXCEPTION] Task generated an exception: {exc}", flush=True)
    except KeyboardInterrupt:
        interrupted = True
        print("\n\n[INTERRUPTED] Ctrl+C detected. Stopping execution and generating summary statistics...", flush=True)

    batch_elapsed = time.time() - batch_start_time

    total_audio_duration = sum(item["audio_duration"] for item in completed_stats)
    total_processing_time = sum(item["processing_time"] for item in completed_stats)
    processed_count = success_count - skipped_count
    realtime_speedup_factor = (total_audio_duration / batch_elapsed) if batch_elapsed > 0 else 0

    summary_data = {
        "timestamp_malaysia": get_current_malaysia_time(),
        "total_files_found": total_files,
        "successfully_processed": success_count,
        "files_skipped_already_complete": skipped_count,
        "files_newly_processed": processed_count,
        "total_audio_duration_seconds": round(total_audio_duration, 2),
        "total_wall_clock_time_seconds": round(batch_elapsed, 2),
        "cumulative_compute_time_seconds": round(total_processing_time, 2),
        "realtime_speedup_factor": round(realtime_speedup_factor, 2),
        "details": completed_stats
    }

    os.makedirs("Transcriptions", exist_ok=True)
    summary_json_path = os.path.join("Transcriptions", "summary.json")
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=4)

    print("=" * 70, flush=True)
    print("                      📊 BATCH SUMMARY STATISTICS                      ", flush=True)
    print("=" * 70, flush=True)
    print(f" • Total Files Found         : {total_files}", flush=True)
    print(f" • Skipped (Already Complete): {skipped_count}", flush=True)
    print(f" • Newly Processed           : {processed_count}", flush=True)
    print(f" • Total Audio Duration      : {format_duration_human(total_audio_duration)} ({total_audio_duration:.2f}s)", flush=True)
    print(f" • Total Real Wall-Clock Time: {format_duration_human(batch_elapsed)} ({batch_elapsed:.2f}s)", flush=True)
    print(f" • Real-time Speedup Factor  : {realtime_speedup_factor:.2f}x faster than real-time", flush=True)
    print("-" * 70, flush=True)
    print(f" 📄 Summary report saved to  : {summary_json_path}", flush=True)
    print("=" * 70, flush=True)
    
    if interrupted:
        print("[Batch Interrupted by User]", flush=True)
    else:
        print("[Batch Complete Successfully]", flush=True)

if __name__ == "__main__":
    main()