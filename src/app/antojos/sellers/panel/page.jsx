import { redirect } from 'next/navigation';

import SellerPanel from '@/components/seller/SellerPanel';
import { getSellerPanelStats } from '@/server/orders/getSellerPanelStats';

// T-44. Server Component: reads `Order` straight from Mongo
// (src/server/orders/getSellerPanelStats) and writes nothing new. The
// redirects mirror useCheckSeller('sellerApproved', '/antojos/sellers/approving')
// (SellerContext.js) - the same targets every other approved-seller-only
// screen uses - so this page doesn't need a Client Component just to run that
// check.
export default async function SellerPanelPage() {
  const access = await getSellerPanelStats();

  if (access.status === 'no-session') {
    redirect('/auth/login');
  }
  if (access.status === 'no-seller') {
    redirect('/antojos/sellers/register');
  }
  if (access.status === 'not-approved') {
    redirect('/antojos/sellers/approving');
  }

  return <SellerPanel stats={access.stats} />;
}
