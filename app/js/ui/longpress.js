// longpress.js
// "Press and hold" support. Holding any element marked with data-hold for half a second
// sends a "momentum:longpress" event from that element, and the normal tap that would
// follow is cancelled (so holding a supplement opens the editor instead of checking it).

import { haptic } from './haptics.js';

const HOLD_MS = 500;
const MOVE_TOLERANCE = 10; // px of finger movement allowed before it counts as scrolling

export function installLongPress() {
  let timer = null;
  let start = null;
  let fired = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  document.addEventListener('pointerdown', (event) => {
    fired = false;
    const target = event.target.closest('[data-hold]');
    if (!target) return;
    start = { x: event.clientX, y: event.clientY };
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      haptic();
      target.dispatchEvent(new CustomEvent('momentum:longpress', { bubbles: true }));
    }, HOLD_MS);
  });

  document.addEventListener('pointermove', (event) => {
    if (timer && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE) cancel();
  });
  document.addEventListener('pointerup', cancel);
  document.addEventListener('pointercancel', cancel);

  // Swallow the tap that ends a long press.
  document.addEventListener('click', (event) => {
    if (!fired) return;
    fired = false;
    event.stopPropagation();
    event.preventDefault();
  }, true);

  // Stop the phone's own press-and-hold menu on these elements.
  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('[data-hold]')) event.preventDefault();
  });
}
