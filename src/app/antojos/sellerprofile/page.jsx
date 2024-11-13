import Link from 'next/link';

export default function sellerProfile() {
  return (
    <div>
      <h1>Perfil de Vendedor</h1>
      <Link href='/addproduct'>Agregar Producto</Link>
    </div>
  );
}
