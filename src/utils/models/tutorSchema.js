import { Schema, models, model } from "mongoose";

const TutorSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photo: {
    type: String,
  },
  university: {
    type: String,
    required: true,
  },
  subjects: {
    type: [String],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
});

const Tutor = models.Tutor || model("Tutor", TutorSchema);

export default Tutor;
