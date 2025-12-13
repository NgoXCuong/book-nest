const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const cartModel = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    products: [
      {
        productId: {
          type: mongoose.Types.ObjectId,
          ref: "products",
          require: true,
        },
        quantity: { type: Number, default: 1 },
      },
    ],
    totalPrice: { type: Number, default: 0 },
    fullName: { type: String, require: true },
    phoneNumber: { type: String, require: true },
    address: { type: String, require: true },
    finalPrice: { type: Number, default: 0 },
    counpon: {
      code: { type: String, require: true },
      discount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("cart", cartModel);
