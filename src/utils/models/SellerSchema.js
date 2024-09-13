const mongoose = require('mongoose');
const UsuarioSchema = require('./userSchema');

const SellerSchema = new mongoose.Schema({
    businessName: { type: String, required: true },
    slogan: { type: String },
    description: { type: String },
    availability: { type: Boolean, default: true },
    ...UsuarioSchema.obj
});

module.exports = mongoose.model('Seller', SellerSchema);