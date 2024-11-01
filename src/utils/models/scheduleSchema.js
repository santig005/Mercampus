import mongoose from "mongoose";

const Schema = mongoose.Schema;



const scheduleSchema = new Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startTime: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Time',
        required: true
    },
    endTime: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Time',
        required: true
    },
    idDay: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Day',
        required: true
    }
});

export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);