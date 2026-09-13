import { AppError } from '@/utils/lib/errors';

export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'delivering',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrderLike {
  status: OrderStatus;
  history: Array<{ status: OrderStatus; at: Date }>;
}

// Cancellation only up to "preparing": once the order is "delivering"
// somebody is already on their way, and undoing that is a logistics problem,
// not a data one.
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['delivering', 'cancelled'],
  delivering: ['completed'],
  completed: [],
  cancelled: [],
};

export function assertValidTransition(
  current: OrderStatus,
  next: OrderStatus
): void {
  if (!TRANSITIONS[current].includes(next)) {
    throw new AppError(
      `No se puede pasar de "${current}" a "${next}".`,
      409
    );
  }
}

// The only place `status` is written: it is never assigned by hand anywhere
// else, so the history and the current state can't drift apart.
export function transitionOrder(order: OrderLike, next: OrderStatus): void {
  assertValidTransition(order.status, next);
  order.history.push({ status: next, at: new Date() });
  order.status = next;
}
