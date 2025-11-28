const usersRoutes = require("./users.routes");

function routes(app) {
  app.use("/api/user", usersRoutes);
}

module.exports = routes;
