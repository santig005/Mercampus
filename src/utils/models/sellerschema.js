import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
  },
  slogan: {
    type: String,
  },
  description: {
    type: String,
  },
  logo: {
    type: String,
  },
  instagramUser: {
    type: String,
  },
  availability: {
    type: Boolean,
    default: true,
  },
  phoneNumber: {
    type: Number,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
});

export const Seller =
  mongoose.models.Seller || mongoose.model('Seller', sellerSchema);
export default Seller;
