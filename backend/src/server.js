const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/connectDB");
const routes = require("./routes/index.routes");

require("dotenv").config();
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

routes(app);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi server",
  });
});

app.listen(PORT, () => {
  console.log("Server is running PORT: ", PORT);
});
