import express from "express";
import { loginUser, registerUser, getMe, getUserStats } from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminAuthMiddleware from "../middleware/adminAuthMiddleware.js";

const router = express.Router();


router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getMe);
router.get("/stats", adminAuthMiddleware, getUserStats);

export default router;
