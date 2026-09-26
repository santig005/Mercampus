import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { Order } from '@/utils/models/orderSchema';

const buildOrder = overrides =>
  new Order({
    buyerId: new mongoose.Types.ObjectId(),
    sellerId: new mongoose.Types.ObjectId(),
    lineItems: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Arepa de queso',
        price: 5000,
        quantity: 2,
      },
    ],
    ...overrides,
  });

describe('orderSchema · required fields', () => {
  it('accepts an order with the minimum fields', () => {
    const doc = buildOrder();
    expect(doc.validateSync()).toBeUndefined();
  });

  it('rejects an order with no buyerId', () => {
    const doc = buildOrder({ buyerId: undefined });
    expect(doc.validateSync()?.errors?.buyerId).toBeDefined();
  });

  it('rejects an order with no sellerId', () => {
    const doc = buildOrder({ sellerId: undefined });
    expect(doc.validateSync()?.errors?.sellerId).toBeDefined();
  });

  it('rejects an order with no lineItems', () => {
    const doc = buildOrder({ lineItems: [] });
    expect(doc.validateSync()?.errors?.lineItems).toBeDefined();
  });

  it('rejects a line with quantity less than 1', () => {
    const doc = buildOrder({
      lineItems: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: 'Arepa de queso',
          price: 5000,
          quantity: 0,
        },
      ],
    });
    expect(doc.validateSync()?.errors?.['lineItems.0.quantity']).toBeDefined();
  });

  it('rejects a status outside the enum', () => {
    const doc = buildOrder({ status: 'enviado' });
    expect(doc.validateSync()?.errors?.status).toBeDefined();
  });
});

describe('orderSchema · default values', () => {
  it('starts at "pending" with a first history entry', () => {
    const doc = buildOrder();
    expect(doc.status).toBe('pending');
    expect(doc.history).toHaveLength(1);
    expect(doc.history[0].status).toBe('pending');
  });
});
