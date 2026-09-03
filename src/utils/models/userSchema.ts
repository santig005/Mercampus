import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
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
