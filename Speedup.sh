
#!/bin/bash
# sudo apt update && sudo apt install -y ffmpeg

# Input file path passed as argument
INPUT_FILE="$1"

if [ -z "$INPUT_FILE" ]; then
  echo "Usage: $0 <path_to_audio.mp3>"
  exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: File '$INPUT_FILE' not found."
  exit 1
fi

# Target duration in seconds: 29 minutes 59 seconds = 1799 seconds
TARGET_DURATION=1799

# Get the exact duration of the input file using ffprobe
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT_FILE")

if [ -z "$DURATION" ]; then
  echo "Error: Could not determine audio duration."
  exit 1
fi

# Check if audio is already shorter than the target duration
NEEDS_SPEEDUP=$(awk -v dur="$DURATION" -v target="$TARGET_DURATION" 'BEGIN { print (dur > target) ? "yes" : "no" }')

if [ "$NEEDS_SPEEDUP" = "no" ]; then
  echo "Audio duration ($DURATION s) is already within 29 minutes 59 seconds. No speed-up needed."
  exit 0
fi

# Calculate exact multiplier needed (original duration / target duration)
# We add a tiny buffer factor (1.001) to ensure it strictly finishes under 1799s after re-encoding
MULTIPLIER=$(awk -v dur="$DURATION" -v target="$TARGET_DURATION" 'BEGIN { printf "%.4f", (dur / target) * 1.001 }')

# Build the atempo filter chain (ffmpeg's atempo filter only accepts values between 0.5 and 2.0)
generate_atempo_filter() {
    local mult=$1
    local filter=""
    while (( $(awk -v m="$mult" 'BEGIN { print (m > 2.0) ? 1 : 0 }') )); do
        if [ -z "$filter" ]; then
            filter="atempo=2.0"
        else
            filter="$filter,atempo=2.0"
        fi
        mult=$(awk -v m="$mult" 'BEGIN { print m / 2.0 }')
    done
    if [ -z "$filter" ]; then
        filter="atempo=$mult"
    else
        filter="$filter,atempo=$mult"
    fi
    echo "$filter"
}

ATEMPO_FILTER=$(generate_atempo_filter "$MULTIPLIER")

# Determine output file name: strip .mp3 extension and append multiplier
BASE_NAME="${INPUT_FILE%.mp3}"
OUTPUT_FILE="${BASE_NAME} (${MULTIPLIER}).mp3"

echo "----------------------------------------"
echo "Input File:      $INPUT_FILE"
echo "Original Length: ${DURATION}s"
echo "Target Length:   ${TARGET_DURATION}s"
echo "Speed Multiplier:$MULTIPLIER"
echo "FFmpeg Filter:   $ATEMPO_FILTER"
echo "Output File:     $OUTPUT_FILE"
echo "----------------------------------------"

# Run ffmpeg to process the audio
ffmpeg -i "$INPUT_FILE" -filter:a "$ATEMPO_FILTER" -q:a 2 "$OUTPUT_FILE"

echo "Done! Saved to: $OUTPUT_FILE"
EOF