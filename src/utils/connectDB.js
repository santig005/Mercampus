import { logger } from '@/lib/logger';
import { connect } from 'mongoose';

// Every model, imported here for the side effect of registering it with
// Mongoose - not used by name below.
//
// Hotfix (2026-09-09): live on the agent/develop preview, GET /marketplace
// and any request to /antojos (including a bare OPTIONS) were intermittently
// throwing `MissingSchemaError: Schema hasn't been registered for model
// "Seller"` from getSellerContextData()'s populate('sellerId'), which the
// root layout calls on every request. ~15-18% of requests failed, not all of
// them - a cold-start-dependent module registration race, not a permanent
// break, which is why it wasn't 100% reproducible.
//
// The codebase had already patched this exact failure mode three times over
// (api/products/route.js, api/products/[id]/route.js, utils/lib/auth.ts),
// each with its own `import { X } from '...'; // eslint-disable-line
// no-unused-vars` - a real side effect (mongoose.model() runs at import time,
// registering the schema) that only protects the one file carrying it. Any
// file that populates a model without its own copy of that import is exposed
// to this bug, and there is no way to grep for the files that are missing
// one - the whole pattern is invisible until it's already broken in
// production. `connectDB()` is the one function every Mongo-touching code
// path already calls before running a query (T-12 and onward), so it is the
// only choke point where "every model is registered" can be guaranteed
// unconditionally instead of file by file. This does not remove the three
// existing defensive imports - they're harmless now, and safer left alone
// while this is fresh - but no new file should ever need to add a fourth.
import '@/utils/models/orderSchema';
import '@/utils/models/pqrsSchema';
import '@/utils/models/productSchema';
import '@/utils/models/scheduleSchema';
import '@/utils/models/sellerSchema2';
import '@/utils/models/userSchema';

const MONGODB_URI = process.env.MONGO_URI;

const connected = {
  isConnected: false,
};

export async function connectDB() {
  if (connected.isConnected) {
    logger.debug('Already connected to the database');
    return;
  }

  const db = await connect(MONGODB_URI);
  connected.isConnected = db.connections[0].readyState;
  logger.debug('Database connected to:', db.connection.db.databaseName);
}
