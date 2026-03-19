/* ═══════════════════════════════════════════════
   CUDA-INSPIRED PORTFOLIO — ENGINE
   Thread blocks · Warps · Compute visualization
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── GRID CANVAS (CUDA Thread Blocks) ───
  const canvas = document.getElementById('grid-canvas');
  const ctx = canvas.getContext('2d');

  // ─── ASCII CANVAS ───
  const asciiCanvas = document.getElementById('ascii-canvas');
  const asciiCtx = asciiCanvas.getContext('2d');
  let terminalMode = false;

  let cells = [];
  let cols, rows;
  const CELL_SIZE = 28;
  const GAP = 1;
  const STEP = CELL_SIZE + GAP;

  // ─── CURSOR TRACKING ───
  let mouseX = -1000;
  let mouseY = -1000;
  const CURSOR_RADIUS = 180;       // px influence radius
  const CURSOR_RADIUS_SQ = CURSOR_RADIUS * CURSOR_RADIUS;
  const CURSOR_STRENGTH = 0.35;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    mouseX = -1000;
    mouseY = -1000;
  });

  // ─── ASCII CHARACTER RAMP ───
  // Brightness → character mapping (density ramp)
  function brightnessToChar(b) {
    if (b < 0.02) return ' ';
    if (b < 0.04) return '.';
    if (b < 0.06) return '.';
    if (b < 0.09) return '+';
    if (b < 0.12) return '+';
    if (b < 0.16) return '*';
    if (b < 0.20) return '*';
    if (b < 0.28) return '#';
    if (b < 0.35) return '#';
    if (b < 0.45) return '@';
    return '%';
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    asciiCanvas.width = window.innerWidth;
    asciiCanvas.height = window.innerHeight;
    cols = Math.ceil(canvas.width / STEP) + 1;
    rows = Math.ceil(canvas.height / STEP) + 1;
    initCells();
  }

  function initCells() {
    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          x: c * STEP,
          y: r * STEP,
          brightness: 0,
          target: 0,
          phase: Math.random() * Math.PI * 2,
          warpGroup: Math.floor(c / 8),  // warp = 8 threads wide
        });
      }
    }
  }

  // Wave patterns simulating kernel execution / memory coalescing
  let waveTime = 0;
  const WAVE_SPEED = 0.008;

  function updateCells(time) {
    waveTime += WAVE_SPEED;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const col = Math.floor(cell.x / STEP);
      const row = Math.floor(cell.y / STEP);

      // Multiple overlapping waves (simulates parallel kernel scheduling)
      const wave1 = Math.sin(waveTime + col * 0.15 + row * 0.08) * 0.5 + 0.5;
      const wave2 = Math.sin(waveTime * 0.7 + row * 0.2 - col * 0.05) * 0.5 + 0.5;
      const wave3 = Math.sin(waveTime * 1.3 + (col + row) * 0.1 + cell.phase) * 0.5 + 0.5;

      // Warp-level coherence: cells in same warp group tend to activate together
      const warpBias = Math.sin(waveTime * 0.5 + cell.warpGroup * 0.8) * 0.3 + 0.5;

      cell.target = (wave1 * 0.3 + wave2 * 0.2 + wave3 * 0.15 + warpBias * 0.35) * 0.12;

      // ─── CURSOR DISTURBANCE — Gaussian heat injection ───
      const dx = cell.x + CELL_SIZE * 0.5 - mouseX;
      const dy = cell.y + CELL_SIZE * 0.5 - mouseY;
      const distSq = dx * dx + dy * dy;
      if (distSq < CURSOR_RADIUS_SQ) {
        const falloff = 1.0 - distSq / CURSOR_RADIUS_SQ;
        cell.target += CURSOR_STRENGTH * falloff * falloff; // quadratic falloff
      }

      // Occasional "hot" cells — divergence simulation
      if (Math.random() < 0.0003) {
        cell.target = 0.3 + Math.random() * 0.2;
      }

      // Smooth interpolation
      cell.brightness += (cell.target - cell.brightness) * 0.08;
    }
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.brightness < 0.005) continue; // skip invisible cells

      const alpha = cell.brightness;
      const grey = Math.floor(alpha * 255);
      ctx.fillStyle = `rgb(${grey},${grey},${grey})`;
      ctx.fillRect(cell.x, cell.y, CELL_SIZE, CELL_SIZE);
    }
  }

  // ─── ASCII GRID RENDERER ───
  let asciiFrame = 0;

  function drawAsciiGrid() {
    // Render every other frame for performance
    asciiFrame++;
    if (asciiFrame % 2 !== 0) return;

    asciiCtx.clearRect(0, 0, asciiCanvas.width, asciiCanvas.height);
    asciiCtx.font = '14px JetBrains Mono, monospace';
    asciiCtx.textAlign = 'center';
    asciiCtx.textBaseline = 'middle';

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.brightness < 0.015) continue;

      const ch = brightnessToChar(cell.brightness);
      if (ch === ' ') continue;

      // Brightness determines both character AND opacity
      const alpha = Math.min(cell.brightness * 3, 1.0);
      const grey = Math.floor(40 + alpha * 180);
      asciiCtx.fillStyle = `rgba(${grey},${grey},${grey},${alpha})`;
      asciiCtx.fillText(
        ch,
        cell.x + CELL_SIZE * 0.5,
        cell.y + CELL_SIZE * 0.5
      );
    }
  }

  // ─── TERMINAL MODE TOGGLE ───
  document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
      // Don't toggle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      terminalMode = !terminalMode;
      document.body.classList.toggle('terminal-mode', terminalMode);
    }
  });

  // ─── NOISE OVERLAY ───
  const noiseCanvas = document.createElement('canvas');
  const noiseCtx = noiseCanvas.getContext('2d');
  const NOISE_SIZE = 256;
  noiseCanvas.width = NOISE_SIZE;
  noiseCanvas.height = NOISE_SIZE;

  function generateNoise() {
    const imageData = noiseCtx.createImageData(NOISE_SIZE, NOISE_SIZE);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    noiseCtx.putImageData(imageData, 0, 0);

    const overlay = document.getElementById('noise-overlay');
    overlay.style.backgroundImage = `url(${noiseCanvas.toDataURL()})`;
    overlay.style.backgroundSize = `${NOISE_SIZE}px ${NOISE_SIZE}px`;
  }

  // Regenerate noise periodically for "memory traffic" effect
  let noiseFrame = 0;
  function updateNoise() {
    noiseFrame++;
    if (noiseFrame % 6 === 0) {  // every ~6 frames
      generateNoise();
    }
  }

  // ─── GLITCH BANDS ───
  const glitchContainer = document.getElementById('glitch-bands');
  let lastGlitch = 0;

  function maybeGlitch(time) {
    if (time - lastGlitch < 3000) return; // min 3s between glitches
    if (Math.random() > 0.003) return;

    lastGlitch = time;
    const count = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const band = document.createElement('div');
      band.className = 'glitch-band';
      band.style.top = `${Math.random() * 100}%`;
      band.style.height = `${1 + Math.random() * 3}px`;
      glitchContainer.appendChild(band);

      setTimeout(() => band.remove(), 150);
    }
  }

  // ─── SECTION VISIBILITY / KERNEL LOADING ───
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav-links a');
  const navStatus = document.getElementById('nav-status');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Simulate kernel loading
          entry.target.classList.add('loading');
          setTimeout(() => {
            entry.target.classList.remove('loading');
            entry.target.classList.add('visible');
          }, 200);

          // Update nav
          const kernel = entry.target.dataset.kernel;
          navLinks.forEach((link) => link.classList.remove('active'));
          const activeLink = document.querySelector(
            `.nav-links a[data-section="${kernel}"]`
          );
          if (activeLink) activeLink.classList.add('active');

          navStatus.textContent = `K_${kernel.padStart(2, '0')}`;
        }
      });
    },
    { threshold: 0.2 }
  );

  sections.forEach((section) => observer.observe(section));

  // ─── TYPED TEXT EFFECT ───
  const typedEl = document.getElementById('typed-text');
  const lines = [
    'initializing compute pipeline...',
    'CUDA cores allocated. warps ready.',
    'research engineer. systems thinker. builder.',
    'loading active_blocks...',
  ];
  let lineIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeTimeout;

  function typeLoop() {
    const currentLine = lines[lineIndex];

    if (!isDeleting) {
      typedEl.textContent = currentLine.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex >= currentLine.length) {
        isDeleting = true;
        typeTimeout = setTimeout(typeLoop, 2000);
        return;
      }
      typeTimeout = setTimeout(typeLoop, 40 + Math.random() * 30);
    } else {
      typedEl.textContent = currentLine.slice(0, charIndex);
      charIndex--;

      if (charIndex < 0) {
        isDeleting = false;
        charIndex = 0;
        lineIndex = (lineIndex + 1) % lines.length;
        typeTimeout = setTimeout(typeLoop, 400);
        return;
      }
      typeTimeout = setTimeout(typeLoop, 20);
    }
  }

  // ─── COMPUTE BLOCK HOVER — "ACTIVATION" ───
  document.querySelectorAll('.compute-block').forEach((block) => {
    block.addEventListener('mouseenter', () => {
      block.querySelector('.block-status').textContent = 'ACTIVE';
    });
    block.addEventListener('mouseleave', () => {
      const original = block.dataset.load >= 0.85 ? 'EXECUTING' : 'COMPLETE';
      block.querySelector('.block-status').textContent = original;
    });
  });

  // ─── ASCII BOOT SEQUENCE ───
  function runBootSequence() {
    const bootEl = document.getElementById('ascii-boot');
    if (!bootEl) return;

    // After 2.2 seconds, collapse the ASCII name into the real name
    setTimeout(() => {
      bootEl.classList.add('collapsed');
    }, 2200);
  }

  // ─── SECTION HEADER GLITCH SCRAMBLE ───
  // Brief ASCII corruption on section entry (100-300ms)
  const GLITCH_CHARS = '@#%&*+.';
  function scrambleText(el, duration) {
    const original = el.textContent;
    const len = original.length;
    let frame = 0;
    const totalFrames = Math.ceil(duration / 50);

    const interval = setInterval(() => {
      frame++;
      let result = '';
      for (let i = 0; i < len; i++) {
        if (original[i] === ' ') {
          result += ' ';
        } else if (Math.random() < frame / totalFrames) {
          // Progressively reveal the original
          result += original[i];
        } else {
          result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
      }
      el.textContent = result;

      if (frame >= totalFrames) {
        clearInterval(interval);
        el.textContent = original;
      }
    }, 50);
  }

  // Hook into the IntersectionObserver — scramble section tags on entry
  const sectionTags = document.querySelectorAll('.section-tag');
  const tagObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const tag = entry.target.querySelector('.section-tag');
          if (tag) scrambleText(tag, 200);
          tagObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach((s) => tagObserver.observe(s));

  // ─── COMPUTE BLOCK TITLE SCRAMBLE ON HOVER ───
  document.querySelectorAll('.block-title').forEach((title) => {
    let isScrambling = false;
    title.addEventListener('mouseenter', () => {
      if (isScrambling) return;
      isScrambling = true;
      scrambleText(title, 150);
      setTimeout(() => { isScrambling = false; }, 200);
    });
  });

  // ─── MAIN ANIMATION LOOP ───
  let rafId;
  let startTime;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    updateCells(elapsed);
    drawGrid();
    drawAsciiGrid();
    updateNoise();
    maybeGlitch(elapsed);

    rafId = requestAnimationFrame(animate);
  }

  // ─── INIT ───
  function init() {
    resizeCanvas();
    generateNoise();
    typeLoop();
    runBootSequence();

    // Make hero visible immediately
    document.getElementById('kernel_00').classList.add('visible');

    // Start in default mode — ASCII canvas always renders,
    // but is only visible in terminal mode or as ambient overlay
    asciiCanvas.style.opacity = '0.15';

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
