#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Produce a local extract of Statistics Norway StatBank table 06913.
#
#   Table   06913  Population 1 January and population changes during the
#                  calendar year, municipalities, counties and whole country
#   Region  0      The whole country
#   Contents *     All series in the table
#   Time     *     All years (1951 onwards)
#   Format   json-stat2
#
# Run from the repository root:
#
#   bash data/fetch-data.sh
#
# It writes data/06913-norway.json. index.html uses that file when it exists
# and otherwise calls the same URL directly from the browser, so the extract
# is optional — it exists to freeze a known set of figures for a course, and
# to keep the page working where outbound calls to data.ssb.no are blocked.
#
# The API is documented at https://www.ssb.no/en/api/pxwebapiv2
# ---------------------------------------------------------------------------

set -euo pipefail

TABLE="06913"
OUT="$(cd "$(dirname "$0")" && pwd)/06913-norway.json"
STAMP="$(cd "$(dirname "$0")" && pwd)/RETRIEVED.txt"

URL="https://data.ssb.no/api/pxwebapi/v2/tables/${TABLE}/data\
?lang=en\
&valueCodes[Region]=0\
&valueCodes[ContentsCode]=*\
&valueCodes[Tid]=*\
&outputFormat=json-stat2"

echo "Requesting table ${TABLE} from Statistics Norway…"
curl --fail --silent --show-error --get \
     --data-urlencode "lang=en" \
     --data-urlencode "valueCodes[Region]=0" \
     --data-urlencode "valueCodes[ContentsCode]=*" \
     --data-urlencode "valueCodes[Tid]=*" \
     --data-urlencode "outputFormat=json-stat2" \
     "https://data.ssb.no/api/pxwebapi/v2/tables/${TABLE}/data" \
     -o "${OUT}"

BYTES=$(wc -c < "${OUT}")
if [ "${BYTES}" -lt 500 ]; then
  echo "The response was only ${BYTES} bytes, which is too small to be the table." >&2
  echo "Open the URL in a browser to see what the API returned:" >&2
  echo "${URL}" >&2
  exit 1
fi

{
  echo "Source:    Statistics Norway, StatBank table ${TABLE}"
  echo "           Population 1 January and population changes during the calendar year"
  echo "Selection: Region = 0 (the whole country), all contents, all years"
  echo "Format:    JSON-stat 2"
  echo "Endpoint:  PxWebApi v2 (HTTP GET)"
  echo "Retrieved: $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "Table page: https://www.ssb.no/en/statbank/table/${TABLE}"
} > "${STAMP}"

echo "Wrote ${OUT} (${BYTES} bytes)."
echo "Provenance recorded in ${STAMP}."
