// haptics.js
// A small "tap" you can feel when you check in.
//
// iPhone Safari doesn't let websites vibrate directly. But since iOS 18, toggling a
// switch-style checkbox gives a real haptic tick, so we quietly toggle a hidden one.
// It must run inside a tap handler. If Apple ever changes this, it just does nothing.

export function haptic() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(12); // Android & others
      return;
    }
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    label.remove();
  } catch {
    /* no haptics available — that's fine */
  }
}
