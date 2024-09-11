import mongoose from "mongoose";

const Schema = mongoose.Schema;

const sellerSchema = new Schema({
    // hereda de userSchema
    businessName: {
        type: String,
        required: true,
    },
    slogan:{
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    linkWhastapp: {
        type: String,
        required: false,
    },
    linkInstagram: {
        type: String,
        required: false,
    },
});