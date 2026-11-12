// backupView.js
// Backup & restore screens: save one backup file (to Files, iCloud Drive, email…),
// export spreadsheets (CSV), and restore a backup on this or a new phone.
// Backups never include your Anthropic API key.

import { markBackedUp, readEverythingForBackup, restoreFromBackup } from '../data.js';
import { backupFileName, backupSummary, buildBackup, checkBackup, CSV_TABLES, sortByDay, toCSV }
  from '../logic/backup.js';
import { escapeHTML } from '../logic/text.js';
import { openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';

/** Saves one backup file. On iPhone this opens the Share sheet ("Save to Files", Mail, AirDrop…). */
export async function exportBackup() {
  const { storeData, meta } = await readEverythingForBackup();
  const backup = buildBackup(storeData, meta);
  const file = new File([JSON.stringify(backup, null, 1)], backupFileName(), { type: 'application/json' });
  const result = await saveFiles([file]);
  if (result !== 'cancelled') {
    await markBackedUp();
    showToast(result === 'shared' ? 'Backup ready' : 'Backup downloaded');
  }
}

/** Exports workouts, meals and supplement check-ins as three spreadsheet files. */
export async function exportSpreadsheets() {
  const { storeData } = await readEverythingForBackup();
  const files = [
    ['momentum-workouts', sortByDay(storeData.workouts), CSV_TABLES.workouts],
    ['momentum-meals', sortByDay(storeData.meals), CSV_TABLES.meals],
    ['momentum-supplements', sortByDay(storeData.supplementLogs), CSV_TABLES.supplements],
  ].map(([prefix, rows, columns]) =>
    new File([toCSV(rows, columns)], backupFileName(new Date(), 'csv', prefix), { type: 'text/csv' }));
  const result = await saveFiles(files);
  if (result !== 'cancelled') showToast(result === 'shared' ? 'Spreadsheets ready' : 'Spreadsheets downloaded');
}

/**
 * The restore sheet. `onRestored` runs after a successful restore (used by the welcome screen).
 */
export function openRestoreSheet({ onRestored = null } = {}) {
  let checked = null;   // { backup, result } once a file is chosen
  let problem = '';

  const sheet = openSheet({
    title: 'Restore from backup',
    render(body) {
      body.innerHTML = `
        <p class="sheet-hint">Choose a Momentum backup file (it ends in .json). Everything in it is added to this
          phone; entries already here are kept. Your API key isn’t in backups, so add it again in Settings.</p>

        <label class="primary-button file-button">
          ${checked ? 'Choose a different file' : 'Choose backup file'}
          <input type="file" accept="application/json,.json" data-file hidden>
        </label>

        ${problem ? `<p class="form-problems">${escapeHTML(problem)}</p>` : ''}

        ${checked ? `
          <div class="form-group padded restore-summary">
            <strong>Backup from ${escapeHTML(formatWhen(checked.result.exportedAt))}</strong>
            <span>${escapeHTML(backupSummary(checked.result.counts))}, plus your stats, targets and lists.</span>
          </div>
          <button class="primary-button" data-confirm-restore>Restore this backup</button>` : ''}`;

      body.querySelector('[data-file]').onchange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        problem = '';
        checked = null;
        try {
          const backup = JSON.parse(await file.text());
          const result = checkBackup(backup);
          if (result.ok) checked = { backup, result };
          else problem = result.problem;
        } catch {
          problem = 'This file couldn’t be read. Choose a Momentum backup file (.json).';
        }
        sheet.refresh();
      };

      body.onclick = async (event) => {
        if (!event.target.closest("[data-confirm-restore]") || !checked) return;
        await restoreFromBackup(checked.backup);
        sheet.close();
        showToast('Backup restored');
        onRestored?.(checked.backup);
      };
    },
  });
}

function formatWhen(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'an unknown date'
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Shares files with the iPhone Share sheet if possible, otherwise downloads them. */
async function saveFiles(files) {
  // The claude.ai prototype can't save files; say so instead of pretending.
  if (globalThis.momentumPreview) {
    showToast('Saving files only works in the real app on your phone.');
    return 'cancelled';
  }
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: files[0].name });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Sharing isn't allowed here; fall through to a normal download.
    }
  }
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return 'downloaded';
}
