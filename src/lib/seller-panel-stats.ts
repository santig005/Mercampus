import { BOGOTA_OFFSET_HOURS } from '@/lib/store-availability';

// T-44. Pure aggregation over `Order` documents for the seller panel: sales
// per day, top-ordered products, peak hours and cancellation rate. Lives
// apart from the Mongo read (src/server/orders/getSellerPanelStats.ts) so the
// bucketing rules are unit-testable without a database - same split T-72 used
// for src/lib/profile-completeness.ts. Reads only; writes nothing new.

export type SellerPanelLineItem = {
  name: string;
  price: number;
  quantity: number;
};

export type SellerPanelHistoryEntry = {
  status: string;
  at: Date | string;
};

export type SellerPanelOrder = {
  status: string;
  createdAt: Date | string;
  lineItems: SellerPanelLineItem[];
  history: SellerPanelHistoryEntry[];
};

export type DailySales = {
  /** 'YYYY-MM-DD', a Bogotá calendar day. */
  date: string;
  orders: number;
  revenue: number;
};

export type TopProduct = {
  name: string;
  quantity: number;
};

export type PeakHour = {
  /** 0-23, Bogotá local hour. */
  hour: number;
  orders: number;
};

export type SellerPanelStats = {
  salesPerDay: DailySales[];
  topProducts: TopProduct[];
  peakHours: PeakHour[];
  /** 0-100, rounded. */
  cancellationRate: number;
  totalOrders: number;
  cancelledOrders: number;
};

export type SellerPanelStatsOptions = {
  now?: Date;
  windowDays?: number;
  topProductsLimit?: number;
  peakHoursLimit?: number;
};

const toDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

// Colombia has no daylight saving (same reasoning as store-availability.ts's
// bogotaClock): a fixed offset is enough to bucket a UTC timestamp into the
// calendar day/hour the seller actually experienced, instead of the runtime's
// timezone (UTC on Vercel).
const toBogota = (value: Date | string): Date =>
  new Date(toDate(value).getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000);

const bogotaDateKey = (value: Date | string): string =>
  toBogota(value).toISOString().slice(0, 10);

const bogotaHour = (value: Date | string): number => toBogota(value).getUTCHours();

const orderRevenue = (order: SellerPanelOrder): number =>
  order.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

// The day an order counts as a sale is the day it actually completed (from
// history), not the day it was placed - an order placed at 11pm and accepted
// the next morning belongs to the day it closed. Falls back to createdAt for
// the case (should never happen: transitionOrder always logs history) of a
// completed order with no matching entry.
const completionDate = (order: SellerPanelOrder): Date | string => {
  const completedEntry = [...order.history].reverse().find(entry => entry.status === 'completed');
  return completedEntry?.at ?? order.createdAt;
};

function buildSalesPerDay(
  orders: SellerPanelOrder[],
  now: Date,
  windowDays: number
): DailySales[] {
  const days: DailySales[] = [];
  const byDate = new Map<string, DailySales>();

  for (let i = windowDays - 1; i >= 0; i--) {
    const date = bogotaDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    const entry: DailySales = { date, orders: 0, revenue: 0 };
    days.push(entry);
    byDate.set(date, entry);
  }

  // "Sales" means orders that actually closed - a pending or cancelled order
  // never happened as a sale, so it neither counts nor contributes revenue.
  const completed = orders.filter(order => order.status === 'completed');
  for (const order of completed) {
    const bucket = byDate.get(bogotaDateKey(completionDate(order)));
    if (!bucket) continue; // completed outside the window
    bucket.orders += 1;
    bucket.revenue += orderRevenue(order);
  }

  return days;
}

function buildTopProducts(orders: SellerPanelOrder[], limit: number): TopProduct[] {
  const byName = new Map<string, number>();

  // Same "completed only" rule as sales per day: a cancelled order's line
  // items were never actually sold.
  const completed = orders.filter(order => order.status === 'completed');
  for (const order of completed) {
    for (const item of order.lineItems) {
      byName.set(item.name, (byName.get(item.name) ?? 0) + item.quantity);
    }
  }

  return [...byName.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildPeakHours(orders: SellerPanelOrder[], limit: number): PeakHour[] {
  // Unlike sales/top products, peak hours is about when demand arrives, not
  // only what eventually got fulfilled - so every order counts here,
  // regardless of status.
  const counts = new Array(24).fill(0);
  for (const order of orders) {
    counts[bogotaHour(order.createdAt)] += 1;
  }

  return counts
    .map((orderCount, hour) => ({ hour, orders: orderCount }))
    .filter(entry => entry.orders > 0)
    .sort((a, b) => b.orders - a.orders || a.hour - b.hour)
    .slice(0, limit);
}

export function buildSellerPanelStats(
  orders: SellerPanelOrder[],
  options: SellerPanelStatsOptions = {}
): SellerPanelStats {
  const {
    now = new Date(),
    windowDays = 14,
    topProductsLimit = 5,
    peakHoursLimit = 5,
  } = options;

  const totalOrders = orders.length;
  const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;

  return {
    salesPerDay: buildSalesPerDay(orders, now, windowDays),
    topProducts: buildTopProducts(orders, topProductsLimit),
    peakHours: buildPeakHours(orders, peakHoursLimit),
    cancellationRate: totalOrders === 0 ? 0 : Math.round((cancelledOrders / totalOrders) * 100),
    totalOrders,
    cancelledOrders,
  };
}
