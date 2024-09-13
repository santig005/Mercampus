const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const daySchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
});

const Day = mongoose.model('Day', daySchema);

module.exports = Day;