while true; do
  node "Get Exists and Absents.js"
  git add . --ignore-removal && git commit --quiet -m "-+" && git push origin HEAD
  sleep 90
done