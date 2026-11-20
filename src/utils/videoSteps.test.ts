import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveActiveOnsiteStep } from './videoSteps';
import { REGISTRATION_ONSITE_STEPS } from '../data/orientation';

test('keeps Step 0 (Basij) active before Step 1 starts in the video', () => {
  assert.equal(resolveActiveOnsiteStep(0, REGISTRATION_ONSITE_STEPS), 0);
  assert.equal(resolveActiveOnsiteStep(3.5, REGISTRATION_ONSITE_STEPS), 0);
  assert.equal(resolveActiveOnsiteStep(5.5, REGISTRATION_ONSITE_STEPS), 0);
});

test('highlights Step 1 through Step 12 accurately across video timestamps', () => {
  assert.equal(resolveActiveOnsiteStep(6, REGISTRATION_ONSITE_STEPS), 1);
  assert.equal(resolveActiveOnsiteStep(12.4, REGISTRATION_ONSITE_STEPS), 1);
  assert.equal(resolveActiveOnsiteStep(13, REGISTRATION_ONSITE_STEPS), 2);
  assert.equal(resolveActiveOnsiteStep(25.2, REGISTRATION_ONSITE_STEPS), 4);
  // Step 5 starts at 33s and runs until Step 6 at 42s
  assert.equal(resolveActiveOnsiteStep(32.9, REGISTRATION_ONSITE_STEPS), 5);
  assert.equal(resolveActiveOnsiteStep(33, REGISTRATION_ONSITE_STEPS), 5);
  assert.equal(resolveActiveOnsiteStep(38.7, REGISTRATION_ONSITE_STEPS), 5);
  assert.equal(resolveActiveOnsiteStep(42, REGISTRATION_ONSITE_STEPS), 6);
  assert.equal(resolveActiveOnsiteStep(58.5, REGISTRATION_ONSITE_STEPS), 11);
  assert.equal(resolveActiveOnsiteStep(66, REGISTRATION_ONSITE_STEPS), 12);
  assert.equal(resolveActiveOnsiteStep(82, REGISTRATION_ONSITE_STEPS), 12);
});

test('handles scrubbing backwards and invalid times safely', () => {
  assert.equal(resolveActiveOnsiteStep(19.9, REGISTRATION_ONSITE_STEPS), 3);
  assert.equal(resolveActiveOnsiteStep(14.0, REGISTRATION_ONSITE_STEPS), 2);
  assert.equal(resolveActiveOnsiteStep(-1, REGISTRATION_ONSITE_STEPS), 0);
  assert.equal(resolveActiveOnsiteStep(Number.NaN, REGISTRATION_ONSITE_STEPS), 0);
});
