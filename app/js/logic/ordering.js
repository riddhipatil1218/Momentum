// ordering.js
// Moving an item up or down in a list (supplements, workout types).

/**
 * Returns the items in their new order, with sortOrder renumbered 0, 1, 2, …
 * @param {Array<{sortOrder:number}>} items already sorted by sortOrder
 * @param {number} index the item to move
 * @param {-1|1} direction -1 = up, 1 = down
 */
export function moveItem(items, index, direction) {
  const target = index + direction;
  const result = [...items];
  if (target < 0 || target >= items.length) return result.map((item, i) => ({ ...item, sortOrder: i }));
  [result[index], result[target]] = [result[target], result[index]];
  return result.map((item, i) => ({ ...item, sortOrder: i }));
}

/** The sortOrder for a new item added to the end of the list. */
export function nextSortOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
}
