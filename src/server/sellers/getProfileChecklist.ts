import { auth } from '@clerk/nextjs/server';

import { buildProfileChecklist, type ProfileChecklist } from '@/lib/profile-completeness';
import { connectDB } from '@/utils/connectDB';
import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

// T-72. Reads Mongo directly from a Server Component - no fetch to our own
// API, per CLAUDE.md. Returns null for anyone who isn't a seller (a visitor,
// or a user whose seller profile doesn't exist yet) rather than throwing: the
// page renders for them too, and the client redirect decides where they go.
export async function getProfileChecklist(): Promise<ProfileChecklist | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await connectDB();
  const user = await User.findOne({ clerkId }).select('sellerId').lean();
  if (!user?.sellerId) return null;

  const seller = await Seller.findById(user.sellerId)
    .select('logo description')
    .lean();
  if (!seller) return null;

  // countDocuments, not find(): the checklist only asks "is there at least
  // one?", and both collections are indexed by sellerId.
  const [scheduleCount, productCount] = await Promise.all([
    Schedule.countDocuments({ sellerId: user.sellerId }),
    Product.countDocuments({ sellerId: user.sellerId }),
  ]);

  return buildProfileChecklist({
    logo: seller.logo,
    description: seller.description,
    scheduleCount,
    productCount,
  });
}
