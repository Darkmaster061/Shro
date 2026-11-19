import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_BASIJ_CADRES } from './basijCadresOfficial';
import {
  BASIJ_AXIS_META,
  groupCadresByAxis,
  matchCadresByMajor,
  toggleSavedCadreId,
} from './basijVisuals';
import type { CadreItem } from '../types/portal';

const MOCK_CADRES: CadreItem[] = OFFICIAL_BASIJ_CADRES.map((seed, index) => ({
  id: index + 1,
  name: seed.name,
  category: seed.category,
  shortDesc: seed.shortDesc,
  fullDesc: seed.fullDesc,
  leadName: '[نیاز به تکمیل]',
  meetingSchedule: '[نیاز به تکمیل]',
  contactInfo: '[نیاز به تکمیل]',
  joinLink: '',
  highlights: seed.highlights,
  tags: seed.tags,
  imageUrl: '',
  published: true,
  pdfPage: seed.pdfPage,
  isDemo: false,
}));

test('groupCadresByAxis groups all 25 official cadres across all 6 axes', () => {
  const groups = groupCadresByAxis(MOCK_CADRES);
  assert.equal(groups.length, 6);
  assert.equal(BASIJ_AXIS_META.length, 6);
  const total = groups.reduce((acc, g) => acc + g.items.length, 0);
  assert.equal(total, 25);
});

test('matchCadresByMajor returns relevant cadres for computer and civil engineering', () => {
  const compMatches = matchCadresByMajor('computer', MOCK_CADRES);
  assert.ok(compMatches.length >= 3);
  assert.ok(compMatches.some((c) => c.name === 'کانون پژوهش و فناوری'));
  assert.ok(compMatches.some((c) => c.name === 'کانون تولیدات رسانه‌ای'));

  const civilMatches = matchCadresByMajor('civil', MOCK_CADRES);
  assert.ok(civilMatches.some((c) => c.name === 'کانون هجرت'));

  assert.deepEqual(matchCadresByMajor('all', MOCK_CADRES), []);
  assert.deepEqual(matchCadresByMajor('unknown-major', MOCK_CADRES), []);
});

test('toggleSavedCadreId toggles bookmark IDs cleanly without duplicates', () => {
  const afterAdd = toggleSavedCadreId([], 5);
  assert.deepEqual(afterAdd, [5]);

  const afterSecondAdd = toggleSavedCadreId(afterAdd, 12);
  assert.deepEqual(afterSecondAdd, [5, 12]);

  const afterRemove = toggleSavedCadreId(afterSecondAdd, 5);
  assert.deepEqual(afterRemove, [12]);
});
