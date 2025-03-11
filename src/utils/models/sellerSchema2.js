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
        default: 'https://ik.imagekit.io/iebk3hngu/sellerlogos/whisk1.png?updatedAt=1739224183820'
    },
    instagramUser: {
        type: String
    },
    availability: {
        type: Boolean,
        default: true
    },
    statusExtraTime: {
        type: Boolean,
        default: false
    },
    extraTime : {
        type: Date
    },
    temporalAvailability: {
        type: Boolean,
        default: false
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
    approved: {
        type: Boolean,
        default: false
    },
    university:{
        type: String,
        default: 'Universidad Eafit'
    },
    },
    {
      timestamps: true,
    }
);

export const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);
export default Seller;