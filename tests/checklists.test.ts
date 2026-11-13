import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKLIST_ITEM_IDS, STATION_CHECKLISTS } from '../src/stories/checklists';
import { parseChecklistProgress } from '../src/components/ChecklistProgress';

test('the supplied 115 checklist items map to eight stations with two separate cocktail lists', () => {
  const groups = Object.values(STATION_CHECKLISTS).flat();
  assert.equal(groups.length, 9);
  assert.equal(CHECKLIST_ITEM_IDS.size, 115);
  assert.equal(groups.reduce((count, group) => count + group.items.length, 0), 115);
  assert.deepEqual(Object.fromEntries(groups.map(group => [group.id, group.items.length])), {
    puri: 16, margarita: 14, 'last-drop': 11, chaat: 16, 'side-eye': 10, 'love-handles': 15, 'emotional-baggage': 12, 'final-supper': 8, 'photo-booth': 13,
  });
  assert.deepEqual(STATION_CHECKLISTS.bar?.map(group => group.title), ['Too Hot to Handle', 'The Last Drop']);
  assert.equal(STATION_CHECKLISTS.charades, undefined);
  const items = groups.flatMap(group => group.items);
  assert(items.every(item => item.label && item.quantity));
  assert.equal(items.find(item => item.id === 'puri-tequila')?.quantity, '750 mL, adjust for pours');
  assert.equal(items.find(item => item.id === 'chaat-chaat-masala')?.quantity, 'Shared with pani puri');
  assert.equal(items.find(item => item.id === 'love-handles-saffron')?.quantity, 'Small packet, optional');
});

test('saved checklist data tolerates damaged storage and ignores unknown or duplicate items', () => {
  for (const raw of [null, '{', 'null', '{}', 'true']) assert.equal(parseChecklistProgress(raw).size, 0);
  assert.deepEqual([...parseChecklistProgress('["puri-shells","puri-shells","margarita-tequila","unknown",12,null]')], ['puri-shells', 'margarita-tequila']);
});
