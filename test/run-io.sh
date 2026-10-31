#!/bin/sh
set -eu
svg_project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
svg_io_tmp=$(mktemp -d "${TMPDIR:-/tmp}/svg-pj-io.XXXXXX")
trap 'rm -rf -- "$svg_io_tmp"' EXIT HUP INT TERM
cd "$svg_project"
npm run build --silent
cp test/fixtures/other.svg "$svg_io_tmp/input copy.svg"
cd "$svg_io_tmp"
node "$svg_project/dist/src/Main.js" < "$svg_project/test/fixtures/io.svgcmd"
