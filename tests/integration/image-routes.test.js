import { File } from 'node:buffer';

import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-116. Nothing here talks to ImageKit: the media library is an in-memory
// list. Same Clerk stub as seller-approval.test.js.
const session = vi.hoisted(() => ({ userId: null, publicMetadata: {} }));
const media = vi.hoisted(() => ({
  endpoint: 'https://ik.imagekit.io/iebk3hngu',
  files: [],
  nextId: 1,
  failDelete: null,
  // T-116b: while true, new uploads stay out of listFiles, like the real
  // search index for a few seconds after an upload.
  indexLag: false,
  unindexed: new Set(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: () => ({
    users: {
      getUser: async id => {
        if (id !== session.userId) {
          throw new Error(`getUser called with ${id}, not the session's id.`);
        }
        return { publicMetadata: session.publicMetadata };
      },
    },
  }),
}));

const addFile = (filePath, tags = null) => {
  const file = {
    fileId: `file_${media.nextId++}`,
    type: 'file',
    name: filePath.slice(filePath.lastIndexOf('/') + 1),
    filePath,
    url: `${media.endpoint}${filePath}`,
    tags,
  };
  media.files.push(file);
  return file;
};

vi.mock('@/utils/imagekit', () => ({
  getImageKit: () => ({
    upload: async ({ fileName, folder, tags }) => {
      const file = addFile(`/${folder}/${fileName}`, tags);
      if (media.indexLag) media.unindexed.add(file.fileId);
      return file;
    },
    // As loose as the name search T-116 replaced: it ignores `path` and returns
    // every file with that name in the account. The handler has to pick the
    // right one on its own, not rely on the filter.
    listFiles: async ({ name }) =>
      media.files.filter(file => file.name === name && !media.unindexed.has(file.fileId)),
    // By id there is no lag, like the real API.
    getFileDetails: async fileId => {
      const file = media.files.find(candidate => candidate.fileId === fileId);
      if (!file) throw new Error('The requested file does not exist.');
      return file;
    },
    deleteFile: async fileId => {
      if (media.failDelete) throw media.failDelete;
      media.files = media.files.filter(file => file.fileId !== fileId);
    },
  }),
}));

// From the seed.
const BUYER = 'user_seed_ana'; // no seller profile
const CARLOS = 'user_seed_carlos'; // owns the approved seller
const LAURA = 'user_seed_laura'; // owns the pending seller

const signInAs = (clerkId, { admin = false } = {}) => {
  session.userId = clerkId;
  session.publicMetadata = admin ? { role: 'admin' } : {};
};
const signOut = () => {
  session.userId = null;
  session.publicMetadata = {};
};

let imagesRoute;
let Product;
let Seller;
let User;
let DEFAULT_SELLER_LOGO;
let ids;
let png;

const upload = (folder, fileName = 'foto.png') => {
  const form = new FormData();
  form.append('file', new File([png], fileName, { type: 'image/png' }));
  if (folder !== undefined) form.append('folder', folder);
  return imagesRoute.POST(
    new Request('http://localhost/api/images', { method: 'POST', body: form })
  );
};

const remove = body =>
  imagesRoute.DELETE(
    new Request('http://localhost/api/images', {
      method: 'DELETE',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  );

const stillThere = filePath => media.files.some(file => file.filePath === filePath);

// Two files with the same name in different folders, the products one listed
// first: the old lookup took the first hit and would delete it for Laura.
const CARLOS_IMAGE = '/products/arepa.jpg';
const LAURA_LOGO = '/sellerlogos/arepa.jpg';

describe('T-116 · image routes', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    process.env.IMAGEKIT_URL_ENDPOINT = media.endpoint;
    imagesRoute = await import('@/app/api/images/route.js');
    ({ Product } = await import('@/utils/models/productSchema'));
    ({ Seller, DEFAULT_SELLER_LOGO } = await import('@/utils/models/sellerSchema2'));
    ({ User } = await import('@/utils/models/userSchema'));
    png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#ff7a00' },
    })
      .png()
      .toBuffer();
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    signOut();
    media.files = [];
    media.failDelete = null;
    media.indexLag = false;
    media.unindexed = new Set();

    addFile(CARLOS_IMAGE);
    addFile(LAURA_LOGO);
    // The stored copy carries ?updatedAt=, like 12 of the real URLs.
    await Product.findByIdAndUpdate(ids.approvedProduct, {
      images: [`${media.endpoint}${CARLOS_IMAGE}?updatedAt=1739224183820`],
    });
    await Seller.findByIdAndUpdate(ids.pendingSeller, {
      logo: `${media.endpoint}${LAURA_LOGO}`,
    });
  });

  describe('POST', () => {
    it('401 without a session, and nothing is uploaded', async () => {
      const response = await upload('products');

      expect(response.status).toBe(401);
      expect(media.files).toHaveLength(2);
    });

    // There is no 403 on upload by design: any session may upload, because
    // the registration form uploads the logo before the seller exists.
    it('400 for a folder outside the list, and nothing is uploaded', async () => {
      signInAs(BUYER);

      for (const folder of ['private', '../sellerlogos', '/products', undefined]) {
        expect((await upload(folder)).status).toBe(400);
      }
      expect(media.files).toHaveLength(2);
    });

    it('400 for a file that is not an image', async () => {
      signInAs(BUYER);
      const form = new FormData();
      form.append('file', new File(['no soy una imagen'], 'x.png'));
      form.append('folder', 'products');

      const response = await imagesRoute.POST(
        new Request('http://localhost/api/images', { method: 'POST', body: form })
      );

      expect(response.status).toBe(400);
    });

    it('uploads to the chosen folder, tagged with the uploader', async () => {
      signInAs(BUYER);

      const response = await upload('sellerlogos', 'logo.png');

      expect(response.status).toBe(201);
      const uploaded = media.files.find(file => file.filePath === '/sellerlogos/logo.png');
      expect(uploaded.tags).toEqual([`uploader:${BUYER}`]);
      expect(await response.json()).toEqual({
        url: uploaded.url,
        fileId: uploaded.fileId,
      });
    });
  });

  describe('DELETE: who may', () => {
    it('401 without a session, and the file stays', async () => {
      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(401);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it('403 for a signed-in user with no seller and no tag', async () => {
      signInAs(BUYER);

      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(403);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it('403 for another seller', async () => {
      signInAs(LAURA);

      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(403);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it('the owner deletes an untagged legacy image, even with the query differing', async () => {
      signInAs(CARLOS);

      // Stored with ?updatedAt=, sent without it.
      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(200);
      expect(stillThere(CARLOS_IMAGE)).toBe(false);
    });

    it('the uploader deletes a picked image before any product exists', async () => {
      signInAs(BUYER);
      const { url } = await (await upload('products', 'borrador.png')).json();

      const response = await remove({ url });

      expect(response.status).toBe(200);
      expect(stillThere('/products/borrador.png')).toBe(false);
    });

    it("403 on someone else's unsaved upload", async () => {
      signInAs(BUYER);
      const { url } = await (await upload('products', 'borrador.png')).json();

      signInAs(LAURA);
      const response = await remove({ url });

      expect(response.status).toBe(403);
      expect(stillThere('/products/borrador.png')).toBe(true);
    });

    it("403 after pasting someone's image URL into your own product", async () => {
      await Product.findByIdAndUpdate(ids.pendingProduct, {
        images: [`${media.endpoint}${CARLOS_IMAGE}`],
      });
      signInAs(LAURA);

      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(403);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it('an admin may delete any managed image', async () => {
      signInAs(BUYER, { admin: true });

      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(200);
      expect(stillThere(CARLOS_IMAGE)).toBe(false);
    });
  });

  it("deleting one arepa.jpg does not touch the other one", async () => {
    signInAs(LAURA);

    const response = await remove({ url: `${media.endpoint}${LAURA_LOGO}` });

    expect(response.status).toBe(200);
    expect(stillThere(LAURA_LOGO)).toBe(false);
    expect(stillThere(CARLOS_IMAGE)).toBe(true);
  });

  // Measured on 2026-09-13: 12 sellers use this logo once the query is
  // dropped, only half of them with the exact stored text.
  it('the shared default logo is 403 for every one of its 12 sellers, with or without the query', async () => {
    const whisk = '/sellerlogos/whisk1.png';
    addFile(whisk);
    const bare = DEFAULT_SELLER_LOGO.split('?')[0];

    const owners = [];
    for (let i = 0; i < 12; i++) {
      const user = await User.create({
        clerkId: `user_whisk_${i}`,
        name: `Whisk ${i}`,
        email: `whisk${i}@example.test`,
      });
      const seller = await Seller.create({
        businessName: `Whisk ${i}`,
        phoneNumber: 3000000000 + i,
        userId: user._id,
        logo: i % 2 === 0 ? DEFAULT_SELLER_LOGO : bare,
      });
      await User.findByIdAndUpdate(user._id, { sellerId: seller._id });
      owners.push(user.clerkId);
    }

    for (const clerkId of owners) {
      signInAs(clerkId);
      expect((await remove({ url: DEFAULT_SELLER_LOGO })).status).toBe(403);
      expect((await remove({ url: bare })).status).toBe(403);
    }
    expect(stillThere(whisk)).toBe(true);
  });

  // T-116b. Measured against the real API on 2026-09-13: a fresh upload took
  // about 7 seconds to appear in listFiles, while getFileDetails found it at
  // once. Before this, removing a photo straight after picking it answered 404
  // and the form dropped it from the list, leaving the file in ImageKit.
  describe('DELETE: right after an upload, before the search index catches up', () => {
    it('the uploader deletes it at once with the fileId the upload returned', async () => {
      media.indexLag = true;
      signInAs(BUYER);
      const { url, fileId } = await (await upload('products', 'recien.png')).json();

      const response = await remove({ url, fileId });

      expect(response.status).toBe(200);
      expect(stillThere('/products/recien.png')).toBe(false);
    });

    it('without the fileId it is still 404, and nothing is deleted', async () => {
      media.indexLag = true;
      signInAs(BUYER);
      const { url } = await (await upload('products', 'recien.png')).json();

      const response = await remove({ url });

      expect(response.status).toBe(404);
      expect(stillThere('/products/recien.png')).toBe(true);
    });

    it('a fileId that belongs to another file is ignored, never followed', async () => {
      signInAs(BUYER);
      const { url } = await (await upload('products', 'mia.png')).json();
      const carlos = media.files.find(file => file.filePath === CARLOS_IMAGE);

      const response = await remove({ url, fileId: carlos.fileId });

      // Resolved by path instead: BUYER's own upload goes, Carlos's photo stays.
      expect(response.status).toBe(200);
      expect(stillThere('/products/mia.png')).toBe(false);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it("sending someone else's URL with its real fileId gains nothing", async () => {
      signInAs(LAURA);
      const carlos = media.files.find(file => file.filePath === CARLOS_IMAGE);

      const response = await remove({ url: carlos.url, fileId: carlos.fileId });

      expect(response.status).toBe(403);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it('an unknown fileId falls back to the path, so a legacy owner still deletes', async () => {
      signInAs(CARLOS);

      const response = await remove({
        url: `${media.endpoint}${CARLOS_IMAGE}`,
        fileId: 'no_such_file',
      });

      expect(response.status).toBe(200);
      expect(stillThere(CARLOS_IMAGE)).toBe(false);
    });
  });

  describe('DELETE: what it resolves', () => {
    it('404 for a URL outside the ImageKit endpoint', async () => {
      signInAs(CARLOS);

      const response = await remove({ url: `https://example.com${CARLOS_IMAGE}` });

      expect(response.status).toBe(404);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it('404 outside the managed folders, including through ..', async () => {
      addFile('/private/arepa.jpg', [`uploader:${CARLOS}`]);
      signInAs(CARLOS);

      expect((await remove({ url: `${media.endpoint}/private/arepa.jpg` })).status).toBe(404);
      expect(
        (await remove({ url: `${media.endpoint}/products/../private/arepa.jpg` })).status
      ).toBe(404);
      expect(stillThere('/private/arepa.jpg')).toBe(true);
    });

    it('404 when no file has that exact path', async () => {
      signInAs(CARLOS);

      const response = await remove({ url: `${media.endpoint}/products/otra.jpg` });

      expect(response.status).toBe(404);
    });

    it('400 for the old { fileId } body', async () => {
      signInAs(CARLOS);

      const response = await remove({ fileId: 'file_1' });

      expect(response.status).toBe(400);
      expect(stillThere(CARLOS_IMAGE)).toBe(true);
    });

    it("a 500 does not hand ImageKit's message to the client", async () => {
      media.failDelete = new Error('ImageKit exploded: privateKey=private_xyz');
      signInAs(CARLOS);

      const response = await remove({ url: `${media.endpoint}${CARLOS_IMAGE}` });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Error interno del servidor' });
    });
  });
});
