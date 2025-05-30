import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
// import { DB_NAME } from "./constant.js";

dotenv.config();
const app = express();
app.use(express.static("dist"));
const port = process.env.PORT || 5000;

connectDB()
  .then((result) => {
    app.listen(port, () => {
      console.log(`App is running on ${port}`);
    });
  })
  .catch((err) => {
    console.log("MONGODB Connection failed!!");
    console.log("🚀 ~ connectDB ~ err:", err);
  });
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("🚀 ~ app.on ~ error:", error);
//     });
//     app.listen(port, () => {
//       console.log(`App is running on ${port}`);
//     });
//   } catch (error) {
//     console.log("DB not connected🚀 ~ error:", error);
//   }
// })();
