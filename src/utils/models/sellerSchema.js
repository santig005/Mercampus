const mongoose = require('mongoose');

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
});

module.exports = mongoose.model('Seller', sellerSchema);