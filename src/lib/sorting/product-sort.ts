import mongoose from 'mongoose';

import type { ProductCursor, ProductSort } from '@/lib/validators/product';

type ProductLike = {
  _id: mongoose.Types.ObjectId | string;
  availability: boolean;
  price: number;
  createdAt: Date;
};

type CursorFor<S extends ProductSort> = Extract<ProductCursor, { sort: S }>;

type SortConfig<S extends ProductSort> = {
  // Mismo orden que recibe .sort() de Mongoose.
  mongoSort: Record<string, 1 | -1>;
  // Traduce el cursor de la pagina anterior en el filtro que trae "lo que
  // sigue" segun este orden.
  buildCursorFilter: (cursor: CursorFor<S>) => Record<string, unknown>;
  encodeCursorPayload: (last: ProductLike) => CursorFor<S>;
};

const objectId = (id: string) => new mongoose.Types.ObjectId(id);

// T-23 fijo 'default' (availability desc, createdAt desc, _id de desempate).
// T-70 suma 'newest' y los dos sentidos de precio sobre la misma maquina de
// paginacion: cada sort declara su propio orden de Mongo, su filtro de
// "siguiente pagina" a partir del cursor, y como armar el cursor de la
// pagina que devuelve. La ruta no conoce estos detalles, solo indexa este
// mapa por el `sort` ya validado.
export const SORT_CONFIGS: { [S in ProductSort]: SortConfig<S> } = {
  default: {
    mongoSort: { availability: -1, createdAt: -1, _id: -1 },
    buildCursorFilter: cursor => {
      // createdAt en Mongo es un BSON Date; el cursor lo trae como string ISO
      // (asi viaja en JSON), asi que hay que volver a convertirlo antes de
      // comparar, o $lt/$eq no matchean nada por el desajuste de tipo.
      const cursorCreatedAt = new Date(cursor.createdAt);
      return {
        $or: [
          { availability: { $lt: cursor.availability } },
          { availability: cursor.availability, createdAt: { $lt: cursorCreatedAt } },
          {
            availability: cursor.availability,
            createdAt: cursorCreatedAt,
            _id: { $lt: objectId(cursor.id) },
          },
        ],
      };
    },
    encodeCursorPayload: last => ({
      sort: 'default',
      availability: last.availability,
      createdAt: last.createdAt.toISOString(),
      id: last._id.toString(),
    }),
  },
  newest: {
    mongoSort: { createdAt: -1, _id: -1 },
    buildCursorFilter: cursor => {
      const cursorCreatedAt = new Date(cursor.createdAt);
      return {
        $or: [
          { createdAt: { $lt: cursorCreatedAt } },
          { createdAt: cursorCreatedAt, _id: { $lt: objectId(cursor.id) } },
        ],
      };
    },
    encodeCursorPayload: last => ({
      sort: 'newest',
      createdAt: last.createdAt.toISOString(),
      id: last._id.toString(),
    }),
  },
  price_asc: {
    mongoSort: { price: 1, _id: 1 },
    buildCursorFilter: cursor => ({
      $or: [
        { price: { $gt: cursor.price } },
        { price: cursor.price, _id: { $gt: objectId(cursor.id) } },
      ],
    }),
    encodeCursorPayload: last => ({
      sort: 'price_asc',
      price: last.price,
      id: last._id.toString(),
    }),
  },
  price_desc: {
    mongoSort: { price: -1, _id: -1 },
    buildCursorFilter: cursor => ({
      $or: [
        { price: { $lt: cursor.price } },
        { price: cursor.price, _id: { $lt: objectId(cursor.id) } },
      ],
    }),
    encodeCursorPayload: last => ({
      sort: 'price_desc',
      price: last.price,
      id: last._id.toString(),
    }),
  },
};
