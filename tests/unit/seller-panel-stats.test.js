import { describe, expect, it } from 'vitest';

import { buildSellerPanelStats } from '@/lib/seller-panel-stats';

// Bogotá is UTC-5. 2026-09-16T20:00:00Z is 2026-09-16 15:00 in Bogotá.
const NOW = new Date('2026-09-16T20:00:00Z');

const order = overrides => ({
  status: 'completed',
  createdAt: '2026-09-16T14:00:00Z', // 09:00 Bogotá
  lineItems: [{ name: 'Arepa de queso', price: 5000, quantity: 2 }],
  history: [
    { status: 'pending', at: '2026-09-16T14:00:00Z' },
    { status: 'completed', at: '2026-09-16T15:00:00Z' },
  ],
  ...overrides,
});

describe('buildSellerPanelStats (T-44)', () => {
  it('sin pedidos, todo sale en cero', () => {
    const stats = buildSellerPanelStats([], { now: NOW });

    expect(stats.totalOrders).toBe(0);
    expect(stats.cancelledOrders).toBe(0);
    expect(stats.cancellationRate).toBe(0);
    expect(stats.topProducts).toEqual([]);
    expect(stats.peakHours).toEqual([]);
    expect(stats.salesPerDay).toHaveLength(14);
    expect(stats.salesPerDay.every(day => day.orders === 0 && day.revenue === 0)).toBe(true);
  });

  it('la tasa de cancelacion cuenta todos los pedidos, no solo los completados', () => {
    const stats = buildSellerPanelStats(
      [order(), order({ status: 'cancelled' }), order({ status: 'pending' })],
      { now: NOW }
    );

    expect(stats.totalOrders).toBe(3);
    expect(stats.cancelledOrders).toBe(1);
    expect(stats.cancellationRate).toBe(33); // 1/3 redondeado
  });

  it('un pedido cancelado no cuenta como venta ni aporta ingreso', () => {
    const stats = buildSellerPanelStats([order({ status: 'cancelled' })], { now: NOW });

    const today = stats.salesPerDay.at(-1);
    expect(today.orders).toBe(0);
    expect(today.revenue).toBe(0);
    expect(stats.topProducts).toEqual([]);
  });

  it('un pedido completado se agrupa por el dia en que se completo, no en el que se creo', () => {
    // Created just before midnight Bogotá, completed the next day.
    const lateOrder = order({
      createdAt: '2026-09-16T04:30:00Z', // 2026-09-15 23:30 Bogotá
      history: [
        { status: 'pending', at: '2026-09-16T04:30:00Z' },
        { status: 'completed', at: '2026-09-16T06:00:00Z' }, // 2026-09-16 01:00 Bogotá
      ],
    });

    const stats = buildSellerPanelStats([lateOrder], { now: NOW });
    const completedDay = stats.salesPerDay.find(day => day.orders > 0);

    expect(completedDay.date).toBe('2026-09-16');
  });

  it('un pedido completado fuera de la ventana de 14 dias no se cuenta', () => {
    const oldOrder = order({
      createdAt: '2026-01-01T14:00:00Z',
      history: [
        { status: 'pending', at: '2026-01-01T14:00:00Z' },
        { status: 'completed', at: '2026-01-01T15:00:00Z' },
      ],
    });

    const stats = buildSellerPanelStats([oldOrder], { now: NOW });

    expect(stats.salesPerDay.every(day => day.orders === 0)).toBe(true);
    // Pero si cuenta para la tasa de cancelacion / el total, que es historico.
    expect(stats.totalOrders).toBe(1);
  });

  it('suma las cantidades de un mismo producto entre varios pedidos', () => {
    const stats = buildSellerPanelStats(
      [
        order({ lineItems: [{ name: 'Arepa de queso', price: 5000, quantity: 2 }] }),
        order({ lineItems: [{ name: 'Arepa de queso', price: 5000, quantity: 1 }] }),
        order({ lineItems: [{ name: 'Buñuelo', price: 2500, quantity: 5 }] }),
      ],
      { now: NOW }
    );

    expect(stats.topProducts[0]).toEqual({ name: 'Buñuelo', quantity: 5 });
    expect(stats.topProducts[1]).toEqual({ name: 'Arepa de queso', quantity: 3 });
  });

  it('respeta el limite de productos top', () => {
    const orders = ['A', 'B', 'C'].map(name =>
      order({ lineItems: [{ name, price: 1000, quantity: 1 }] })
    );

    const stats = buildSellerPanelStats(orders, { now: NOW, topProductsLimit: 2 });

    expect(stats.topProducts).toHaveLength(2);
  });

  it('las horas pico cuentan todos los pedidos, no solo los completados', () => {
    const stats = buildSellerPanelStats(
      [
        order({ status: 'pending', createdAt: '2026-09-16T14:00:00Z' }), // 09:00 Bogotá
        order({ status: 'cancelled', createdAt: '2026-09-16T14:30:00Z' }), // 09:30 Bogotá
      ],
      { now: NOW }
    );

    expect(stats.peakHours[0]).toEqual({ hour: 9, orders: 2 });
  });

  it('ordena las horas pico de mayor a menor', () => {
    const stats = buildSellerPanelStats(
      [
        order({ createdAt: '2026-09-16T14:00:00Z' }), // 09:00
        order({ createdAt: '2026-09-16T14:10:00Z' }), // 09:00
        order({ createdAt: '2026-09-16T17:00:00Z' }), // 12:00
      ],
      { now: NOW }
    );

    expect(stats.peakHours[0]).toEqual({ hour: 9, orders: 2 });
    expect(stats.peakHours[1]).toEqual({ hour: 12, orders: 1 });
  });

  it('la ventana de dias por defecto es 14 e incluye el dia de hoy', () => {
    const stats = buildSellerPanelStats([order()], { now: NOW });

    expect(stats.salesPerDay).toHaveLength(14);
    expect(stats.salesPerDay.at(-1).date).toBe('2026-09-16');
    expect(stats.salesPerDay.at(-1).orders).toBe(1);
    expect(stats.salesPerDay.at(-1).revenue).toBe(10000);
  });
});
