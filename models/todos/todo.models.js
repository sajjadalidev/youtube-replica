import { Schema, model } from "mongoose";

const TodoSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      color: String,
    },
    complete: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    subTodos: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubTodo",
      },
    ], // Array of SubTodos
  },
  { timestamps: true }
);

export const Todo = model("Todo", TodoSchema);
