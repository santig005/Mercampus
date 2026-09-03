// Datos de prueba para desarrollo.
//
// `seedDatabase()` asume que ya hay una conexión de Mongoose abierta, para que
// los tests puedan llamarla contra una base en memoria. La parte de CLI de
// abajo es la que conecta, y solo se ejecuta si el archivo se corre directo.
//
// NUNCA apuntes esto a producción: borra las colecciones que siembra.

import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';

import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

// day: 1 = lunes ... 7 = domingo, igual que daysOfWeekES.
const weekdaySchedule = [
  { day: 1, startTime: '08:00', endTime: '16:00' },
  { day: 3, startTime: '08:00', endTime: '16:00' },
  { day: 5, startTime: '10:00', endTime: '18:00' },
];

export async function seedDatabase() {
  // Solo las colecciones que siembra. No toca nada más.
  await Promise.all([
    Product.deleteMany({}),
    Schedule.deleteMany({}),
    Seller.deleteMany({}),
    User.deleteMany({}),
  ]);

  const [buyer, approvedOwner, pendingOwner] = await User.create([
    {
      name: 'Ana',
      lastName: 'Restrepo',
      email: 'ana.restrepo@example.test',
      role: 'buyer',
    },
    {
      name: 'Carlos',
      lastName: 'Mesa',
      email: 'carlos.mesa@example.test',
      role: 'seller',
    },
    {
      name: 'Laura',
      lastName: 'Gómez',
      email: 'laura.gomez@example.test',
      role: 'seller',
    },
  ]);

  // Un vendedor aprobado y uno pendiente: el listado público solo debe mostrar
  // los productos del aprobado, y sin el pendiente no hay forma de probarlo.
  const [approvedSeller, pendingSeller] = await Seller.create([
    {
      businessName: 'Arepas El Parche',
      slogan: 'De la plancha a tu clase',
      description: 'Arepas y fritos recién hechos entre clases.',
      phoneNumber: 3001234567,
      userId: approvedOwner._id,
      approved: true,
      university: 'Universidad EAFIT',
    },
    {
      businessName: 'Postres Laura',
      slogan: 'Dulce de verdad',
      description: 'Repostería casera por encargo.',
      phoneNumber: 3009876543,
      userId: pendingOwner._id,
      approved: false,
      university: 'Universidad EIA',
    },
  ]);

  // El usuario apunta de vuelta a su perfil de vendedor.
  approvedOwner.sellerId = approvedSeller._id;
  pendingOwner.sellerId = pendingSeller._id;
  await Promise.all([approvedOwner.save(), pendingOwner.save()]);

  // Ojo: Product.sellerId guarda el id del Seller, no el del User, pese a que
  // el schema declare `ref: 'User'`. Las rutas lo pueblan con
  // `model: 'Seller'` explícito. Ver el PR de T-03.
  const products = await Product.create([
    {
      name: 'Arepa de queso',
      price: 6000,
      description: 'Arepa de maíz con queso costeño derretido.',
      images: ['https://ik.imagekit.io/seed/arepa.jpg'],
      section: 'antojos',
      category: ['Comida rápida'],
      sellerId: approvedSeller._id,
      availability: true,
    },
    {
      name: 'Buñuelo',
      price: 2500,
      description: 'Buñuelo recién frito, crocante por fuera.',
      images: ['https://ik.imagekit.io/seed/bunuelo.jpg'],
      section: 'antojos',
      category: ['Frituras'],
      sellerId: approvedSeller._id,
      availability: true,
    },
    {
      name: 'Jugo de mango',
      price: 5000,
      description: 'Jugo natural de mango, sin azúcar añadida.',
      images: ['https://ik.imagekit.io/seed/jugo.jpg'],
      section: 'antojos',
      category: ['Frutas'],
      sellerId: approvedSeller._id,
      availability: false,
    },
    {
      name: 'Termo Mercampus',
      price: 45000,
      description: 'Termo de acero de 500 ml con el logo de Mercampus.',
      images: ['https://ik.imagekit.io/seed/termo.jpg'],
      section: 'marketplace',
      category: ['Termos'],
      sellerId: approvedSeller._id,
      availability: true,
    },
    {
      name: 'Brownie de chocolate',
      price: 7000,
      description: 'Brownie húmedo con nueces.',
      images: ['https://ik.imagekit.io/seed/brownie.jpg'],
      section: 'antojos',
      category: ['Repostería'],
      sellerId: pendingSeller._id,
      availability: true,
    },
    {
      name: 'Galletas de avena',
      price: 4000,
      description: 'Paquete de tres galletas de avena y pasas.',
      images: ['https://ik.imagekit.io/seed/galletas.jpg'],
      section: 'antojos',
      category: ['Galletas'],
      sellerId: pendingSeller._id,
      availability: true,
    },
  ]);

  const schedules = await Schedule.create(
    [approvedSeller, pendingSeller].flatMap(seller =>
      weekdaySchedule.map(slot => ({ ...slot, sellerId: seller._id }))
    )
  );

  return {
    users: [buyer, approvedOwner, pendingOwner].length,
    sellers: 2,
    approvedSellers: 1,
    products: products.length,
    schedules: schedules.length,
  };
}

// ---------------------------------------------------------------------------
// CLI

function describeTarget(uri) {
  // No imprimas la URI: lleva usuario y contraseña.
  const { host, pathname } = new URL(uri.replace(/^mongodb\+srv:/, 'mongodb:'));
  return { host, database: pathname.replace(/^\//, '') || '(por defecto)' };
}

async function main() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('seed: falta MONGO_URI. Copia .env.example a .env y rellénalo.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('seed: NODE_ENV=production. Cancelado.');
    process.exit(1);
  }

  const { host, database } = describeTarget(uri);
  const isLocal = /^(localhost|127\.0\.0\.1)/.test(host);
  const confirmed = process.argv.includes('--yes');

  console.log(`seed: destino ${host}/${database}`);

  // Borra las colecciones que siembra, así que fuera de localhost exige que
  // alguien lo haya escrito a propósito.
  if (!isLocal && !confirmed) {
    console.error(
      'seed: el destino no es local y borra datos. Repite con --yes si de verdad\n' +
        '      es un cluster de desarrollo. NUNCA lo corras contra producción.'
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const summary = await seedDatabase();
    console.log('seed: listo', summary);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
