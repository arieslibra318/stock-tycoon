#!/bin/sh
# 把 src/ 底下的檔案依序串成單一的 index.html
cd "$(dirname "$0")"
F="src/2_core.js src/3_base.js src/4a_lib.js src/4_city.js src/5_chars.js src/6_market.js src/7_game.js src/7_dialog.js src/8_flow.js src/8b_ending.js src/8c_extras.js src/8d_listing.js src/8e_mobile.js src/9_audio_base.js src/9_main.js"
( echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#2b2622"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="證券大亨"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'; cat src/1_head.html; cat $F; echo '</script>' ) > index.html
wc -c index.html
