import express from "express";

const app = express();
app.use(express.static("dist"));
const port = process.env.PORT || 5000;



app.listen(port, () => {
  console.log(`App is running on ${port}`);
});
