"use client";
import { useRouter } from 'next/navigation';

const sellerProfile = () => {
  const router = useRouter();

  const handleAddProduct = () => {
    router.push('/addproduct'); // Redirigir a la vista para agregar productos
  };

  return (
    <div>
      <h1>Perfil de Vendedor</h1>
      <button onClick={handleAddProduct}>Agregar Producto</button>
    </div>
  );
};

export default sellerProfile;