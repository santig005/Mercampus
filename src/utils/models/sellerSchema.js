const mongoose = require('mongoose');
const UserSchema = require('./userSchema');

const SellerSchema = new mongoose.Schema({
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
    image: {
        type: String
    },
    instagramUser: {
        type: String
    },
    availability: {
        type: Boolean,
        default: true
    },
    ...UserSchema.obj
});

const Seller = mongoose.models.Seller || mongoose.model('Seller', SellerSchema);
export default Seller;
