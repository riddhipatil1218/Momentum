// quotes.test.js — the quote of the day.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUOTES, quoteCredit, quoteForDay } from '../app/js/logic/quotes.js';

test('every quote is short, credited, and emoji-free', () => {
  for (const q of QUOTES) {
    assert.ok(q.text.length > 0 && q.text.length <= 140, q.text);
    assert.ok(q.author && q.book, q.text);
    assert.equal(/\p{Extended_Pictographic}/u.test(q.text + q.author + q.book), false, q.text);
  }
});

test('about half the quotes have the darker edge, and the mood alternates', () => {
  const edgy = QUOTES.filter((q) => q.edge).length;
  assert.ok(edgy >= QUOTES.length * 0.4 && edgy <= QUOTES.length * 0.6, `${edgy} of ${QUOTES.length}`);
  for (let i = 1; i < QUOTES.length; i++) {
    assert.ok(!(QUOTES[i].edge && QUOTES[i - 1].edge), `two edgy quotes in a row at ${i}`);
  }
});

test('no quote appears twice', () => {
  assert.equal(new Set(QUOTES.map((q) => q.text)).size, QUOTES.length);
});

test('the same day always gets the same quote; the next day gets the next one', () => {
  assert.equal(quoteForDay(20261112), quoteForDay(20261112));
  const today = QUOTES.indexOf(quoteForDay(20261112));
  assert.equal(QUOTES.indexOf(quoteForDay(20261113)), (today + 1) % QUOTES.length);
  assert.equal(QUOTES.indexOf(quoteForDay(20261112, 1)), (today + 1) % QUOTES.length); // tapping shows the next
});

test('month and year boundaries keep counting one day at a time', () => {
  const dec31 = QUOTES.indexOf(quoteForDay(20261231));
  assert.equal(QUOTES.indexOf(quoteForDay(20270101)), (dec31 + 1) % QUOTES.length);
});

test('every quote comes up over a full cycle', () => {
  const seen = new Set();
  for (let i = 0; i < QUOTES.length; i++) seen.add(quoteForDay(20261112, i).text);
  assert.equal(seen.size, QUOTES.length);
});

test('credit line', () => {
  assert.equal(quoteCredit(QUOTES[0]), '— Mary Shelley, Frankenstein');
});
