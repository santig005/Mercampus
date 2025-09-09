'use client';
import React, { useEffect, useState } from 'react';
import { useSession, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import SellerCard from '@/components/seller/index/SellerCard';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import { updateSeller } from '@/services/sellerService';
import { useAutoAnimate } from '@formkit/auto-animate/react';

export default function AdminSellersPage() {
  const { session, isLoaded } = useSession();
  const { getToken } = useAuth();
  const router = useRouter();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parent] = useAutoAnimate();

  useEffect(() => {
    if (isLoaded && !session) {
      router.push('/auth/login');
      return;
    }

    if (session) {
      fetchSellers();
    }
  }, [session, isLoaded, router]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sellers/admin');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar vendedores');
      }
      
      setSellers(data.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
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
      minute: '2-digit'
    });
  };

  const getApprovalStatus = (seller) => {
    if (seller.approved) {
      return { text: 'Aprobado', color: 'text-green-600 bg-green-100' };
    } else {
      return { text: 'Pendiente', color: 'text-yellow-600 bg-yellow-100' };
    }
  };

  const handleSellerApproval = async (isOn, sellerId) => {
    try {
      // Actualizar estado local primero para feedback inmediato
      setSellers(prevSellers =>
        prevSellers.map(seller =>
          seller._id === sellerId ? { ...seller, approved: !isOn } : seller
        )
      );
      
      // Hacer la llamada a la API
      const token = await getToken({ skipCache: true });
      const response = await updateSeller(sellerId, { approved: !isOn }, token);
      
      if (response.error) {
        // Revertir cambio si hay error
        setSellers(prevSellers =>
          prevSellers.map(seller =>
            seller._id === sellerId ? { ...seller, approved: isOn } : seller
          )
        );
        setError('Error al actualizar el estado del vendedor');
      }
    } catch (error) {
      console.error('Error updating seller:', error);
      // Revertir cambio si hay error
      setSellers(prevSellers =>
        prevSellers.map(seller =>
          seller._id === sellerId ? { ...seller, approved: isOn } : seller
        )
      );
      setError('Error al actualizar el estado del vendedor');
    }
  };

  const handleSellerClick = (sellerId) => {
    router.push(`/antojos/sellers/${sellerId}`);
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-infinity loading-lg bg-primary"></span>
      </div>
    );
  }

  if (!session) {
    return null; // Se redirigirá automáticamente
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Panel de Administración - Vendedores
        </h1>
        <p className="text-gray-600">
          Gestiona todos los vendedores registrados. Ordenados del más nuevo al más antiguo.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Total de vendedores: <span className="font-semibold">{sellers.length}</span>
          </div>
          <button 
            onClick={fetchSellers}
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
          <span className="loading loading-infinity loading-lg bg-primary"></span>
        </div>
      )}

      {/* Sellers Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={parent}>
          {sellers.map((seller) => {
            const approvalStatus = getApprovalStatus(seller);
            return (
              <div key={seller._id} className="bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
                {/* Header con fecha y estado - clickeable */}
                <div 
                  className="flex justify-between items-center p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  onClick={() => handleSellerClick(seller._id)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Registrado:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {formatDate(seller.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${approvalStatus.color}`}>
                      {approvalStatus.text}
                    </span>
                  </div>
                </div>

                {/* Seller Card - clickeable */}
                <div 
                  className="p-3 hover:bg-gray-50 transition-colors"
                  onClick={() => handleSellerClick(seller._id)}
                >
                  <SellerCard seller={seller} />
                </div>

                {/* Footer con universidad y toggle - NO clickeable */}
                <div 
                  className="flex justify-between items-center p-3 border-t border-gray-200 bg-gray-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Universidad:</span>
                    <span className="text-sm font-medium text-gray-700">{seller.university || 'No especificada'}</span>
                  </div>
                  <ToggleSwitch
                    isOn={seller.approved || false}
                    onToggle={() => handleSellerApproval(seller.approved, seller._id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sellers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay vendedores registrados</h3>
          <p className="text-gray-500">Los vendedores aparecerán aquí cuando se registren.</p>
        </div>
      )}
    </div>
  );
}
