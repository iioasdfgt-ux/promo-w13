/* 13주 홍보 영상 무대 v2 — 재생 · 탐색 · 탭 녹화(소리 포함) · 영상 클립 · 모션(Lottie) · 음원.
 * 영상 파일은 #stage 안에 장면을 두고 window.FILM = { title, duration, width, height, render(t), music? } 를 정의한 뒤 이 파일을 부른다.
 * render(t)는 t초의 화면 상태를 그리는 함수다(같은 t면 늘 같은 화면). 이 파일은 고치지 않는다.
 *
 * 영상 클립:  <video class="clip" src="../소스/영상/파일.mp4" data-start="12" data-end="20" data-offset="0" muted playsinline></video>
 *             data-start초부터 재생, data-end초에 멈춤, data-offset = 클립 안에서 시작할 초. 소리를 쓰려면 muted를 빼고 data-volume="0.5".
 * 목소리:     <audio class="clip" src="../소스/음원/내목소리.m4a" data-start="3" data-volume="1"></audio>  (영상 클립과 같은 규칙)
 *             ↑ data-volume이 없으면 소리가 꺼진다(목소리에는 꼭 붙인다). 경로는 내작업/영상/index.html 기준.
 * 모션:       <div class="lottie" data-src="../소스/모션/파일.js" data-start="5" data-speed="1" data-loop="1"></div>
 *             Lottie .json은 더블클릭으로 연 파일에서 읽히지 않으므로 한 줄로 감싼 .js로 바꿔 쓴다:
 *             (window.LOTTIE=window.LOTTIE||{})["파일"]= {...json 내용...};   ← 이름은 파일 이름(확장자 뺀 것)
 *             lottie 재생기는 인터넷에서 불러온다.
 * 음원:       FILM.music = { src: "../소스/음원/파일.mp3", volume: 0.6, offset: 0, fadeIn: 1, fadeOut: 2.5 }
 */
(() => {
  const F = window.FILM;
  if (!F || typeof F.render !== 'function') { document.body.insertAdjacentHTML('afterbegin', '<p style="color:#f88;padding:20px">FILM.render 가 없습니다 — 영상 파일 아래쪽 스크립트를 확인하세요.</p>'); return; }
  const W = F.width || 1080, H = F.height || 1350, D = F.duration || 30;
  const stage = document.getElementById('stage');
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  if (F.title) document.title = F.title + ' · 홍보 영상';

  const wrap = document.createElement('div'); wrap.id = 'wrap';
  stage.parentNode.insertBefore(wrap, stage); wrap.appendChild(stage);
  document.body.insertAdjacentHTML('beforeend', `<div id="bar">
    <button id="play">▶ 재생</button><input id="seek" type="range" min="0" max="${D * 1000}" step="1" value="0">
    <span class="t" id="tt">0.0 / ${D.toFixed(1)}초</span><button class="rec" id="rec">● 녹화해서 저장</button><span id="msg"></span></div>`);
  const $ = id => document.getElementById(id);
  const exportMode = location.hash === '#export';
  if (exportMode) document.body.classList.add('export');
  const msg = (s, err) => { $('msg').textContent = s; $('msg').className = err ? 'err' : ''; };

  function fit(){
    if (exportMode) { stage.style.transform = 'none'; return; }
    const r = wrap.getBoundingClientRect(); const s = Math.min(r.width / W, r.height / H) * 0.98;
    stage.style.transform = `scale(${s})`;
    stage.style.marginRight = (W * s - W) + 'px'; stage.style.marginBottom = (H * s - H) + 'px';
  }
  addEventListener('resize', fit);

  // ── 미디어: 영상 클립 · 음원 · Lottie ──
  const clips = [...stage.querySelectorAll('video.clip, audio.clip')];
  clips.forEach(v => { v.preload = 'auto'; v.playsInline = true; if (!v.hasAttribute('data-volume')) v.muted = true; else v.volume = +v.dataset.volume; });
  const music = F.music && F.music.src ? Object.assign(new Audio(F.music.src), { preload: 'auto' }) : null;
  const M = Object.assign({ volume: 0.6, offset: 0, fadeIn: 1, fadeOut: 2.5 }, F.music || {});
  const lotEls = [...stage.querySelectorAll('.lottie')], lots = [];
  const lottieReady = !lotEls.length ? Promise.resolve() : new Promise(res => {
    // 더블클릭으로 연 파일(file://)에서는 브라우저가 .json을 못 읽는다 → .json을 감싼 .js 파일을 <script>로 읽는다
    const loadJs = src => new Promise(r => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = () => { msg('모션 파일을 열지 못했습니다: ' + src, true); r(); }; document.head.appendChild(s); });
    const nameOf = el => el.dataset.name || el.dataset.src.split('/').pop().replace(/\.(json|js)$/i, '');
    const go = async () => {
      window.LOTTIE = window.LOTTIE || {};
      await Promise.all(lotEls.filter(el => /\.js$/i.test(el.dataset.src)).map(el => loadJs(el.dataset.src)));
      lotEls.forEach(el => {
        const data = window.LOTTIE[nameOf(el)], opt = { container: el, renderer: 'svg', loop: false, autoplay: false };
        if (data) opt.animationData = data; else if (location.protocol === 'file:') { msg('모션은 .json을 .js로 감싸야 열립니다 — AI에게 "모션 파일 감싸 줘"라고 하세요', true); return; } else opt.path = el.dataset.src;
        lots.push({ el, a: window.lottie.loadAnimation(opt) });
      });
      Promise.all(lots.map(l => new Promise(r => { if (l.a.isLoaded) return r(); l.a.addEventListener('DOMLoaded', r); l.a.addEventListener('data_failed', r); setTimeout(r, 8000); }))).then(res); };
    if (window.lottie) return go();
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    s.onload = go; s.onerror = () => { msg('모션 재생기를 불러오지 못했습니다 — 인터넷 연결을 확인하세요', true); res(); }; document.head.appendChild(s);
  });
  const clipTime = (v, t) => { const st = +v.dataset.start || 0, off = +v.dataset.offset || 0; return Math.max(0, t - st + off); };
  const clipOn = (v, t) => { const st = +v.dataset.start || 0, en = v.dataset.end != null ? +v.dataset.end : D; return t >= st && t < en; };
  function syncMedia(t, live){
    clips.forEach(v => {
      const on = clipOn(v, t), want = Math.min(clipTime(v, t), (v.duration || 1e9) - 0.05);
      if (live && on) { if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want; if (v.paused) v.play().catch(() => {}); }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - want) > 0.04) v.currentTime = want; }
    });
    lots.forEach(({ el, a }) => {
      const st = +el.dataset.start || 0, sp = +el.dataset.speed || 1, fr = a.totalFrames || 1, fps = a.frameRate || 30;
      let f = Math.max(0, (t - st) * fps * sp); f = el.dataset.loop === '0' ? Math.min(f, fr - 1) : f % fr;
      a.goToAndStop(f, true);
    });
    if (music) {
      const want = t + (M.offset || 0), g = Math.min(1, M.fadeIn ? t / M.fadeIn : 1, M.fadeOut ? (D - t) / M.fadeOut : 1);
      music.volume = Math.max(0, Math.min(1, M.volume * g));
      if (live) { if (Math.abs(music.currentTime - want) > 0.3) music.currentTime = want; if (music.paused) music.play().catch(() => {}); }
      else { if (!music.paused) music.pause(); music.currentTime = want; }
    }
  }

  let at = 0, playing = false, t0 = 0, raf = 0;
  function draw(ms, live){
    at = Math.max(0, Math.min(D * 1000, ms));
    try { F.render(at / 1000); } catch (e) { msg('render 오류: ' + e.message, true); }
    syncMedia(at / 1000, !!live);
    $('seek').value = at; $('tt').textContent = `${(at / 1000).toFixed(1)} / ${D.toFixed(1)}초`;
  }
  function tick(now){ if (!playing) return; draw(now - t0, true); if (at >= D * 1000) stop(); else raf = requestAnimationFrame(tick); }
  function play(){ if (at >= D * 1000 - 30) at = 0; playing = true; t0 = performance.now() - at; $('play').textContent = '❚❚ 멈춤'; raf = requestAnimationFrame(tick); }
  function stop(){ playing = false; cancelAnimationFrame(raf); $('play').textContent = '▶ 재생'; syncMedia(at / 1000, false); }
  $('play').onclick = () => playing ? stop() : play();
  $('seek').oninput = e => { stop(); draw(+e.target.value, false); };
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); $('play').click(); } });

  // 녹화: 이 탭(화면 + 탭 오디오)을 공유받아 무대 부분만 잘라 W×H 영상으로 저장한다
  $('rec').onclick = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || !window.MediaRecorder) { msg('이 브라우저는 녹화를 못 합니다 — 크롬으로 여세요', true); return; }
    stop(); msg('공유 창에서 "이 탭"을 고르고, 소리가 있으면 "탭 오디오도 공유"를 켠 뒤 공유를 누르세요');
    let cap;
    try { cap = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 30 }, audio: { suppressLocalAudioPlayback: false }, preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'include' }); }
    catch (e) { msg('공유를 취소했습니다', true); return; }
    const hasAudio = cap.getAudioTracks().length > 0;
    document.body.classList.add('rec'); fit();
    const v = document.createElement('video'); v.muted = true; v.srcObject = new MediaStream(cap.getVideoTracks()); await v.play();
    await new Promise(r => setTimeout(r, 400));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d');
    const out = cv.captureStream(30); cap.getAudioTracks().forEach(tr => out.addTrack(tr));
    const types = hasAudio ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'] : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const type = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(out, type ? { mimeType: type, videoBitsPerSecond: 10e6 } : {});
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    let copying = true;
    const copy = () => { if (!copying) return; const r = stage.getBoundingClientRect(); const sx = v.videoWidth / innerWidth, sy = v.videoHeight / innerHeight;
      cx.drawImage(v, r.left * sx, r.top * sy, r.width * sx, r.height * sy, 0, 0, W, H); requestAnimationFrame(copy); };
    draw(0, false); await new Promise(r => setTimeout(r, 300)); copy(); rec.start(250);
    msg(`녹화 중… ${D}초 동안 창을 닫거나 다른 탭으로 옮기지 마세요${hasAudio ? '' : ' (소리 없이 저장됩니다)'}`);
    at = 0; play();
    await new Promise(r => { const w = () => playing ? setTimeout(w, 100) : r(); w(); });
    await new Promise(r => setTimeout(r, 300));
    rec.stop(); await done; copying = false;
    document.body.classList.remove('rec'); fit();
    const ext = (rec.mimeType || type).includes('mp4') ? 'mp4' : 'webm';
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const name = `홍보영상_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
    // 파일을 먼저 내려받고, 탭 공유는 그다음에 끊는다(공유를 먼저 끊으면 일부 환경에서 탭이 닫힌다)
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    msg(`저장했습니다 — 다운로드 폴더의 ${name}${hasAudio ? '' : ' (소리 없음)'} · 화면 위 "공유 중지"를 누르세요`);
    v.pause(); v.srcObject = null;
    setTimeout(() => { try { cap.getTracks().forEach(t => t.stop()); } catch (e) {} }, 1500);
  };

  // 프레임 단위로 정확히 맞춰 그리기(내보내기 · 점검용): 영상 클립이 원하는 위치에 도착할 때까지 기다린다
  async function seekAsync(s){
    stop(); at = s * 1000;
    try { F.render(s); } catch (e) { msg('render 오류: ' + e.message, true); }
    const waits = clips.map(v => new Promise(r => {
      const want = Math.min(clipTime(v, s), (v.duration || 1e9) - 0.05);
      if (Math.abs(v.currentTime - want) < 0.001 && v.readyState >= 2) return r();
      const fin = () => { v.removeEventListener('seeked', fin); r(); }; v.addEventListener('seeked', fin); setTimeout(fin, 3000);
      if (!v.paused) v.pause(); v.currentTime = want;
    }));
    lots.forEach(({ el, a }) => { const st = +el.dataset.start || 0, sp = +el.dataset.speed || 1, fr = a.totalFrames || 1, fps = a.frameRate || 30;
      let f = Math.max(0, (s - st) * fps * sp); f = el.dataset.loop === '0' ? Math.min(f, fr - 1) : f % fr; a.goToAndStop(f, true); });
    await Promise.all(waits);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  window.STAGE = { seek: s => { stop(); draw(s * 1000, false); }, seekAsync, duration: D, width: W, height: H, music: F.music || null };
  const fonts = ['400 40px PTD', '700 40px PTD', '400 40px MB', 'italic 500 40px CGI', '400 20px JBM'].map(f => document.fonts.load(f, '가A').catch(() => null));  // 없는 서체가 있어도 멈추지 않는다
  const media = clips.map(v => new Promise(r => { if (v.readyState >= 2) return r(); v.addEventListener('loadeddata', r, { once: true }); v.addEventListener('error', () => { msg('영상 파일을 열지 못했습니다: ' + v.getAttribute('src'), true); r(); }, { once: true }); setTimeout(r, 8000); }));
  Promise.all(fonts.concat([...document.images].map(i => i.decode ? i.decode().catch(() => {}) : 0), media, [lottieReady])).then(() => { fit(); draw(0, false); window.__ready = true; });
})();

/* 장면을 짤 때 쓰는 도우미 — render(t) 안에서 S.k(t, 2, 3)처럼 쓴다 */
window.S = {
  k: (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a))),           // t가 a→b 사이 어디쯤인지 0~1
  ease: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,   // 천천히-빠르게-천천히
  out: x => 1 - Math.pow(1 - x, 3),                                      // 빠르게 들어와 천천히 멈춤
  lerp: (a, b, x) => a + (b - a) * x,
  on: (t, a, b) => t >= a && t < b,                                      // 지금 이 구간인가
  css: (el, o) => { for (const k in o) el.style[k] = o[k]; },
};
