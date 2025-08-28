
import Link from 'next/link';
import { FaHamburger, FaBook, FaHome, FaTicketAlt, FaInstagram } from 'react-icons/fa';

const InfoPage = () => {
  return (
    <div className="bg-white text-gray-800">
      {/* Hero Section */}
      <header className="bg-[#F2F2F2] py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900">
            Mercampus: conecta, compra y vende dentro de tu universidad.
          </h1>
          <p className="text-lg sm:text-xl mt-4">
            La plataforma donde los estudiantes ofrecen y descubren productos, alimentos, servicios y mucho más.
          </p>
          <Link href="/auth/register" className="bg-[#FF7622] text-white py-3 px-8 mt-8 inline-block rounded-lg text-lg font-semibold">
              Únete ahora
          </Link>
        </div>
      </header>

      {/* Problema que resolvemos */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Problema que resolvemos</h2>
          <div className="flex flex-col md:flex-row justify-center gap-8 mt-8">
            <div className="w-full md:w-1/3 p-4 border rounded-lg">
              <p>“No encuentro lo que busco en el campus.”</p>
            </div>
            <div className="w-full md:w-1/3 p-4 border rounded-lg">
              <p>“No tengo tiempo para estar ofreciendo mis productos por WhatsApp.”</p>
            </div>
            <div className="w-full md:w-1/3 p-4 border rounded-lg">
              <p>“Falta un espacio confiable y organizado para comprar y vender.”</p>
            </div>
          </div>
        </div>
      </section>

      {/* Qué es Mercampus */}
      <section className="bg-[#F2F2F2] py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">¿Qué es Mercampus?</h2>
          <p className="text-lg sm:text-xl mt-4">
            Mercampus centraliza los productos y servicios de estudiantes universitarios en un solo lugar. Desde snacks y postres, hasta servicios como tutorías, búsqueda de roommates y artículos varios.
          </p>
          {/* Mockup de la app/plataforma */}
        </div>
      </section>

      {/* Categorías principales */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Categorías principales</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
            <div className="p-4 text-center">
              <FaHamburger className="text-6xl text-[#FF7622] mx-auto" />
              <p className="mt-4 font-semibold">Alimentos</p>
            </div>
            <div className="p-4 text-center">
              <FaBook className="text-6xl text-[#FF7622] mx-auto" />
              <p className="mt-4 font-semibold">Servicios</p>
            </div>
            <div className="p-4 text-center">
              <FaHome className="text-6xl text-[#FF7622] mx-auto" />
              <p className="mt-4 font-semibold">Vida universitaria</p>
            </div>
            <div className="p-4 text-center">
              <FaTicketAlt className="text-6xl text-[#FF7622] mx-auto" />
              <p className="mt-4 font-semibold">Eventos y experiencias</p>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-[#F2F2F2] py-10 sm:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Beneficios</h2>
          <div className="flex flex-col md:flex-row justify-center gap-16">
            <div className="w-full md:w-1/3">
              <h3 className="text-2xl font-bold mb-4 text-center">Para compradores</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Acceso rápido desde el celular</li>
                <li>Filtros y búsqueda optimizada</li>
                <li>Contacto directo y confiable</li>
              </ul>
            </div>
            <div className="w-full md:w-1/3">
              <h3 className="text-2xl font-bold mb-4 text-center">Para vendedores</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Más visibilidad en el campus</li>
                <li>Perfil de vendedor con reseñas</li>
                <li>Gestión simple de productos y horarios</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Cómo funciona</h2>
          <div className="flex flex-col md:flex-row justify-center gap-16 mt-8">
            <div className="w-full md:w-1/4">
              <p className="text-6xl font-bold text-[#FF7622]">1.</p>
              <p className="text-xl mt-2">Regístrate gratis.</p>
            </div>
            <div className="w-full md:w-1/4">
              <p className="text-6xl font-bold text-[#FF7622]">2.</p>
              <p className="text-xl mt-2">Publica o busca lo que necesites.</p>
            </div>
            <div className="w-full md:w-1/4">
              <p className="text-6xl font-bold text-[#FF7622]">3.</p>
              <p className="text-xl mt-2">Conecta y realiza la compra/venta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comunidad y testimonios */}
      <section className="bg-[#F2F2F2] py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Comunidad y testimonios</h2>
          <div className="flex flex-col md:flex-row justify-center gap-8 mt-8">
            <div className="w-full md:w-1/3 p-4 border rounded-lg">
              <p>“Con Mercampus encontré a mi roommate ideal en 2 días”</p>
            </div>
            <div className="w-full md:w-1/3 p-4 border rounded-lg">
              <p>“Pude vender mis postres en toda la U sin usar 10 grupos de WhatsApp”</p>
            </div>
          </div>
        </div>
      </section>

      {/* Crecimiento y vision */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Crecimiento y visión</h2>
          <p className="text-lg sm:text-xl mt-4">
            “Más de 10 millones de estudiantes en LATAM tienen esta necesidad. Mercampus está aquí para transformar la forma en que nos conectamos dentro del campus.”
          </p>
        </div>
      </section>

      {/* Call to Action Final */}
      <section className="bg-[#F2F2F2] py-10 sm:py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Sé parte de Mercampus. Únete y empieza a conectar hoy.</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="/auth/register" className="bg-[#FF7622] text-white py-3 px-8 inline-block rounded-lg text-lg font-semibold">
              Regístrate ahora
            </Link>
            <a href="https://www.instagram.com/mercampus/" target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white py-3 px-8 inline-block rounded-lg text-lg font-semibold">
              <FaInstagram className="inline-block mr-2" /> Síguenos en Instagram
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto text-center px-4">
          <p>&copy; 2025 Mercampus. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default InfoPage;
