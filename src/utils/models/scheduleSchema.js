import mongoose from "mongoose";

const Schema = mongoose.Schema;


const scheduleSchema = new Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    day: {
        type: Number,
        required: true,
    }
});

export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);