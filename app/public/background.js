/* Decorative animated background. Not part of the application logic.
   A drifting field of soft brand-coloured nodes, linked when close, that
   eases gently away from the pointer. Skipped entirely for visitors who
   prefer reduced motion, and paused while the tab is hidden. */
(() => {
  'use strict';

  const canvas = document.getElementById('background');
  if (!canvas) return;

  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  if (!motion.matches) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const LIGHT = ['#1578e4', '#66adf8', '#c4bbff', '#cd63c3'];
  const DARK = ['#66adf8', '#c4bbff', '#cd63c3', '#1578e4'];
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let raf = null;
  const pointer = { x: -1e4, y: -1e4 };

  function palette() {
    return darkScheme.matches ? DARK : LIGHT;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.max(24, Math.min(56, Math.floor((width * height) / 26000)));
    const colours = palette();
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 2.5,
      colour: colours[Math.floor(Math.random() * colours.length)]
    }));
  }

  function step() {
    ctx.clearRect(0, 0, width, height);
    const linkDistance = 110;

    for (const node of nodes) {
      // Gentle drift, easing away from the pointer when it comes close.
      const dx = node.x - pointer.x;
      const dy = node.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140 && dist > 0) {
        const push = (140 - dist) / 140;
        node.vx += (dx / dist) * push * 0.06;
        node.vy += (dy / dist) * push * 0.06;
      }
      node.vx = Math.max(-0.6, Math.min(0.6, node.vx * 0.995));
      node.vy = Math.max(-0.6, Math.min(0.6, node.vy * 0.995));
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -20) node.x = width + 20;
      if (node.x > width + 20) node.x = -20;
      if (node.y < -20) node.y = height + 20;
      if (node.y > height + 20) node.y = -20;
    }

    ctx.globalAlpha = 0.12;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDistance) {
          ctx.strokeStyle = a.colour;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.12 * (1 - d / linkDistance);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 0.35;
    for (const node of nodes) {
      ctx.fillStyle = node.colour;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(step);
  }

  function start() {
    if (raf === null) raf = requestAnimationFrame(step);
  }

  function stop() {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  window.addEventListener('pointerleave', () => {
    pointer.x = -1e4;
    pointer.y = -1e4;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  darkScheme.addEventListener('change', seed);
  motion.addEventListener('change', () => {
    if (!motion.matches) {
      stop();
      ctx.clearRect(0, 0, width, height);
    } else {
      start();
    }
  });

  resize();
  start();
})();
