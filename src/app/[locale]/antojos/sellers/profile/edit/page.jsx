import EditSellerForm from '@/components/seller/EditSellerForm';
import { getProfileChecklist } from '@/server/sellers/getProfileChecklist';

// T-72. The page is a Server Component now: it reads the profile checklist
// straight from Mongo (src/server/, no fetch to our own API) and hands it to
// the form, which stays a Client Component because it is all state and
// handlers. `getProfileChecklist` returns null for anyone without a seller
// profile - the form's own useCheckSeller decides where to send them.
//
// T-81 (seller profile/schedule zone): moved from
// src/app/antojos/sellers/profile/edit/ (deleted). No `params` needed - this
// stays a Client Component tree, so no setRequestLocale call either;
// src/app/[locale]/layout.jsx already covers the whole subtree.
export default async function EditSellerProfilePage() {
  const checklist = await getProfileChecklist();

  return <EditSellerForm checklist={checklist} />;
}
