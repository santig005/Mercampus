import { describe, expect, it } from 'vitest';

import {
  assertValidTransition,
  ORDER_STATUSES,
  transitionOrder,
} from '@/server/orders/stateMachine';

describe('assertValidTransition · camino feliz', () => {
  it('acepta la secuencia completa pending -> ... -> completed', () => {
    const path = [
      'pending',
      'accepted',
      'preparing',
      'delivering',
      'completed',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(() => assertValidTransition(path[i], path[i + 1])).not.toThrow();
    }
  });

  it.each(['pending', 'accepted', 'preparing'])(
    'acepta cancelar desde "%s"',
    status => {
      expect(() => assertValidTransition(status, 'cancelled')).not.toThrow();
    }
  );
});

describe('assertValidTransition · transiciones invalidas', () => {
  it('rechaza saltarse pasos (pending -> delivering)', () => {
    expect(() => assertValidTransition('pending', 'delivering')).toThrow(
      'No se puede pasar de "pending" a "delivering".'
    );
  });

  it('rechaza retroceder (preparing -> accepted)', () => {
    expect(() => assertValidTransition('preparing', 'accepted')).toThrow();
  });

  it('rechaza cancelar un pedido ya en reparto', () => {
    expect(() => assertValidTransition('delivering', 'cancelled')).toThrow();
  });

  it('rechaza cualquier transicion desde un estado terminal', () => {
    for (const terminal of ['completed', 'cancelled']) {
      for (const next of ORDER_STATUSES) {
        if (next === terminal) continue;
        expect(() => assertValidTransition(terminal, next)).toThrow();
      }
    }
  });

  it('la transicion invalida se rechaza con un AppError 409', () => {
    try {
      assertValidTransition('pending', 'completed');
      throw new Error('no debio llegar aqui');
    } catch (error) {
      expect(error.name).toBe('AppError');
      expect(error.status).toBe(409);
    }
  });
});

describe('transitionOrder', () => {
  const buildOrder = () => ({
    status: 'pending',
    history: [{ status: 'pending', at: new Date('2026-01-01') }],
  });

  it('actualiza el estado y agrega una entrada al historial', () => {
    const order = buildOrder();
    transitionOrder(order, 'accepted');

    expect(order.status).toBe('accepted');
    expect(order.history).toHaveLength(2);
    expect(order.history[1].status).toBe('accepted');
  });

  it('no toca el pedido si la transicion es invalida', () => {
    const order = buildOrder();
    expect(() => transitionOrder(order, 'delivering')).toThrow();

    expect(order.status).toBe('pending');
    expect(order.history).toHaveLength(1);
  });
});
