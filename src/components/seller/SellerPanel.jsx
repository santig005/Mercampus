import { priceFormat } from '@/utils/utilFn';

// T-44. Pure display, so it stays a Server Component (CLAUDE.md): no state,
// no effects, no handlers. The data comes already derived from
// src/server/orders/getSellerPanelStats (which itself reads through the pure
// src/lib/seller-panel-stats, unit tested without a database).
//
// Charts are plain server-rendered bars (a value's width against the max in
// its own section), not a chart library: every value already has a visible
// number next to it, so there is no separate hidden table to keep in sync,
// and a native `title` gives an exact-value tooltip without any client-side
// JS. Deliberately not a hover/crosshair interaction layer - this is a first
// version, and adding one would need a Client Component this data doesn't
// otherwise require.
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC', // the date is already a Bogotá calendar day, not a UTC instant
});

const formatDay = dateKey => DAY_LABEL_FORMAT.format(new Date(`${dateKey}T00:00:00Z`));

const formatHour = hour => `${String(hour).padStart(2, '0')}:00`;

function BarRow({ label, value, valueLabel, max, title, labelClassName = 'w-16' }) {
  const widthPercent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <li className='flex items-center gap-3'>
      <span
        className={`${labelClassName} shrink-0 truncate text-xs text-gray-500 dark:text-base-content/70`}
        title={label}
      >
        {label}
      </span>
      <div
        className='h-2 flex-1 rounded-full bg-base-200 overflow-hidden'
        title={title}
      >
        <div
          className='h-full rounded-full bg-primary-orange'
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className='w-24 shrink-0 text-right text-xs font-medium tabular-nums'>
        {valueLabel}
      </span>
    </li>
  );
}

function StatTile({ label, value, hint }) {
  return (
    <div className='flex flex-col gap-1 rounded bg-base-100 p-4 shadow-md'>
      <span className='text-xs text-gray-500 dark:text-base-content/70'>{label}</span>
      <span className='text-2xl font-semibold'>{value}</span>
      {hint && (
        <span className='text-xs text-gray-500 dark:text-base-content/70'>{hint}</span>
      )}
    </div>
  );
}

function Section({ title, children, empty }) {
  return (
    <section className='flex flex-col gap-3 rounded bg-base-100 p-4 shadow-md'>
      <h3 className='font-semibold'>{title}</h3>
      {empty ? (
        <p className='text-sm text-gray-500 dark:text-base-content/70'>{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

export default function SellerPanel({ stats }) {
  const { salesPerDay, topProducts, peakHours, cancellationRate, totalOrders, cancelledOrders } =
    stats;

  const completedOrders = salesPerDay.reduce((sum, day) => sum + day.orders, 0);
  const totalRevenue = salesPerDay.reduce((sum, day) => sum + day.revenue, 0);
  const maxDailyOrders = Math.max(0, ...salesPerDay.map(day => day.orders));
  const maxProductQuantity = Math.max(0, ...topProducts.map(product => product.quantity));
  const maxHourOrders = Math.max(0, ...peakHours.map(entry => entry.orders));

  return (
    <div className='flex flex-col gap-6 p-4'>
      <h1 className='text-2xl font-bold'>Panel de ventas</h1>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatTile label='Pedidos totales' value={totalOrders} />
        <StatTile
          label='Tasa de cancelación'
          value={`${cancellationRate}%`}
          hint={`${cancelledOrders} de ${totalOrders} pedidos`}
        />
        <StatTile
          label='Ventas (últimos 14 días)'
          value={priceFormat(totalRevenue)}
          hint={`${completedOrders} pedidos completados`}
        />
      </div>

      <Section
        title='Ventas por día (últimos 14 días)'
        empty={
          completedOrders === 0 ? 'Sin ventas completadas en los últimos 14 días.' : null
        }
      >
        <ul className='flex flex-col gap-2'>
          {salesPerDay.map(day => (
            <BarRow
              key={day.date}
              label={formatDay(day.date)}
              value={day.orders}
              max={maxDailyOrders}
              valueLabel={`${day.orders} · ${priceFormat(day.revenue)}`}
              title={`${formatDay(day.date)}: ${day.orders} pedidos, ${priceFormat(day.revenue)}`}
            />
          ))}
        </ul>
      </Section>

      <Section
        title='Productos más pedidos'
        empty={topProducts.length === 0 ? 'Aún no hay productos vendidos.' : null}
      >
        <ul className='flex flex-col gap-2'>
          {topProducts.map(product => (
            <BarRow
              key={product.name}
              label={product.name}
              labelClassName='w-32'
              value={product.quantity}
              max={maxProductQuantity}
              valueLabel={`${product.quantity} unidades`}
              title={`${product.name}: ${product.quantity} unidades vendidas`}
            />
          ))}
        </ul>
      </Section>

      <Section
        title='Horas con más pedidos'
        empty={peakHours.length === 0 ? 'Aún no hay pedidos registrados.' : null}
      >
        <ul className='flex flex-col gap-2'>
          {peakHours.map(entry => (
            <BarRow
              key={entry.hour}
              label={formatHour(entry.hour)}
              value={entry.orders}
              max={maxHourOrders}
              valueLabel={`${entry.orders} pedidos`}
              title={`${formatHour(entry.hour)}: ${entry.orders} pedidos`}
            />
          ))}
        </ul>
      </Section>
    </div>
  );
}
