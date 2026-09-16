import { auth } from '@clerk/nextjs/server';

import { buildSellerPanelStats, type SellerPanelStats } from '@/lib/seller-panel-stats';
import { connectDB } from '@/utils/connectDB';
import { Order } from '@/utils/models/orderSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

export type SellerPanelAccess =
  | { status: 'ok'; stats: SellerPanelStats }
  | { status: 'no-session' }
  | { status: 'no-seller' }
  | { status: 'not-approved' };

// T-44. Reads `Order` (and `Seller`/`User` just to resolve identity) straight
// from Mongo - no fetch to our own API, per CLAUDE.md - and writes nothing
// new: every number is derived at read time from documents T-40 already
// writes through transitionOrder().
//
// The three non-'ok' statuses mirror useCheckSeller('sellerApproved', ...)'s
// targets (SellerContext.js) so the page can redirect to the same places
// every other approved-seller-only screen does, without needing a client
// component just to run that check.
export async function getSellerPanelStats(): Promise<SellerPanelAccess> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { status: 'no-session' };

  await connectDB();
  const user = await User.findOne({ clerkId }).select('sellerId').lean();
  if (!user?.sellerId) return { status: 'no-seller' };

  const seller = await Seller.findById(user.sellerId).select('approved').lean();
  if (!seller) return { status: 'no-seller' };
  if (!seller.approved) return { status: 'not-approved' };

  const orders = await Order.find({ sellerId: user.sellerId })
    .select('status createdAt lineItems history')
    .lean();

  return { status: 'ok', stats: buildSellerPanelStats(orders) };
}
