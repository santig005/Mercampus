'use client';
import React, { useEffect, useState } from 'react';
import { useSeller } from '@/context/SellerContext';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar componentes de ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function SellerDashboard() {
  const { seller, loading: sellerLoading } = useSeller();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // Por defecto 7 días
  const [productFilter, setProductFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [dateStats, setDateStats] = useState([]);
  const [hourStats, setHourStats] = useState([]);

  useEffect(() => {
    // Redireccionar si no es un vendedor aprobado
    if (!sellerLoading && (!seller || !seller.approved)) {
      router.push('/antojos');
    }
  }, [seller, sellerLoading, router]);

  useEffect(() => {
    if (seller?._id) {
      fetchEvents();
      fetchCategoryStats();
      fetchDateStats();
    }
  }, [seller, dateRange, productFilter, sourceFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/product?sellerId=${seller._id}`);
      const data = await res.json();
      
      if (data.events) {
        let filteredEvents = data.events;
        
        // Filtrar por fecha
        if (dateRange !== 'all') {
          const daysAgo = parseInt(dateRange);
          const startDate = subDays(new Date(), daysAgo);
          filteredEvents = filteredEvents.filter(event => 
            new Date(event.eventTimestamp) >= startDate
          );
        }
        
        // Filtrar por producto
        if (productFilter !== 'all') {
          filteredEvents = filteredEvents.filter(event => 
            event.productId._id === productFilter
          );
        }
        
        // Filtrar por fuente
        if (sourceFilter !== 'all') {
          filteredEvents = filteredEvents.filter(event => 
            event.source === sourceFilter
          );
        }
        
        setEvents(filteredEvents);
        
        // Procesar estadísticas por hora
        const hourCounts = new Array(24).fill(0);
        filteredEvents.forEach(event => {
          const hour = new Date(event.eventTimestamp).getHours();
          hourCounts[hour]++;
        });
        
        const hourStats = hourCounts.map((count, hour) => ({
          hour: `${hour}:00`,
          count
        }));
        setHourStats(hourStats);
        
        // Extraer lista única de productos
        const uniqueProducts = [...new Map(
          data.events.map(event => [event.productId._id, event.productId])
        ).values()];
        setProducts(uniqueProducts);
      }
    } catch (error) {
      console.error('Error al obtener eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch(`/api/events/product/category?sellerId=${seller._id}`);
      const data = await res.json();
      
      if (data.categoryStats) {
        setCategoryStats(data.categoryStats);
      }
    } catch (error) {
      console.error('Error al obtener estadísticas por categoría:', error);
    }
  };

  const fetchDateStats = async () => {
    try {
      const days = dateRange === 'all' ? 90 : parseInt(dateRange);
      const res = await fetch(`/api/events/product/date?sellerId=${seller._id}&days=${days}`);
      const data = await res.json();
      
      if (data.dateStats) {
        setDateStats(data.dateStats);
      }
    } catch (error) {
      console.error('Error al obtener estadísticas por fecha:', error);
    }
  };

  // Preparar datos para gráficos
  const prepareChartData = () => {
    // Datos para gráfico por fuente
    const sourceData = {
      labels: ['WhatsApp'],
      datasets: [{
        label: 'Contactos por fuente',
        data: [
          events.filter(e => e.source === 'whatsapp').length,
          events.filter(e => e.source === 'phone_call').length,
          events.filter(e => e.source === 'email_contact').length
        ],
        backgroundColor: ['#25D366', '#0088cc', '#EA4335'],
      }]
    };
    
    // Datos para gráfico por producto
    const productLabels = products.map(p => p.name);
    const productCounts = products.map(p => 
      events.filter(e => e.productId._id === p._id).length
    );
    
    const productData = {
      labels: productLabels,
      datasets: [{
        label: 'Contactos por producto',
        data: productCounts,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };
    
    // Datos para gráfico por categoría
    const categoryLabels = categoryStats.map(c => c.category);
    const categoryCounts = categoryStats.map(c => c.count);
    
    const categoryData = {
      labels: categoryLabels,
      datasets: [{
        label: 'Contactos por categoría',
        data: categoryCounts,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
          '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E'
        ],
        borderWidth: 1
      }]
    };
    
    // Datos para gráfico por fecha
    const dateLabels = dateStats.map(d => {
      const date = parseISO(d.date);
      return format(date, 'dd MMM', {locale: es});
    });
    
    const dateCounts = dateStats.map(d => d.count);
    
    const timeData = {
      labels: dateLabels,
      datasets: [{
        label: 'Contactos por día',
        data: dateCounts,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
    
    // Datos para gráfico por hora
    const hourLabels = hourStats.map(h => h.hour);
    const hourCounts = hourStats.map(h => h.count);
    
    const hourData = {
      labels: hourLabels,
      datasets: [{
        label: 'Contactos por hora',
        data: hourCounts,
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }]
    };
    
    return { sourceData, productData, categoryData, timeData, hourData };
  };

  if (sellerLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!seller || !seller.approved) {
    return null; // No renderizar nada si no es vendedor aprobado
  }

  const { sourceData, productData, categoryData, timeData, hourData } = events.length ? prepareChartData() : 
    { sourceData: null, productData: null, categoryData: null, timeData: null, hourData: null };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Vendedor</h1>
      
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Rango de fechas</label>
          <select 
            className="select select-bordered w-full" 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Producto</label>
          <select 
            className="select select-bordered w-full"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="all">Todos los productos</option>
            {products.map(product => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Fuente de contacto</label>
          <select 
            className="select select-bordered w-full"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Todas las fuentes</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone_call">Llamada</option>
            <option value="email_contact">Email</option>
          </select>
        </div>
      </div>
      
      {/* Resumen de estadísticas */}
      <div className="stats shadow w-full mb-6">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          <div className="stat-title">Total de Contactos</div>
          <div className="stat-value text-primary">{events.length}</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div className="stat-title">Productos Contactados</div>
          <div className="stat-value text-secondary">{new Set(events.map(e => e.productId._id)).size}</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
          </div>
          <div className="stat-title">WhatsApp</div>
          <div className="stat-value">{events.filter(e => e.source === 'whatsapp').length}</div>
        </div>
      </div>
      
      {/* Gráficos */}
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contactos por Producto</h2>
              <div className="h-80">
                <Bar data={productData} options={{maintainAspectRatio: false}} />
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contactos por Fuente</h2>
              <div className="h-80">
                <Pie data={sourceData} options={{maintainAspectRatio: false}} />
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contactos por Categoría</h2>
              <div className="h-80">
                <Doughnut data={categoryData} options={{maintainAspectRatio: false}} />
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contactos por Fecha</h2>
              <div className="h-80">
                <Line data={timeData} options={{
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        title: function(context) {
                          return context[0].label;
                        },
                        label: function(context) {
                          return `Contactos: ${context.raw}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }} />
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contactos por Hora del Día</h2>
              <div className="h-80">
                <Bar data={hourData} options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Número de contactos'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Hora del día'
                      }
                    }
                  }
                }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl">No hay datos disponibles para mostrar</p>
          <p>Los contactos a tus productos aparecerán aquí cuando los clientes hagan clic en los botones de contacto.</p>
        </div>
      )}
    </div>
  );
} 