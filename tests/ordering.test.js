// ordering.test.js — reordering lists, and the greeting text.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveItem, nextSortOrder } from '../app/js/logic/ordering.js';
import { greeting } from '../app/js/ui/format.js';

const list = [
  { name: 'A', sortOrder: 0 },
  { name: 'B', sortOrder: 1 },
  { name: 'C', sortOrder: 2 },
];
const names = (items) => items.map((i) => i.name).join('');

test('move down and up', () => {
  assert.equal(names(moveItem(list, 0, 1)), 'BAC');
  assert.equal(names(moveItem(list, 2, -1)), 'ACB');
});

test('moving past either end changes nothing', () => {
  assert.equal(names(moveItem(list, 0, -1)), 'ABC');
  assert.equal(names(moveItem(list, 2, 1)), 'ABC');
});

test('sortOrder is renumbered and the original list is untouched', () => {
  const moved = moveItem(list, 1, 1);
  assert.deepEqual(moved.map((i) => i.sortOrder), [0, 1, 2]);
  assert.equal(names(list), 'ABC');
  assert.equal(list[1].sortOrder, 1);
});

test('new items go at the end', () => {
  assert.equal(nextSortOrder(list), 3);
  assert.equal(nextSortOrder([]), 0);
  assert.equal(nextSortOrder([{ sortOrder: 7 }, { sortOrder: 2 }]), 8);
});

test('greeting is capitalized by time of day', () => {
  assert.equal(greeting(new Date(2026, 10, 11, 8)), 'Good Morning');
  assert.equal(greeting(new Date(2026, 10, 11, 13)), 'Good Afternoon');
  assert.equal(greeting(new Date(2026, 10, 11, 20)), 'Good Evening');
  assert.equal(greeting(new Date(2026, 10, 11, 2)), 'Good Evening');
});
