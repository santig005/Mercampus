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
    logo: {
        type: String
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
    //...UserSchema.obj
});

module.exports = mongoose.model('Seller', SellerSchema);