const express = require("express");
const router = express.Router();

const usersController = require("../controllers/users.controller");
const { asyncHandler } = require("../auth/checkAuth");
const { authUser } = require("../middleware/authUser");

router.post("/register", asyncHandler(usersController.register));
router.post("/login", asyncHandler(usersController.login));
router.get("/auth", authUser, asyncHandler(usersController.authUser));
router.get("/logout", authUser, asyncHandler(usersController.logout));
router.post("/forgot-password", asyncHandler(usersController.forgotPassword));
router.post(
  "/verify-forgot-password",
  asyncHandler(usersController.verifyForgotPassword)
);

module.exports = router;
