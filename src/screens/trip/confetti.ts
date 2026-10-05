const COLOURS = ["--coral", "--sun", "--pool", "--leaf", "--sea"];
const DURATION_MS = 1600;

/** One burst of confetti in the category colours, about 1.6 s, drawn on a canvas. Does nothing under reduced motion (SPEC.md §7.9). */
export function throwConfetti(canvas: HTMLCanvasElement): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  canvas.width = box.width * dpr;
  canvas.height = box.height * dpr;
  const g = canvas.getContext("2d");
  if (!g) return;
  g.scale(dpr, dpr);
  const style = getComputedStyle(document.documentElement);
  const colours = COLOURS.map((name) => style.getPropertyValue(name).trim());
  const bits = Array.from({ length: 90 }, (_, i) => ({
    x: box.width / 2,
    y: box.height * 0.42,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 8,
    angle: Math.random() * 6,
    spin: (Math.random() - 0.5) * 0.4,
    colour: colours[i % colours.length] ?? "#F0644C",
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const k = (now - start) / DURATION_MS;
    g.clearRect(0, 0, box.width, box.height);
    if (k >= 1) return;
    for (const b of bits) {
      b.vy += 0.28;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.angle += b.spin;
      g.save();
      g.globalAlpha = 1 - k * k;
      g.translate(b.x, b.y);
      g.rotate(b.angle);
      g.fillStyle = b.colour;
      g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      g.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
