import mongoose, { Schema } from "mongoose";


const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },

    phoneNumber: {
        type: Number,
        required: true
    },

    role:{
        type:String,
        default: 'buyer',
        enum: ['buyer', 'seller']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

//para no crear el modelo siempre
export const User = mongoose.models.User ?? mongoose.model('User', userSchema)