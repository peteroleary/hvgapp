#!/usr/bin/env bash
# Create squad channels and add members. Idempotent-ish: skips channels that already exist.
# Run from anywhere:  bash ~/Desktop/hvgapp/docs/setup-squads.sh
set -uo pipefail

export BUZZ_PRIVATE_KEY="$(security find-generic-password -s buzz-desktop -a secrets -w \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["identity"])')"
export BUZZ_RELAY_URL="https://hvg.app"

# handle -> pubkey  (bash 3.2 compatible — macOS /bin/bash has no assoc arrays)
pk() { case "$1" in
  ICBM) echo ce54dc797ed5e0ff691056b90b6379b0a8cec05a87e83fb7a6a00cbd5f395bc5;;
  JUV) echo 828f505e354b0a381a807eb44300c91b312f7cabd07d21689812ffbe4c2a56b5;;
  MFR) echo 61d06ad75c2119fc39dbd9dd1e9cd1af0ff97423157f8189d0c681f3fc47ab01;;
  TUN) echo 845798e38eb7c9bfdca6df7e18e77650a5b773c2ec56d746034ee9ab748cbb39;;
  YBY) echo f3c3ef9362f7964e3a822ec0514a39c0a7f190918d5175bfd16d586bcc7a0661;;
  3TH) echo 7325eed98d72b4443d6f183fc60d818a789c5e15e79a1a5e2f70488d7a4a7c5a;;
  PAT) echo 37d445a479ebb29b8708db7a618025bffdc44ea75d71ca883cfe97fccb5ad813;;
  SLM) echo ad1e168a0e05f482bcadf86ba2a3a90c73c139c1db247b9f56fc61db6251331c;;
  ROO) echo fbf21fd45507bbcda86aaa38d491e8f85518369cc494cd8cc4ccb6609f93b664;;
  YAK) echo 2edec9f62fcaaea84ba117f1bc4bffa7ea33cab3abffd1b1f9412945133a1c89;;
  LDA) echo 345c304634a0336e1b1a1a99cc6ddff6ca036b61bea00047b7e668d327e79c36;;
  PMP) echo 8bffc84ecc398e240179357da6d8ff3bf3158d11d408c9a39078789e89ce00ca;;
  IVY) echo b40993220a82a8ff19460ee1614e04ac223df3500fcdafd2e29d9899ad1a5e40;;
  BOO) echo 4995971739aced66a1c5baaaafdca4c7a851a8f0531ed4ccff8dd91341afcb53;;
  MIA) echo f082881f514c47b69bd3eb977048b923ea519ca184bf4f26a2c641544dc1db95;;
  NKI) echo a2c915266039ce300d46c87b394365f2476945c83f781b305e99b35308c1525d;;
  TIP) echo 1a5ce46b990dcb874dca36ac9b251cac822e9760b7a896654b811efb656634a1;;
  VON) echo 2ac419cb1306cee661a20b74209fbc49365542b49e8299d34656b92cbdfef0c6;;
  DEE) echo 3a1c6fd6f2bdaec33bf2b685022b1ecfccf6c62323643c23aa54ca59a0202be3;;
  *) echo ""; return 1;;
esac; }

# channel : lead : members : description
SQUADS=(
  "command|ICBM|ICBM JUV|Command — own the goal, route work, keep the board true. Lead: ICBM."
  "build|MFR|MFR TUN YBY 3TH|Build — architecture, scaffolding, implementation, mobile. Lead: MFR. TUN holds the board key."
  "research|PAT|PAT SLM|Research & Data — verified facts and processed signal. Lead: PAT. Cite sources with dates."
  "creative|ROO|ROO YAK LDA|Creative — brand identity, voice, produced media. Lead: ROO."
  "growth|PMP|PMP IVY BOO|Growth — revenue and reach. Lead: PMP."
  "trust|MIA|MIA NKI DEE|Trust & Safety — protect the user and the business. Lead: MIA. Independent of Build, Creative, Growth."
  "ship|TIP|TIP VON|Ship — the last gate. Lead: TIP. VON verifies done; never the author."
)

extract_id() { python3 -c 'import sys,json
try:
    d=json.load(sys.stdin)
    d=d if isinstance(d,dict) else d[0]
    print(d.get("channel_id") or d.get("id") or d.get("channelId") or d.get("uuid") or "")
except Exception: print("")'; }

# Exact-name lookup over the full channel list (search is FTS-lagged and unreliable).
# NOTE: `channels list` includes archived channels with no archived flag (CLI gap,
# verified 2026-08-21) — consolidate duplicates before re-running. On duplicates this
# picks the oldest channel and prints a warning so the rest can be archived.
find_channel() { buzz channels list 2>/dev/null | python3 -c 'import sys,json,os
try:
    r=json.load(sys.stdin)
    r=r if isinstance(r,list) else r.get("channels",[])
    n=os.environ["N"]
    hits=[c for c in r if c.get("name")==n]
    if not hits: print(""); raise SystemExit
    hits.sort(key=lambda c: c.get("created_at", 0))
    if len(hits)>1:
        print("WARN: %d channels named %s — using %s, consolidate the rest" % (len(hits), n, hits[0]["channel_id"]), file=sys.stderr)
    print(hits[0]["channel_id"])
except Exception: print("")' N="$1"; }

for row in "${SQUADS[@]}"; do
  IFS='|' read -r name lead members desc <<<"$row"
  echo "=== #$name ==="

  cid="$(find_channel "$name")"

  if [ -z "$cid" ]; then
    out="$(buzz channels create --name "$name" --type stream --visibility open --description "$desc" 2>&1)"
    cid="$(printf '%s' "$out" | extract_id)"
    [ -z "$cid" ] && { echo "  CREATE FAILED: $out"; continue; }
    echo "  created $cid"
  else
    echo "  exists $cid"
  fi

  for m in $members; do
    role="member"; [ "$m" = "$lead" ] && role="admin"
    buzz channels add-member --channel "$cid" --pubkey "$(pk "$m")" --role "$role" >/dev/null 2>&1 \
      && echo "  + $m ($role)" || echo "  ! $m failed (may already be a member)"
  done
done

echo
echo "=== all channels ==="
buzz channels list
