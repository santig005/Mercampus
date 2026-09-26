import { describe, expect, it } from 'vitest';

import {
  assertValidTransition,
  ORDER_STATUSES,
  transitionOrder,
} from '@/server/orders/stateMachine';

describe('assertValidTransition · happy path', () => {
  it('accepts the full sequence pending -> ... -> completed', () => {
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
    'accepts cancelling from "%s"',
    status => {
      expect(() => assertValidTransition(status, 'cancelled')).not.toThrow();
    }
  );
});

describe('assertValidTransition · invalid transitions', () => {
  it('rejects skipping steps (pending -> delivering)', () => {
    expect(() => assertValidTransition('pending', 'delivering')).toThrow(
      'No se puede pasar de "pending" a "delivering".'
    );
  });

  it('rejects going backwards (preparing -> accepted)', () => {
    expect(() => assertValidTransition('preparing', 'accepted')).toThrow();
  });

  it('rejects cancelling an order already out for delivery', () => {
    expect(() => assertValidTransition('delivering', 'cancelled')).toThrow();
  });

  it('rejects any transition from a terminal state', () => {
    for (const terminal of ['completed', 'cancelled']) {
      for (const next of ORDER_STATUSES) {
        if (next === terminal) continue;
        expect(() => assertValidTransition(terminal, next)).toThrow();
      }
    }
  });

  it('the invalid transition is rejected with an AppError 409', () => {
    try {
      assertValidTransition('pending', 'completed');
      throw new Error('should not have reached here');
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

  it('updates the status and adds a history entry', () => {
    const order = buildOrder();
    transitionOrder(order, 'accepted');

    expect(order.status).toBe('accepted');
    expect(order.history).toHaveLength(2);
    expect(order.history[1].status).toBe('accepted');
  });

  it('does not touch the order if the transition is invalid', () => {
    const order = buildOrder();
    expect(() => transitionOrder(order, 'delivering')).toThrow();

    expect(order.status).toBe('pending');
    expect(order.history).toHaveLength(1);
  });
});
