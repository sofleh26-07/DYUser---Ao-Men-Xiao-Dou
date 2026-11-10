sudo apt update -y && sudo apt install ffmpeg -y && pip install faster-whisper "av<19"
sudo rm -f /etc/apt/sources.list.d/microsoft* && sudo apt update -y && sudo apt install ffmpeg -y && pip install faster-whisper "av<19"

git add . && git commit -m "_BASE_" && git push origin HEAD

python -u "Transcribe from DYUser VAICs JSON.py" "DYUser VAICs - 澳门小豆.json" --model small --pool 1 | tee "Terminal Log - Transcribe.py 2.tlog" 2>&1
bash G.sh
echo "" >> Setup.sh && git add . --ignore-removal && git commit --quiet -m "Added all Audios and Transcriptions" && git push origin HEAD && gh codespace delete --force -c $CODESPACE_NAME
# python -u "Transcribe from DYUser VAICs JSON.py" 'To Be Processed IDs' --model turbo --pool 8 | tee "Terminal Log - Transcribe.py s 1.tlog" 2>&1

bash Speedup.sh 'YtbV - y0bR0n-0g3w -- GameSpot ---> Super Smash Bros. Ultimate – Mr. Sakurai Presents Minecraft DLC Reveal.mp3'
bash Speedup.sh 'YtbV - rK6-ShLfQtI -- GameSpot ---> Super Smash Bros. Ultimate – Mr. Sakurai Presents "Kazuya".mp3'
bash Speedup.sh 'YtbV - eF8gwcGoD_o -- GameSpot ---> Super Smash Bros. Ultimate The Final Mr. Sakurai Presents Full Presentation.mp3'