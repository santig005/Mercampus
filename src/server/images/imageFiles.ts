import { imageFilePath, normalizeImageUrl } from '@/lib/image-url';
import { connectDB } from '@/utils/connectDB';
import { getImageKit } from '@/utils/imagekit';
import { AppError } from '@/utils/lib/errors';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { Product } from '@/utils/models/productSchema';
import { DEFAULT_SELLER_LOGO, Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

// The only folders the image routes upload to or delete from.
const IMAGE_KINDS = ['products', 'sellerlogos'] as const;

/**
 * The ImageKit folder for a kind of image. The single place a folder is built:
 * the client names a kind from this list, never a path. T-118 adds a
 * per-environment prefix here, and `findImageFile` picks it up.
 */
export function imageFolder(kind: unknown): string {
  if (!IMAGE_KINDS.includes(kind as (typeof IMAGE_KINDS)[number])) {
    throw new AppError('Carpeta de imagen no válida.', 400);
  }
  return kind as string;
}

/**
 * Set on upload so a file can be deleted by whoever uploaded it before any
 * product or seller references it (the forms upload the moment a photo is
 * picked). A clerkId only means something inside its Clerk instance (T-12h):
 * after an instance change old tags stop matching and deleting falls back to
 * ownership or admin - it never opens anything up.
 */
export const uploaderTag = (clerkId: string) => `uploader:${clerkId}`;

// ImageKit replaces anything else in a file name with `_`, so a real name
// always matches. It also keeps the value safe to hand to the search.
const FILE_NAME = /^[A-Za-z0-9._-]+$/;

type ImageFile = {
  fileId: string;
  filePath: string;
  type?: string;
  tags?: string[] | null;
};

/**
 * The ImageKit file a stored URL points at, or `null`.
 *
 * Resolved by exact path, never by name alone: the name search this replaces
 * searched the whole account and took the first hit, so two `arepa.jpg` in
 * different folders meant deleting the wrong one. The search is narrowed with
 * `path` and `name`, and then every candidate is compared against the exact
 * path in code - so the answer does not depend on how strictly the API applies
 * those filters.
 */
export async function findImageFile(url: string): Promise<ImageFile | null> {
  const filePath = imageFilePath(url, process.env.IMAGEKIT_URL_ENDPOINT ?? '');
  if (!filePath) return null;

  const slash = filePath.lastIndexOf('/');
  const folder = filePath.slice(0, slash + 1);
  const name = filePath.slice(slash + 1);

  const managedFolders = IMAGE_KINDS.map(kind => `/${imageFolder(kind)}/`);
  if (!managedFolders.includes(folder) || !FILE_NAME.test(name)) {
    return null;
  }

  const candidates = (await getImageKit().listFiles({
    path: folder,
    name,
  })) as ImageFile[];
  // `type` can also be `file-version` or `folder`; only the current file counts.
  const matches = candidates.filter(
    file => file.type === 'file' && file.filePath === filePath
  );

  return matches.length === 1 ? matches[0] : null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether the URL is referenced by the caller's seller and by nobody else.
 *
 * "Nobody else" matters because a product accepts any image URL: without it,
 * pasting someone's photo URL into your own product would be enough to delete
 * their file. The default logo is refused outright - a seller whose document
 * predates the field shows it without storing it, so counting references
 * could undercount who uses it.
 */
async function ownsExclusively(clerkId: string, url: string): Promise<boolean> {
  const normalized = normalizeImageUrl(url);
  if (!normalized || normalized === normalizeImageUrl(DEFAULT_SELLER_LOGO)) {
    return false;
  }

  await connectDB();
  const user = await User.findOne({ clerkId }).select('sellerId').lean();
  if (!user?.sellerId) return false;

  // Stored URLs may carry a query string; the path is what identifies the file.
  const stored = new RegExp(`^${escapeRegExp(normalized)}(\\?.*)?$`);
  const [products, sellers] = await Promise.all([
    Product.find({ images: stored }).select('sellerId').lean(),
    Seller.find({ logo: stored }).select('_id').lean(),
  ]);

  const referencedBy = new Set([
    ...products.map(product => String(product.sellerId)),
    ...sellers.map(seller => String(seller._id)),
  ]);

  return referencedBy.size === 1 && referencedBy.has(String(user.sellerId));
}

/**
 * T-116's delete rule, cheapest check first: the uploader tag is already on
 * the file, ownership is two Mongo queries, and isClerkAdmin() is a roundtrip
 * to Clerk's Backend API.
 */
export async function canDeleteImage(
  clerkId: string,
  url: string,
  file: ImageFile
): Promise<boolean> {
  if (file.tags?.includes(uploaderTag(clerkId))) return true;
  if (await ownsExclusively(clerkId, url)) return true;
  return isClerkAdmin(clerkId);
}
