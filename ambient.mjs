const REVEAL_SELECTOR = [
  '.section-index', '.section-heading', '.intro-grid', '.approach-card', '.both-note', '.practice-panel',
  '.pillar-card', '.breathe-panel', '.game-shell', '.ritual-step', '.ritual-quote', '.checkin-grid', '.arrive-card',
].join(',');

export function initAmbient() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  const root = document.documentElement;

  let scrollTicking = false;
  function updateProgress() {
    scrollTicking = false;
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--progress', max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : '0');
  }
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  updateProgress();

  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((section) => spy.observe(section));
  }

  if (reduced) return;

  if ('IntersectionObserver' in window) {
    const targets = [...document.querySelectorAll(REVEAL_SELECTOR)];
    targets.forEach((element) => {
      const siblings = [...element.parentElement.children].filter((child) => child.matches(REVEAL_SELECTOR));
      element.dataset.reveal = '';
      element.style.setProperty('--d', `${Math.min(siblings.indexOf(element), 5) * 0.1}s`);
    });
    root.classList.add('reveal-ready');
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
        window.setTimeout(() => entry.target.classList.add('is-done'), 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((element) => reveal.observe(element));
  }

  if (!canHover) return;

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let running = false;

  function loop() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    const px = (currentX / window.innerWidth - 0.5) * 2;
    const py = (currentY / window.innerHeight - 0.5) * 2;
    root.style.setProperty('--px', px.toFixed(3));
    root.style.setProperty('--py', py.toFixed(3));
    if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
      window.requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    targetX = event.clientX;
    targetY = event.clientY;
    glow.classList.add('on');
    if (!running) {
      running = true;
      window.requestAnimationFrame(loop);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('on'));
}
