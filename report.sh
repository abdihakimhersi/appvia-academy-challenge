#!/usr/bin/env bash
#
# report.sh - count requests per client address for paths starting with a prefix.
# Usage: ./report.sh <path-prefix> <path-to-log-file>

set -euo pipefail

# Check we were given exactly two arguments.
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <path-prefix> <path-to-log-file>" >&2
  exit 2
fi

prefix="$1"
logfile="$2"

if [ ! -r "$logfile" ]; then
  echo "Cannot read log file: $logfile" >&2
  exit 1
fi

# tb-assist
PREFIX="$prefix" LC_ALL=C awk '
  {
    sub(/\r$/, "")    # ignore Windows line endings
    # Skip blank lines and lines not in the expected log format.
    if ($0 !~ /^[^ ]+ [^ ]+ [^ ]+ \[[^]]+\] "[^ "]+ [^ "]+ [^ "]+" [0-9]+ ([0-9]+|-) ".*" ".*"$/) next

    split($0, quoted, "\"")         # quoted[2] = the request line, e.g. GET /api/todos HTTP/1.1
    split(quoted[2], request, " ")  # request[2] = the path
    path = request[2]
    p = ENVIRON["PREFIX"]

    # Count it if the path starts with the prefix (case-sensitive, literal).
    if (substr(path, 1, length(p)) == p) count[$1]++
  }
  END { for (address in count) print count[address], address }
' "$logfile" | LC_ALL=C sort -k1,1nr -k2,2 | awk '{ print $2 ": " $1 }'