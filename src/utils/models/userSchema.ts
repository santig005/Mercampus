import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    // Id del usuario en Clerk (`user_...`). Es la clave con la que Clerk y
    // Mongo se unen: inmutable, a diferencia del email, y disponible sin salir
    // a la API de Clerk porque `auth()` ya la devuelve.
    //
    // El webhook siempre buscó por aquí, pero el campo no existía en el schema,
    // así que Mongoose lanzaba StrictModeError en cada `user.created` y el
    // try/catch se lo tragaba: no se creó nunca ningún usuario por esta vía.
    clerkId: {
      type: String,
      required: false, // los usuarios anteriores al webhook no lo tienen
      unique: true,
      sparse: true, // necesario con unique para permitir varios sin el campo
    },
    name: {
      type: String,
      required: true,
      unique: false,
    },
    lastName: {
      type: String,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      // unique: true,  // pendiente de T-11: hay que migrar duplicados antes
    },
    role: {
      type: String,
      default: 'buyer',
      enum: ['buyer', 'seller', 'admin'],
    },
    imageProfile: {
      type: String,
      default: '',
    },
    // Referencia al documento Seller asociado a este usuario, si existe.
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: false, // un usuario no tiene por que ser vendedor
      unique: true, // pero solo puede tener un perfil de vendedor
      sparse: true, // necesario con unique para permitir varios sin el campo
    },
  },
  {
    timestamps: true,
  }
);

// El email es la clave con la que se busca al usuario en cada verificacion de
// autorizacion. Sin unique: eso llega con T-11, que antes tiene que migrar los
// duplicados que ya existen.
userSchema.index({ email: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', userSchema);
