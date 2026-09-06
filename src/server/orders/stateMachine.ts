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

// Cancelacion solo hasta "preparing": una vez el pedido esta "delivering" ya
// hay alguien en camino, y revertir eso es un problema logistico, no de datos.
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

// Unico punto de escritura de `status`: nunca se asigna a mano en otro sitio,
// para que el historial y el estado actual no puedan desincronizarse.
export function transitionOrder(order: OrderLike, next: OrderStatus): void {
  assertValidTransition(order.status, next);
  order.history.push({ status: next, at: new Date() });
  order.status = next;
}
