import { Schema, model } from "mongoose";

const OrderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
  },
  qty: {
    type: Number,
    required: true,
  },
});

const orderSchema = new Schema(
  {
    orderPrice: {
      type: Number,
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    orderItems: {
      type: [OrderItemSchema],
    },
    address: {
      type: String,
      required: true, // we can make this schema separate as well with all detailed values i.e. zipcode/city/state etc. etc.
    },
    status: {
      type: String,
      enum: ["PENDING", "CANCELLED", "DELIVERED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export const Order = model("Order", orderSchema);
