import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: true
    },
    slogan: {
        type: String
    },
    description: {
        type: String
    },
    logo: {
        type: String,
        default: 'https://ik.imagekit.io/iebk3hngu/sellerlogos/default-pfp.png?updatedAt=1739221374401'
    },
    instagramUser: {
        type: String
    },
    availability: {
        type: Boolean,
        default: true
    },
    phoneNumber: {
        type: Number,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
});

export const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);
export default Seller;