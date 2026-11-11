// comingSoon.js
// Temporary screen for tabs that later milestones will build.

import { escapeHTML } from '../logic/text.js';

export function comingSoon(title, emoji, message) {
  return (root) => {
    root.innerHTML = `
      <header class="page-header"><div><h1>${escapeHTML(title)}</h1></div></header>
      <section class="card coming-soon">
        <div class="coming-soon-emoji mono">${emoji}</div>
        <h2>Coming soon</h2>
        <p>${escapeHTML(message)}</p>
      </section>`;
    root.onclick = null;
    root.onchange = null;
  };
}
