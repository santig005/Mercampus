import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// Same stubbed Clerk session as sellerContextData.test.js / autorizacion.test.js.
const session = vi.hoisted(() => ({ userId: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

const signInAs = clerkId => {
  session.userId = clerkId;
};
const signOut = () => {
  session.userId = null;
};

// From the seed.
const APPROVED_OWNER_CLERK_ID = 'user_seed_carlos';
const PENDING_OWNER_CLERK_ID = 'user_seed_laura';
const BUYER_CLERK_ID = 'user_seed_ana';

let getSellerPanelStats;
let Order;
let Seller;

describe('getSellerPanelStats (T-44)', () => {
  beforeAll(async () => {
    // connectDB reads MONGO_URI when imported, so it has to be set before
    // loading the module (same order as sellerContextData.test.js).
    process.env.MONGO_URI = await startTestDb();
    ({ getSellerPanelStats } = await import('@/server/orders/getSellerPanelStats'));
    ({ Order } = await import('@/utils/models/orderSchema'));
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await seedDatabase();
    signOut();
  });

  it('sin sesion: no-session', async () => {
    expect(await getSellerPanelStats()).toEqual({ status: 'no-session' });
  });

  it('usuario sin perfil de vendedor: no-seller', async () => {
    signInAs(BUYER_CLERK_ID);
    expect(await getSellerPanelStats()).toEqual({ status: 'no-seller' });
  });

  it('vendedor sin aprobar: not-approved', async () => {
    signInAs(PENDING_OWNER_CLERK_ID);
    expect(await getSellerPanelStats()).toEqual({ status: 'not-approved' });
  });

  it('vendedor aprobado sin pedidos: stats en cero', async () => {
    signInAs(APPROVED_OWNER_CLERK_ID);
    const result = await getSellerPanelStats();

    expect(result.status).toBe('ok');
    expect(result.stats.totalOrders).toBe(0);
    expect(result.stats.cancellationRate).toBe(0);
    expect(result.stats.salesPerDay).toHaveLength(14);
  });

  it('solo cuenta los pedidos de este vendedor, no los de otro', async () => {
    signInAs(APPROVED_OWNER_CLERK_ID);
    const seller = await Seller.findOne({ businessName: 'Arepas El Parche' });
    const otherSellerId = new mongoose.Types.ObjectId();
    const buyerId = new mongoose.Types.ObjectId();

    await Order.create([
      {
        buyerId,
        sellerId: seller._id,
        lineItems: [{ productId: new mongoose.Types.ObjectId(), name: 'Arepa de queso', price: 6000, quantity: 2 }],
        status: 'completed',
        history: [
          { status: 'pending', at: new Date() },
          { status: 'completed', at: new Date() },
        ],
      },
      {
        buyerId,
        sellerId: otherSellerId, // a different seller entirely
        lineItems: [{ productId: new mongoose.Types.ObjectId(), name: 'No es mio', price: 1000, quantity: 1 }],
        status: 'completed',
        history: [
          { status: 'pending', at: new Date() },
          { status: 'completed', at: new Date() },
        ],
      },
    ]);

    const result = await getSellerPanelStats();

    expect(result.status).toBe('ok');
    expect(result.stats.totalOrders).toBe(1);
    expect(result.stats.topProducts).toEqual([{ name: 'Arepa de queso', quantity: 2 }]);
  });

  it('mezcla de estados: cancelacion, ventas y horas pico reflejan solo lo real', async () => {
    signInAs(APPROVED_OWNER_CLERK_ID);
    const seller = await Seller.findOne({ businessName: 'Arepas El Parche' });
    const buyerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const now = new Date();

    await Order.create([
      {
        buyerId,
        sellerId: seller._id,
        lineItems: [{ productId, name: 'Arepa de queso', price: 6000, quantity: 1 }],
        status: 'completed',
        createdAt: now,
        history: [
          { status: 'pending', at: now },
          { status: 'completed', at: now },
        ],
      },
      {
        buyerId,
        sellerId: seller._id,
        lineItems: [{ productId, name: 'Arepa de queso', price: 6000, quantity: 1 }],
        status: 'cancelled',
        createdAt: now,
        history: [
          { status: 'pending', at: now },
          { status: 'cancelled', at: now },
        ],
      },
    ]);

    const result = await getSellerPanelStats();

    expect(result.status).toBe('ok');
    expect(result.stats.totalOrders).toBe(2);
    expect(result.stats.cancelledOrders).toBe(1);
    expect(result.stats.cancellationRate).toBe(50);
    // Only the completed order counts as a sale / top product.
    expect(result.stats.topProducts).toEqual([{ name: 'Arepa de queso', quantity: 1 }]);
    // Both orders count towards peak hours, cancelled or not.
    const totalPeakHourOrders = result.stats.peakHours.reduce((sum, entry) => sum + entry.orders, 0);
    expect(totalPeakHourOrders).toBe(2);
  });

  it('el resultado es JSON plano, no documentos de Mongoose', async () => {
    signInAs(APPROVED_OWNER_CLERK_ID);
    const result = await getSellerPanelStats();

    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
