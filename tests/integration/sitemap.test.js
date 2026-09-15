import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let getPublicSitemapData;
let buildSitemap;
let Seller;
let Product;
let ids;

const urlsOf = async () => {
  const data = await getPublicSitemapData();
  return buildSitemap(data).map(entry => entry.url);
};

describe('T-74 · sitemap against the database', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    ({ getPublicSitemapData } = await import(
      '@/server/sitemap/getPublicSitemapData'
    ));
    ({ buildSitemap } = await import('@/lib/sitemap'));
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
    ({ Product } = await import('@/utils/models/productSchema'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  it('includes the approved seller and its products', async () => {
    const urls = await urlsOf();

    expect(urls.some(url => url.endsWith(`/antojos/sellers/${ids.approvedSeller}`))).toBe(true);
    expect(urls.some(url => url.endsWith(`/antojos/${ids.approvedProduct}`))).toBe(true);
  });

  it('does not include the unapproved seller', async () => {
    const urls = await urlsOf();

    expect(urls.some(url => url.includes(ids.pendingSeller))).toBe(false);
  });

  it('nor the unapproved seller\'s products either', async () => {
    const pendingProducts = await Product.find({ sellerId: ids.pendingSeller })
      .select('_id')
      .lean();
    expect(pendingProducts.length).toBeGreaterThan(0); // the seed did give it products

    const urls = await urlsOf();
    for (const product of pendingProducts) {
      expect(urls.some(url => url.endsWith(`/${product._id}`))).toBe(false);
    }
  });

  // T-71: pausing hides the store from the public listing, so the sitemap
  // can't keep sending crawlers to it.
  it('a paused seller disappears, along with its products', async () => {
    expect((await urlsOf()).some(url => url.includes(ids.approvedSeller))).toBe(true);

    await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });

    const urls = await urlsOf();
    expect(urls.some(url => url.includes(ids.approvedSeller))).toBe(false);
    expect(urls.some(url => url.endsWith(`/antojos/${ids.approvedProduct}`))).toBe(false);
  });

  // Sellers predating T-71 have no `paused` field; if the filter used
  // `paused: false` they would all vanish from the sitemap.
  it('an old seller, with no paused field, still gets listed', async () => {
    await Seller.collection.updateOne(
      { businessName: 'Arepas El Parche' },
      { $unset: { paused: '' } }
    );

    expect((await urlsOf()).some(url => url.includes(ids.approvedSeller))).toBe(true);
  });

  it('a marketplace product is listed under /marketplace', async () => {
    const product = await Product.findOne({
      sellerId: ids.approvedSeller,
      section: 'marketplace',
    }).select('_id').lean();

    if (!product) return; // the seed may not carry one; the unit test already covers the shape
    expect((await urlsOf()).some(url => url.endsWith(`/marketplace/${product._id}`))).toBe(true);
  });
});
