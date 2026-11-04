'use client';
import { logger } from '@/lib/logger';
import React, { useEffect, useState } from 'react';
import { useSession } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// T-149: the read-only side of the input T-52 (listing moderation) needs.
// Same shape as /admin/sellers (T-12/T-133) on purpose - plain Spanish, no
// next-intl (see middleware.js's note on why /admin stays out of that
// migration), the same client-side "no session -> /auth/login" redirect
// backed by the middleware's real gate, and the same GET-only admin API
// double-check (/api/reports/admin, T-133's pattern). No resolve/dismiss
// action here: that is T-52's job, not this one's.
const REASON_LABELS = {
  misleading_info: 'Información engañosa o incorrecta',
  wrong_price: 'Precio incorrecto',
  unsafe_or_prohibited: 'Producto inseguro o prohibido',
  offensive_content: 'Contenido ofensivo',
  other: 'Otro',
};

const TARGET_TYPE_LABELS = {
  product: 'Producto',
  seller: 'Vendedor',
};

export default function AdminReportsPage() {
  const { session, isLoaded } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && !session) {
      router.push('/auth/login');
      return;
    }

    if (session) {
      fetchReports();
    }
  }, [session, isLoaded, router]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/reports/admin');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar reportes');
      }

      setReports(data.reports || []);
    } catch (error) {
      logger.error('Error fetching reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-infinity loading-lg bg-primary-orange"></span>
      </div>
    );
  }

  if (!session) {
    return null; // The redirect happens on its own
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-base-content mb-2">
          Panel de Administración - Reportes
        </h1>
        <p className="text-gray-600 dark:text-base-content/70">
          Reportes abiertos de productos y vendedores, del más nuevo al más antiguo.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-base-content/70">
            Reportes abiertos: <span className="font-semibold">{reports.length}</span>
          </div>
          <button
            onClick={fetchReports}
            className="btn btn-sm btn-outline"
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-infinity loading-lg bg-primary-orange"></span>
        </div>
      )}

      {/* Reports Grid */}
      {!loading && !error && (
        <>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-semibold text-gray-600 dark:text-base-content/70 mb-2">
                No hay reportes abiertos
              </h3>
              <p className="text-gray-500 dark:text-base-content/70 max-w-md">
                No hay reportes abiertos en el sistema en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <div key={report._id} className="bg-base-100 shadow-md rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="badge badge-outline">
                      {TARGET_TYPE_LABELS[report.targetType] ?? report.targetType}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-base-content/70">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-base-content">
                    Motivo: {REASON_LABELS[report.reason] ?? report.reason}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-base-content/70 break-all">
                    Id reportado: {report.targetId}
                  </div>
                  {report.details && (
                    <p className="text-sm text-base-content/80 whitespace-pre-wrap">
                      {report.details}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-base-content/70">
                    Reportado por: {report.reporterClerkId ?? 'Anónimo'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
