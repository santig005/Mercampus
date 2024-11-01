import mongoose from "mongoose";

const Schema = mongoose.Schema;

const daySchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    },
    day_number: {
        type: Number,
        required: true
    },
});

export const Day =
  mongoose.models.Day || mongoose.model('Day', daySchema);