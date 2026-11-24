import { describe, expect, it } from 'vitest';

import { buildSellerRegisterPayload } from '@/lib/seller-register-payload';

// T-134: the register form used to mutate `sellerData` in place inside
// `handleSubmit` (`sellerData.description = JSON.stringify(sellerData.description)`,
// never through `setSellerData`). A rejected submit left that mutation
// sitting in state, so an immediate retry - no retyping - stringified the
// description a second time. This proves the payload builder never touches
// its input and always encodes the description exactly once, no matter how
// many times it is called with the same state object.
describe('buildSellerRegisterPayload (T-134)', () => {
  const sellerData = () => ({
    businessName: 'Arepas Pepe',
    description: 'Las mejores arepas del campus',
    images: ['https://img.example/logo.png'],
  });

  it('does not mutate the sellerData object it is given', () => {
    const original = sellerData();
    const snapshot = { ...original };

    buildSellerRegisterPayload(original);

    expect(original).toEqual(snapshot);
  });

  it('encodes the description exactly once, even on a second call with the same state', () => {
    const original = sellerData();

    const firstSubmit = buildSellerRegisterPayload(original);
    const retrySubmit = buildSellerRegisterPayload(original);

    expect(firstSubmit.description).toBe(JSON.stringify(original.description));
    expect(retrySubmit.description).toBe(JSON.stringify(original.description));
    // The old bug: the second call saw the already-stringified description
    // left in `sellerData` and stringified it again.
    expect(retrySubmit.description).not.toBe(JSON.stringify(firstSubmit.description));
  });

  it('takes the logo from the first uploaded image', () => {
    const payload = buildSellerRegisterPayload(sellerData());

    expect(payload.logo).toBe('https://img.example/logo.png');
  });
});
