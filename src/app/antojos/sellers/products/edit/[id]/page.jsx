import { notFound } from 'next/navigation';

import EditProductForm from '@/components/products/edit/EditProductForm';
import { logger } from '@/lib/logger';
import { getProductForEdit } from '@/server/products/getProductForEdit';

// T-97 (audit findings F28 and F29). This screen used to be one big client
// component that fetched GET /api/products/[id] on mount and, when anything
// went wrong, rendered `Error al cargar los detalles del producto.` as a naked
// paragraph: no header band, no form, no link back, and a URL still claiming
// to be editing a product. Three different failures arrived that way - an
// unknown id (404), a malformed id (500 with Mongoose's CastError in the
// body), and a product whose owner is not publicly visible (500, because that
// route populates the owner behind a filter and the client never got an
// answer to check ownership against).
//
// Same shape as T-90's fix for F1/F2: resolve on the server, before anything
// is sent, and 404 instead of rendering a screen around nothing.
export default async function EditProductPage({ params }) {
  const access = await getProductForEdit(params.id);

  if (access.status !== 'ok') {
    // Missing and not-yours render the same 404 on purpose. Next 14 gives a
    // page no way to answer 403 - and even notFound() answers 200 here, which
    // is T-91, app-wide and not this route's doing - so the choice is only
    // about what the visitor sees. A 404 for both does not confirm that
    // somebody else's product id exists, and src/app/not-found.jsx (T-90)
    // already offers a way back, which is the half of F28 the bare paragraph
    // had none of. The authorization that matters is still a real 403: PUT
    // and DELETE /api/products/[id] check ownership themselves, and nothing
    // this page renders can bypass them.
    logger.warn('edit product denied', { id: params.id, reason: access.status });
    notFound();
  }

  return <EditProductForm product={access.product} />;
}
