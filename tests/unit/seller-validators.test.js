import { describe, expect, it } from 'vitest';

import {
  MAX_AVAILABILITY_OVERRIDE_HOURS,
  updateSellerSchema,
} from '@/lib/validators/seller';

// T-83. `availabilityOverrideUntil` is update-only (like `paused` since
// T-71), so every case here goes through updateSellerSchema, never
// createSellerSchema.
describe('updateSellerSchema · availabilityOverrideUntil (T-83)', () => {
  it('accepts null - clearing the override', () => {
    const result = updateSellerSchema.safeParse({ availabilityOverrideUntil: null });
    expect(result.success).toBe(true);
  });

  it('accepts an ISO instant a few hours out', () => {
    const until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const result = updateSellerSchema.safeParse({ availabilityOverrideUntil: until });
    expect(result.success).toBe(true);
  });

  it('rejects a timestamp further ahead than the cap - the "no expiry" bug, bounded', () => {
    const tooFar = new Date(
      Date.now() + (MAX_AVAILABILITY_OVERRIDE_HOURS + 1) * 60 * 60 * 1000
    ).toISOString();
    const result = updateSellerSchema.safeParse({ availabilityOverrideUntil: tooFar });
    expect(result.success).toBe(false);
  });

  it('accepts a timestamp right at the cap', () => {
    const atCap = new Date(
      Date.now() + MAX_AVAILABILITY_OVERRIDE_HOURS * 60 * 60 * 1000
    ).toISOString();
    const result = updateSellerSchema.safeParse({ availabilityOverrideUntil: atCap });
    expect(result.success).toBe(true);
  });

  // Deliberately allowed: handleSubmit in EditSellerForm resends the whole
  // seller object, including an override that already expired. Rejecting a
  // past timestamp here would turn every unrelated profile edit after the
  // window passed into a 400.
  it('accepts a timestamp in the past - already expired, and harmless', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = updateSellerSchema.safeParse({ availabilityOverrideUntil: past });
    expect(result.success).toBe(true);
  });

  it('rejects a non-ISO string', () => {
    const result = updateSellerSchema.safeParse({
      availabilityOverrideUntil: 'mañana en la tarde',
    });
    expect(result.success).toBe(false);
  });

  it('the field is optional - omitting it leaves the override untouched', () => {
    const result = updateSellerSchema.safeParse({ businessName: 'Nuevo nombre' });
    expect(result.success).toBe(true);
  });
});
