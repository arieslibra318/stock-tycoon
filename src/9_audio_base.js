/* ---------- 聲音 ---------- */
const AU = { ctx: null };
function initAudio() {
  if (AU.ctx) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = AU.ctx = new C();
    AU.master = ctx.createGain(); AU.master.gain.value = 0.9; AU.master.connect(ctx.destination);
    AU.sfx = ctx.createGain(); AU.sfx.connect(AU.master); AU.mus = ctx.createGain(); AU.mus.connect(AU.master);
    // 海浪
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0; for (let i = 0; i < len; i++) { b0 = 0.985 * b0 + 0.015 * (Math.random() * 2 - 1); d[i] = b0 * 6; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const wg = ctx.createGain(); wg.gain.value = 0.16;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = 0.1; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    src.connect(lp); lp.connect(wg); wg.connect(AU.sfx); src.start();
    AU.noise = buf; applySound(); musicLoop();
  } catch (e) { AU.ctx = null; }
}
function applySound() {
  if (AU.ctx) { AU.mus.gain.value = S.music ? 0.5 : 0; AU.sfx.gain.value = S.sfx ? 1 : 0; }
  $('bSound').classList.toggle('off', !S.music && !S.sfx); $('bSound').title = `聲音：音樂${S.music ? '開' : '關'}・音效${S.sfx ? '開' : '關'}`;
}
function cycleSound() { initAudio(); if (S.music && S.sfx) S.music = false; else if (S.sfx) S.sfx = false; else { S.music = true; S.sfx = true; } applySound(); toast(`音樂${S.music ? '開' : '關'}・音效${S.sfx ? '開' : '關'}`); saveGame(); }
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
