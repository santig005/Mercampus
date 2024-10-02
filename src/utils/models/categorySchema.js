import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Check if the model already exists in `mongoose.models`, if not, define it
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;