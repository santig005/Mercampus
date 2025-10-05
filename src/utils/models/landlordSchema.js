import { Schema, models, model } from "mongoose";

const LandlordSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photo: {
    type: String,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const Landlord = models.Landlord || model("Landlord", LandlordSchema);

export default Landlord;
