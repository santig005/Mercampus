import SellerGrid from '@/components/seller/index/SellerGrid';
function Sellers() {
  return (
    <div className='p-2'>
      <h2 className='text-2xl font-bold text-center text-white bg-gradient-to-r from-red-500 to-[#FF7622] py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 mt-4 mb-8'>
        ¡Conoce a los <span className='text-yellow-300'>maestros</span> del
        sabor! 🎉
      </h2>

      <SellerGrid />
    </div>
  );
}

export default Sellers;
