export const FIREFLY_COLORS = [
  [176, 255, 84],
  [214, 255, 90],
  [255, 238, 96],
];

export function fireflyCount(width, height) {
  return Math.max(10, Math.min(26, Math.round((width * height) / 60000)));
}

export function createFirefly(random, width, height) {
  return {
    x: random() * width,
    y: random() * height,
    heading: random() * Math.PI * 2,
    turn: (random() - 0.5) * 0.6,
    speed: 5 + random() * 9,
    size: 1.5 + random() * 1.1,
    color: FIREFLY_COLORS[Math.floor(random() * FIREFLY_COLORS.length)],
    phase: random() * Math.PI * 2,
    rate: 0.25 + random() * 0.4,
  };
}

export function stepFirefly(firefly, delta, width, height) {
  firefly.heading += firefly.turn * delta + Math.sin(firefly.phase * 1.7 + firefly.heading) * 0.12 * delta;
  firefly.x += Math.cos(firefly.heading) * firefly.speed * delta;
  firefly.y += Math.sin(firefly.heading) * firefly.speed * delta - 1.2 * delta;
  firefly.phase += firefly.rate * delta * Math.PI * 2;
  const margin = 20;
  if (firefly.x < -margin) firefly.x = width + margin;
  if (firefly.x > width + margin) firefly.x = -margin;
  if (firefly.y < -margin) firefly.y = height + margin;
  if (firefly.y > height + margin) firefly.y = -margin;
}

export function fireflyGlow(phase) {
  const wave = (Math.sin(phase) + 1) / 2;
  return 0.12 + 0.43 * wave * wave;
}

export function createSpark(random, width, height) {
  const length = 12 + random() * 12;
  const angle = -Math.PI / 2 + (random() - 0.5) * 0.7;
  const speed = 34 + random() * 40;
  return {
    x: width * (0.1 + random() * 0.8),
    y: height + 6,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length,
    age: 0,
    life: 2.6 + random() * 1.8,
    sway: (random() - 0.5) * 8,
  };
}

export function stepSpark(spark, delta) {
  spark.age += delta;
  spark.x += (spark.vx + Math.sin(spark.age * 2.2) * spark.sway) * delta;
  spark.y += spark.vy * delta;
  spark.vy *= 1 - 0.05 * delta;
  return spark.age < spark.life;
}

export function sparkColor(progress) {
  const t = Math.min(1, Math.max(0, progress));
  return [255, Math.round(214 - 112 * t), Math.round(78 - 34 * t)];
}

export function sparkAlpha(progress) {
  const t = Math.min(1, Math.max(0, progress));
  const fade = t < 0.18 ? t / 0.18 : Math.pow(Math.max(0, 1 - (t - 0.18) / 0.82), 1.4);
  return 0.5 * fade;
}

export function nextSparkDelay(random) {
  return 3.2 + random() * 4.5;
}

export function initCampfire() {
  const root = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'campfire-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let fireflies = [];
  let sparks = [];
  let frame = null;
  let last = 0;
  let sparkTimer = 2;

  const active = () => root.dataset.campfire === 'on' && (root.dataset.motion || 'full') === 'full' && !document.hidden;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const wanted = fireflyCount(width, height);
    if (fireflies.length > wanted) fireflies.length = wanted;
    while (fireflies.length < wanted) fireflies.push(createFirefly(Math.random, width, height));
  }

  function drawFirefly(firefly) {
    const glow = fireflyGlow(firefly.phase);
    const [r, g, b] = firefly.color;
    const radius = firefly.size * 7;
    const gradient = context.createRadialGradient(firefly.x, firefly.y, 0, firefly.x, firefly.y, radius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glow})`);
    gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${glow * 0.35})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(firefly.x, firefly.y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.75, glow * 1.4)})`;
    context.beginPath();
    context.arc(firefly.x, firefly.y, firefly.size * 0.55, 0, Math.PI * 2);
    context.fill();
  }

  function drawSpark(spark) {
    const progress = spark.age / spark.life;
    const alpha = sparkAlpha(progress);
    if (alpha <= 0.01) return;
    const speed = Math.hypot(spark.vx, spark.vy) || 1;
    const tailX = spark.x - (spark.vx / speed) * spark.length;
    const tailY = spark.y - (spark.vy / speed) * spark.length;
    const [r, g, b] = sparkColor(progress);
    const gradient = context.createLinearGradient(spark.x, spark.y, tailX, tailY);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${r}, ${Math.max(0, g - 50)}, ${b}, 0)`);
    context.strokeStyle = gradient;
    context.lineWidth = 1.3;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(spark.x, spark.y);
    context.lineTo(tailX, tailY);
    context.stroke();
  }

  function tick(now) {
    const delta = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    context.clearRect(0, 0, width, height);
    fireflies.forEach((firefly) => {
      stepFirefly(firefly, delta, width, height);
      drawFirefly(firefly);
    });
    sparkTimer -= delta;
    if (sparkTimer <= 0) {
      sparks.push(createSpark(Math.random, width, height));
      if (Math.random() < 0.35) sparks.push(createSpark(Math.random, width, height));
      sparkTimer = nextSparkDelay(Math.random);
    }
    sparks = sparks.filter((spark) => stepSpark(spark, delta));
    sparks.forEach(drawSpark);
    frame = active() ? window.requestAnimationFrame(tick) : null;
    if (!frame) context.clearRect(0, 0, width, height);
  }

  function sync() {
    if (active()) {
      if (frame === null) {
        resize();
        last = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    } else if (frame !== null) {
      window.cancelAnimationFrame(frame);
      frame = null;
      sparks = [];
      context.clearRect(0, 0, width, height);
    }
  }

  window.addEventListener('resize', () => {
    if (frame !== null) resize();
  });
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-campfire', 'data-motion'] });
  sync();
}
