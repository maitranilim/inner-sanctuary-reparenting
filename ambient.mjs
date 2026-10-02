import { getMotion } from './settings.mjs';

const REVEAL_SELECTOR = [
  '.section-index', '.section-heading', '.intro-grid', '.approach-card', '.both-note', '.practice-panel',
  '.pillar-card', '.breathe-panel', '.game-shell', '.ritual-step', '.ritual-quote', '.checkin-grid', '.arrive-card',
].join(',');

const ORB_TIME_CONSTANT = 0.5;

export function easeToward(current, target, deltaSeconds, timeConstant = ORB_TIME_CONSTANT) {
  return current + (target - current) * (1 - Math.exp(-deltaSeconds / timeConstant));
}

export function initAmbient() {
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

  if ('IntersectionObserver' in window) {
    const targets = [...document.querySelectorAll(REVEAL_SELECTOR)];
    targets.forEach((element) => {
      const siblings = [...element.parentElement.children].filter((child) => child.matches(REVEAL_SELECTOR));
      element.dataset.reveal = '';
      element.style.setProperty('--d', `${Math.min(siblings.indexOf(element), 5) * 0.1}s`);
    });
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
        window.setTimeout(() => entry.target.classList.add('is-done'), 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((element) => reveal.observe(element));
    const syncReveal = () => {
      const full = getMotion() === 'full';
      root.classList.toggle('reveal-ready', full);
      if (!full) targets.forEach((element) => element.classList.add('is-visible'));
    };
    syncReveal();
    new MutationObserver(syncReveal).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
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
  let last = 0;

  function loop(now) {
    const delta = Math.min(0.064, Math.max(0.001, (now - last) / 1000));
    last = now;
    currentX = easeToward(currentX, targetX, delta);
    currentY = easeToward(currentY, targetY, delta);
    glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    root.style.setProperty('--px', ((currentX / window.innerWidth - 0.5) * 2).toFixed(3));
    root.style.setProperty('--py', ((currentY / window.innerHeight - 0.5) * 2).toFixed(3));
    if (Math.abs(targetX - currentX) > 0.4 || Math.abs(targetY - currentY) > 0.4) {
      window.requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || getMotion() !== 'full') return;
    targetX = event.clientX;
    targetY = event.clientY;
    glow.classList.add('on');
    if (!running) {
      running = true;
      last = performance.now();
      window.requestAnimationFrame(loop);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('on'));
}
