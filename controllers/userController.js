import User from "../models/userModel.js";
import Result from "../models/resultModel.js";
import jwt from "jsonwebtoken";
import validator from "validator";
import bcrypt from 'bcrypt'

// create token with minimal payload + expiry
const createToken = (user) => {
  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

// POST /api/users/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required." });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: "User already exists." });

    // Create user with initial login data
    const now = new Date();
    const user = await User.create({ 
      name, 
      email, 
      password,
      lastLogin: now,  // Set initial login time
      loginCount: 1     // Set initial login count
    });

    const token = createToken(user);
    return res.status(201).json({ success: true, data: { user: user.toJSON(), token } });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({ success: false, message: "Server error while registering user." });
  }
};

// POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials." });

    // Save the user after successful login to update lastLogin
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });
    
    // Update lastLogin and loginCount
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = createToken(user);
    return res.status(200).json({ success: true, data: { user: user.toJSON(), token } });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.status(500).json({ success: false, message: "Server error while logging in." });
  }
};

// GET /api/users/me  -> returns user profile + their results (populated with test info)
const getMe = async (req, res) => {
  try {
    const userId = req.user.id; // set by authMiddleware
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const results = await Result.find({ user: userId })
      .select("score totalQuestions percentage timeTaken submittedAt test")
      .populate({ path: "test", select: "subject title duration" })
      .sort({ submittedAt: -1 });

    return res.status(200).json({ success: true, data: { user: user.toJSON(), results } });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching user data." });
  }
};

// GET /api/users/stats
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: oneMonthAgo } });

    const totalTestsTaken = await Result.countDocuments();

    const userStats = await User.aggregate([
      {
        $lookup: {
          from: 'results',
          localField: '_id',
          foreignField: 'user',
          as: 'tests'
        }
      },
      {
        $project: {
          userId: '$_id',
          name: 1,
          email: 1,
          role: 1,
          lastLogin: 1,
          testCount: { $size: '$tests' },
          averageScore: { $avg: '$tests.percentage' }
        }
      }
    ]);

    const recentTests = await Result.find()
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate('user', 'name');

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTestsTaken,
        userStats,
        recentTests
      }
    });
  } catch (error) {
    console.error('getUserStats error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching user stats.' });
  }
};

export { registerUser, loginUser, getMe, getUserStats };
