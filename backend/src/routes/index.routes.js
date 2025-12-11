const usersRoutes = require("./users.routes");
const categoryRoutes = require("./category.routes");
const productRoutes = require("./product.routes");

function routes(app) {
  app.use("/api/user", usersRoutes);
  app.use("/api/category", categoryRoutes);
  app.use("/api/product", productRoutes);
}

module.exports = routes;
