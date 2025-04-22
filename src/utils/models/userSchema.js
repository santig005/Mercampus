import mongoose, { Schema } from 'mongoose';

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
      // unique: true,
    },
    role: {
      type: String,
      default: 'buyer',
      enum: ['buyer', 'seller','admin'],
    },
    imageProfile: {
      type: String,
      default: '',
    },
    // --- NUEVO CAMPO ---
    // Referencia al documento Seller asociado a este usuario (si existe)
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller', // Referencia al modelo 'Seller'
      required: false, // Un usuario no necesariamente es un vendedor
      unique: true,    // Un usuario solo puede tener un perfil de vendedor
      sparse: true     // Necesario con unique:true para permitir múltiples documentos sin este campo (o con valor null)
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
