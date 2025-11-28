const usersRoutes = require("./users.routes");
const categoryRoutes = require("./category.routes");

function routes(app) {
  app.use("/api/user", usersRoutes);
  app.use("/api/category", categoryRoutes);
}

module.exports = routes;
