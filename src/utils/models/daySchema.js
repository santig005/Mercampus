import mongoose from "mongoose";

const Schema = mongoose.Schema;

const daySchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    },
});

export const Day =
  mongoose.models.Day || mongoose.model('Day', daySchema);