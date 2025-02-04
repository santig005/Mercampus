'use client';
import React, { useEffect, useState } from 'react';
import { getSellerProducts,updateProduct } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import { useRouter } from 'next/navigation';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { updateSeller } from "@/services/sellerService";
import { useUser } from "@clerk/nextjs";
import { useSeller } from "@/context/SellerContext";  


export default function EditProductsPage() {
  const [products, setProducts] = useState([]);
  const router = useRouter();

  const [sellerAvailability, setSellerAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { seller, loading: sellerLoading } = useSeller();
  const { user } = useUser();
    
  // Redirect if there is no logged in user
  useEffect(() => {
    if (!user) {
      window.location.href = '/';
    }
  }, [user]);

  // Once the seller context is done loading, check if we have a valid seller
  useEffect(() => {
    if (!sellerLoading) {
      if (seller==false) {
        window.location.href = '/antojos/sellers/register';
      } else {
        if(seller){

        async function fetchSellerProducts() {
          try {
            const response = await getSellerProducts(seller._id);
            setProducts(response.products);
          } catch (error) {
            console.error('Error fetching products:', error);
          } finally {
            setIsLoading(false);
          }
        }

        fetchSellerProducts();
      }
      }
    }
  }, [seller, sellerLoading]);
    

  const handleProductClick = (id) => {
        router.push(`/antojos/sellers/products/edit/${id}`);
  };
  const handleAvailabilityToggle = async (id, currentAvailability) => {
    try {
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === id ? { ...product, availability: !product.availability } : product
        )
      );
      const updatedProduct = await updateProduct(id, { availability: !currentAvailability });
      //if the request is not successful, correct the availability
      if (!updatedProduct) {
        setProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === id ? { ...product, availability: currentAvailability } : product
          )
          );
      }
      
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };
  const handleSellerAvailability = async () => {
    try {
      setSellerAvailability(!sellerAvailability);
      const updatedSeller = await updateSeller(seller._id, { availability: !sellerAvailability });
      //if the request is not successful, correct the availability
      if (!updatedSeller) {
        setSellerAvailability(!sellerAvailability);
      }
    }
    catch (error) {
      console.error('Error updating seller availability:', error);
    }
  };



  if (isLoading||sellerLoading) return <p>Cargando productos...</p>;

  return (
    <div className="p-4">

        <div className="flex justify-end mb-4">
        <h1 className="text-2xl font-bold mb-4">Editar tus Productos</h1>
          <button
            onClick={() => router.push('/antojos/product/add')}
            className="btn btn-primary"
          >
            Añadir Producto
          </button>
        </div>
     
     
      <h2>Edita la disponibilidad de tus productos, o da click en uno en especifico para editar mas detalles</h2>
        <div>
    <div className="flex justify-between items-center p-4 bg-white rounded shadow-md">
      <div>
        <h3 className="text-lg font-semibold">Mi disponibilidad</h3>
        <AvailabilityBadge availability={sellerAvailability} />
      </div>
      <ToggleSwitch
        isOn={sellerAvailability}
        onToggle={handleSellerAvailability}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {products?.map((product) => (
        <div
          key={product._id}
          className="p-4 bg-white rounded shadow-md flex flex-col justify-between"
        >
          <div onClick={() => handleProductClick(product._id)}>
            <ProductCard product={product} isClicked={false} />
          </div>
          <div className="mt-2 flex justify-end">
            <ToggleSwitch
              isOn={product.availability}
              onToggle={() => handleAvailabilityToggle(product._id, product.availability)}
            />
          </div>
        </div>
      ))}
    </div>
  </div>

    </div>
  );
}
