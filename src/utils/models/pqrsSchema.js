import mongoose from "mongoose";
import { pqrsTypes } from "@/utils/resources/pqrs";

const pqrsSchema = new mongoose.Schema({
    email: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    type: {
        type: String,
        enum: pqrsTypes,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
});

export const Pqrs = mongoose.models.Pqrs || mongoose.model('Pqrs', pqrsSchema);
