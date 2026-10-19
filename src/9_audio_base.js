/* ---------- 聲音 ---------- */
const AU = { ctx: null };
function initAudio() {
  if (AU.ctx) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = AU.ctx = new C();
    AU.master = ctx.createGain(); AU.master.gain.value = 0.9; AU.master.connect(ctx.destination);
    AU.sfx = ctx.createGain(); AU.sfx.connect(AU.master); AU.mus = ctx.createGain(); AU.mus.connect(AU.master);
    // 音效用的雜訊素材（不會自己播放）
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0; for (let i = 0; i < len; i++) { b0 = 0.985 * b0 + 0.015 * (Math.random() * 2 - 1); d[i] = b0 * 6; }
    AU.noise = buf; applySound(); musicLoop();
    // 切到別的分頁或縮小視窗時整個靜音
    document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; document.hidden ? AU.ctx.suspend() : AU.ctx.resume(); });
  } catch (e) { AU.ctx = null; }
}
// 聲音設定記在這台裝置上，重新開始或讀檔都沿用
const SOUND_KEY = 'stock-tycoon-sound';
function loadSoundPref() { try { const p = JSON.parse(localStorage.getItem(SOUND_KEY)); if (p) { S.music = !!p.music; S.sfx = !!p.sfx; } } catch (e) { } }
function saveSoundPref() { try { localStorage.setItem(SOUND_KEY, JSON.stringify({ music: S.music, sfx: S.sfx })); } catch (e) { } }
function applySound() {
  if (AU.ctx) { AU.mus.gain.value = S.music ? 0.5 : 0; AU.sfx.gain.value = S.sfx ? 1 : 0; }
  $('bSound').classList.toggle('off', !S.music && !S.sfx); $('bSound').title = `聲音：音樂${S.music ? '開' : '關'}・音效${S.sfx ? '開' : '關'}`;
}
// 右上角的喇叭：按一下全部靜音，再按一下全部打開；說明頁可以分開設定音樂和音效
function cycleSound() { initAudio(); const on = !(S.music || S.sfx); S.music = on; S.sfx = on; applySound(); saveSoundPref(); toast(on ? '聲音已打開' : '聲音已全部關閉'); }
function setSound(k) { initAudio(); S[k] = !S[k]; applySound(); saveSoundPref(); toast(`${k === 'music' ? '音樂' : '音效'}${S[k] ? '開' : '關'}`); }
function tone(f, t, dur, type = 'sine', vol = 0.2, dest = AU.sfx, slide) {
  const c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function noiseHit(t, dur, freq, vol, type = 'lowpass') {
  const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(t, rnd() * 2); s.stop(t + dur + 0.05);
}
function sfx(k) {
  if (!AU.ctx || !S.sfx) return; const t = AU.ctx.currentTime;
  switch (k) {
    case 'blip': tone(880, t, 0.08, 'triangle', 0.12); break;
    case 'tick': tone(1320, t, 0.04, 'square', 0.03); break;
    case 'coin': tone(988, t, 0.09, 'triangle', 0.15); tone(1480, t + 0.07, 0.16, 'triangle', 0.15); break;
    case 'bad': tone(300, t, 0.2, 'sawtooth', 0.06, AU.sfx, 180); break;
    case 'done': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.25, 'triangle', 0.14)); break;
    case 'stamp': noiseHit(t, 0.18, 400, 0.6); tone(110, t, 0.2, 'sine', 0.5); break;
    case 'fire': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.5, 'sine', 0.12)); break;
    case 'splash': noiseHit(t, 0.25, 1800, 0.12, 'bandpass'); break;
    case 'shutter': noiseHit(t, 0.06, 4000, 0.3, 'highpass'); noiseHit(t + 0.08, 0.05, 3000, 0.2, 'highpass'); break;
    case 'horn': tone(196, t, 1.0, 'sawtooth', 0.05); tone(247, t, 1.0, 'sawtooth', 0.04); break;
    case 'launch': tone(400, t, 1.0, 'sine', 0.03, AU.sfx, 1600); break;
    case 'boom': noiseHit(t, 1.2, 220, 0.9); noiseHit(t + 0.05, 0.6, 3000, 0.08, 'highpass'); break;
    case 'plane': noiseHit(t, 2.5, 500, 0.25); break;
  }
}
