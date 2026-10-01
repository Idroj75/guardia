/* Month swipes and a viewport-fitted calendar on phones and tablets. */
(() => {
  const header = document.querySelector('aside');
  const grid = document.getElementById('days');
  if (!header || !grid) return;

  const measure = () => document.documentElement.style.setProperty('--guardia-header-height', Math.ceil(header.getBoundingClientRect().height) + 'px');
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
  window.addEventListener('resize', measure, {passive:true});
  document.querySelector('nav button[data-screen="calendar"]')?.addEventListener('click', () => window.scrollTo(0, 0));

  let start = null;
  let ignoreClickUntil = 0;
  grid.setAttribute('aria-label', 'Calendari del mes; llisca cap als costats per canviar de mes');
  grid.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) {start = null; return}
    const point = event.touches[0];
    start = {x:point.clientX, y:point.clientY};
  }, {passive:true});
  grid.addEventListener('touchcancel', () => {start = null}, {passive:true});
  grid.addEventListener('touchend', event => {
    if (!start || event.changedTouches.length !== 1) {start = null; return}
    const point = event.changedTouches[0];
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    event.preventDefault();
    ignoreClickUntil = performance.now() + 650;
    document.getElementById(dx < 0 ? 'next' : 'prev')?.click();
  }, {passive:false});
  grid.addEventListener('click', event => {
    if (performance.now() >= ignoreClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
