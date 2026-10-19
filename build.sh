#!/bin/sh
# 把 src/ 底下的檔案依序串成單一的 index.html
cd "$(dirname "$0")"
F="src/2_core.js src/3_base.js src/4a_lib.js src/4_city.js src/5_chars.js src/6_market.js src/7_game.js src/7_dialog.js src/8_flow.js src/9_audio_base.js src/9_main.js"
( echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; cat src/1_head.html; cat $F; echo '</script>' ) > index.html
wc -c index.html
