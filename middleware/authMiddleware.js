import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const authMiddleware = async (req, res, next) => {
  try {
    // Look for Authorization: Bearer <token> first, fallback to `token` header
    let token;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers.token) {
      token = req.headers.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, token missing." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach minimal user info to request
    req.user = { id: decoded.id, role: decoded.role, email: decoded.email };

    // Optional safety: verify user still exists
    const exists = await User.findById(decoded.id).select("_id");
    if (!exists) return res.status(401).json({ success: false, message: "User no longer exists." });

    next();
  } catch (error) {
    console.error("authMiddleware error:", error);
    // If token expired, jwt.verify throws a TokenExpiredError
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please login again." });
    }
    return res.status(401).json({ success: false, message: "Not authorized, token invalid." });
  }
};

export default authMiddleware;
