// Test data for development.
//
// `seedDatabase()` assumes a Mongoose connection is already open, so the
// tests can call it against an in-memory database. The CLI part below is
// what connects, and only runs if the file is executed directly.
//
// NEVER point this at production: it deletes the collections it seeds.

import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';

import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

// day: 1 = Monday ... 7 = Sunday, same as daysOfWeekES.
const weekdaySchedule = [
  { day: 1, startTime: '08:00', endTime: '16:00' },
  { day: 3, startTime: '08:00', endTime: '16:00' },
  { day: 5, startTime: '10:00', endTime: '18:00' },
];

export async function seedDatabase() {
  // Only the collections it seeds. It touches nothing else.
  await Promise.all([
    Product.deleteMany({}),
    Schedule.deleteMany({}),
    Seller.deleteMany({}),
    User.deleteMany({}),
  ]);

  // clerkId is the key the webhook joins Clerk and Mongo by. The seeded
  // users carry it so the tests resemble reality: in production every user
  // is born from a Clerk `user.created` event.
  const [buyer, approvedOwner, pendingOwner] = await User.create([
    {
      clerkId: 'user_seed_ana',
      name: 'Ana',
      lastName: 'Restrepo',
      email: 'ana.restrepo@example.test',
      role: 'buyer',
    },
    {
      clerkId: 'user_seed_carlos',
      name: 'Carlos',
      lastName: 'Mesa',
      email: 'carlos.mesa@example.test',
      role: 'seller',
    },
    {
      clerkId: 'user_seed_laura',
      name: 'Laura',
      lastName: 'Gómez',
      email: 'laura.gomez@example.test',
      role: 'seller',
    },
  ]);

  // One approved seller and one pending: the public listing must only show
  // the approved one's products, and without the pending one there is no way
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

  // The user points back at its seller profile.
  approvedOwner.sellerId = approvedSeller._id;
  pendingOwner.sellerId = pendingSeller._id;
  await Promise.all([approvedOwner.save(), pendingOwner.save()]);

  // Careful: Product.sellerId stores the Seller id, not the User id, even
  // though the schema declares `ref: 'User'`. The routes populate it with an
  // explicit `model: 'Seller'`. See T-03's PR.
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
    // The e2e uses these ids to navigate straight to a page. Only the approved
    // seller's appear in the public listing.
    ids: {
      approvedSeller: approvedSeller._id.toString(),
      // T-84: the signed-in fixture rewrites this user's clerkId with the id of
      // a real Clerk account, because the one seeded below exists in no
      // instance and would resolve to nobody.
      approvedOwner: approvedOwner._id.toString(),
      pendingSeller: pendingSeller._id.toString(),
      approvedProduct: products
        .find(product => product.sellerId.equals(approvedSeller._id))
        ._id.toString(),
    },
  };
}

// ---------------------------------------------------------------------------
// CLI

function describeTarget(uri) {
  // Do not print the URI: it carries a username and password.
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

  // It deletes the collections it seeds, so outside localhost it demands
  // that somebody typed it on purpose.
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
