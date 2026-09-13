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

describe('orderSchema · campos requeridos', () => {
  it('acepta un pedido con los campos minimos', () => {
    const doc = buildOrder();
    expect(doc.validateSync()).toBeUndefined();
  });

  it('rechaza un pedido sin buyerId', () => {
    const doc = buildOrder({ buyerId: undefined });
    expect(doc.validateSync()?.errors?.buyerId).toBeDefined();
  });

  it('rechaza un pedido sin sellerId', () => {
    const doc = buildOrder({ sellerId: undefined });
    expect(doc.validateSync()?.errors?.sellerId).toBeDefined();
  });

  it('rechaza un pedido sin lineItems', () => {
    const doc = buildOrder({ lineItems: [] });
    expect(doc.validateSync()?.errors?.lineItems).toBeDefined();
  });

  it('rechaza una linea con cantidad menor a 1', () => {
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

  it('rechaza un status fuera del enum', () => {
    const doc = buildOrder({ status: 'enviado' });
    expect(doc.validateSync()?.errors?.status).toBeDefined();
  });
});

describe('orderSchema · valores por defecto', () => {
  it('arranca en "pending" con una primera entrada de historial', () => {
    const doc = buildOrder();
    expect(doc.status).toBe('pending');
    expect(doc.history).toHaveLength(1);
    expect(doc.history[0].status).toBe('pending');
  });
});
