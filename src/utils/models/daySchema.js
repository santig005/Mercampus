import mongoose from "mongoose";

const Schema = mongoose.Schema;

const daySchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    },
});

const Day = mongoose.model('Day', daySchema);

module.exports = Day;