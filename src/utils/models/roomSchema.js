import { Schema, models, model } from "mongoose";

const RoomSchema = new Schema({
  landlord: {
    type: Schema.Types.ObjectId,
    ref: "Landlord",
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  thumbnail: {
    type: String,
  },
  photos: {
    type: [String],
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  privateBath: {
    type: Boolean,
    default: false,
  },
  roomsNumber: {
    type: Number,
    default: 1,
  },
  parking: {
    type: Boolean,
    default: false,
  },
  elevator: {
    type: Boolean,
    default: false,
  },
  neighborhood: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  estrato: {
    type: Number,
    min: 1,
    max: 6,
    required: true,
  },
  availability: {
    type: Boolean,
    default: true,
  },
});

const Room = models.Room || model("Room", RoomSchema);

export default Room;
