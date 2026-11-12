// quotes.js
// The quote of the day on the Today tab: short lines from well-known books on discipline,
// courage, ambition and self-respect. Every quote is the book's own wording (or the named
// translation's), credited to its author and title. About half have a darker, sharper edge.
//
// To add one: keep it short, check the exact wording against the book, and add `edge: true`
// if it has that darker tone. The list alternates so the mood changes day to day.

export const QUOTES = [
  { text: 'Beware; for I am fearless, and therefore powerful.', author: 'Mary Shelley', book: 'Frankenstein', edge: true },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear', book: 'Atomic Habits' },
  { text: 'Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt.', author: 'Sun Tzu', book: 'The Art of War (Giles translation)', edge: true },
  { text: 'Character—the willingness to accept responsibility for one’s own life—is the source from which self-respect springs.', author: 'Joan Didion', book: 'Slouching Towards Bethlehem' },
  { text: 'I am no bird; and no net ensnares me: I am a free human being with an independent will.', author: 'Charlotte Brontë', book: 'Jane Eyre', edge: true },
  { text: 'Every action you take is a vote for the type of person you wish to become.', author: 'James Clear', book: 'Atomic Habits' },
  { text: 'Always say less than necessary.', author: 'Robert Greene', book: 'The 48 Laws of Power', edge: true },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant', book: 'The Story of Philosophy' },
  { text: 'Definitions belong to the definers, not the defined.', author: 'Toni Morrison', book: 'Beloved', edge: true },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca', book: 'Letters from a Stoic' },
  { text: 'My courage always rises at every attempt to intimidate me.', author: 'Jane Austen', book: 'Pride and Prejudice', edge: true },
  { text: 'Habits are the compound interest of self-improvement.', author: 'James Clear', book: 'Atomic Habits' },
  { text: 'Use absence to increase respect and honor.', author: 'Robert Greene', book: 'The 48 Laws of Power', edge: true },
  { text: 'You may not control all the events that happen to you, but you can decide not to be reduced by them.', author: 'Maya Angelou', book: 'Letter to My Daughter' },
  { text: 'I took a deep breath and listened to the old brag of my heart. I am, I am, I am.', author: 'Sylvia Plath', book: 'The Bell Jar', edge: true },
  { text: 'Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.', author: 'Marcus Aurelius', book: 'Meditations (Long translation)' },
  { text: 'It is much safer to be feared than loved, when, of the two, either must be dispensed with.', author: 'Niccolò Machiavelli', book: 'The Prince (Marriott translation)', edge: true },
  { text: 'Life shrinks or expands in proportion to one’s courage.', author: 'Anaïs Nin', book: 'The Diary of Anaïs Nin, Vol. 3' },
  { text: 'Re-create yourself.', author: 'Robert Greene', book: 'The 48 Laws of Power', edge: true },
  { text: 'There are years that ask questions and years that answer.', author: 'Zora Neale Hurston', book: 'Their Eyes Were Watching God' },
  { text: 'Lock up your libraries if you like; but there is no gate, no lock, no bolt that you can set upon the freedom of my mind.', author: 'Virginia Woolf', book: 'A Room of One’s Own', edge: true },
  { text: 'And, when you want something, all the universe conspires in helping you to achieve it.', author: 'Paulo Coelho', book: 'The Alchemist' },
  { text: 'To define is to limit.', author: 'Oscar Wilde', book: 'The Picture of Dorian Gray', edge: true },
  { text: 'What does not destroy me, makes me stronger.', author: 'Friedrich Nietzsche', book: 'Twilight of the Idols' },
  { text: 'One is not born, but rather becomes, a woman.', author: 'Simone de Beauvoir', book: 'The Second Sex (Parshley translation)', edge: true },
  { text: 'Enter action with boldness.', author: 'Robert Greene', book: 'The 48 Laws of Power' },
];

/** Days since 1 Jan 2000 for a YYYYMMDD day key (so each calendar day gets its own quote). */
function dayNumber(dayKey) {
  const y = Math.floor(dayKey / 10000);
  const m = Math.floor(dayKey / 100) % 100;
  const d = dayKey % 100;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86_400_000);
}

/** The quote for a day. `offset` moves to the next ones (tapping the quote). */
export function quoteForDay(dayKey, offset = 0) {
  const index = (((dayNumber(dayKey) + offset) % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[index];
}

/** "— Mary Shelley, Frankenstein" */
export function quoteCredit(quote) {
  return `— ${quote.author}, ${quote.book}`;
}
