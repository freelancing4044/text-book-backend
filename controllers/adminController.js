import User from "../models/userModel.js";
import Result from "../models/resultModel.js";
import Test from "../models/testModel.js";
import mongoose from 'mongoose';
import Admin from "../models/adminModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Helper to create admin token
const createAdminToken = (admin) => {
  const payload = {
    id: admin._id.toString(),
    role: 'admin', // Hardcode role to 'admin'
    email: admin.email
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
};

// GET /api/admin/users/stats - Get user statistics
export const getUserStats = async (req, res) => {
  console.log('Fetching user statistics...');
  try {
    // Get total number of users (including inactive ones for now)
    const totalUsers = await User.countDocuments({ isActive: { $ne: false } });
    console.log(`Total users: ${totalUsers}`);
    
    // Get number of active users (users who have logged in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo },
      isActive: { $ne: false }
    });
    console.log(`Active users: ${activeUsers}`);
    
    // Get ALL users with their test statistics (including users with 0 tests)
    const allUsers = await User.find({ isActive: { $ne: false } })
      .select('name email role createdAt lastLogin loginCount')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${allUsers.length} users in database`);
    console.log('User IDs from User collection:', allUsers.map(u => ({ id: u._id.toString(), name: u.name })));

    // Get test statistics for users who have taken tests (only for active users)
    const activeUserIds = allUsers.map(user => user._id);
    
    const userTestStats = await Result.aggregate([
      {
        $match: {
          user: { $in: activeUserIds }
        }
      },
      {
        $group: {
          _id: "$user",
          testCount: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          lastTestDate: { $max: "$createdAt" }
        }
      }
    ]);

    console.log(`Found test stats for ${userTestStats.length} users who have taken tests`);
    console.log('Raw aggregation results:', userTestStats.map(stat => ({
      userId: stat._id,
      testCount: stat.testCount,
      averageScore: stat.averageScore
    })));

    // Create a map for quick lookup of test stats
    const testStatsMap = {};
    userTestStats.forEach(stat => {
      const userId = stat._id.toString();
      testStatsMap[userId] = {
        testCount: stat.testCount,
        averageScore: Math.round(stat.averageScore * 100) / 100,
        lastTestDate: stat.lastTestDate
      };
      console.log(`Test stats for user ${userId}: ${stat.testCount} tests, avg: ${stat.averageScore}%`);
    });
    
    console.log('Test stats map keys:', Object.keys(testStatsMap));

    // Combine user data with test statistics
    const testStats = allUsers.map(user => {
      const userIdStr = user._id.toString();
      const userStats = testStatsMap[userIdStr] || {
        testCount: 0,
        averageScore: 0,
        lastTestDate: null
      };

      console.log(`Looking up stats for user ${user.name} (ID: ${userIdStr})`);
      console.log(`Found stats:`, userStats);

      const userWithStats = {
        userId: user._id,
        name: user.name || "Unknown User",
        email: user.email || "unknown@example.com",
        role: user.role || "student",
        testCount: userStats.testCount,
        averageScore: userStats.averageScore,
        lastTestDate: userStats.lastTestDate,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      };

      console.log(`Final user stats for ${user.name}:`, {
        testCount: userWithStats.testCount,
        averageScore: userWithStats.averageScore,
        lastLogin: userWithStats.lastLogin
      });
      
      return userWithStats;
    });
    
    console.log(`Found ${testStats.length} user test records`);
    
    // Get total tests taken (only from active users)
    const totalTestsTaken = await Result.countDocuments({
      user: { $in: activeUserIds }
    });
    console.log(`Total tests taken by active users: ${totalTestsTaken}`);
    
    // Get recent test submissions with better error handling (only for active users)
    const recentTests = await Result.find({
      user: { $in: activeUserIds }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: 'user',
        select: 'name email'
      })
      .populate({
        path: 'test',
        select: 'subject'
      });
    
    console.log(`Found ${recentTests.length} recent tests`);
    console.log('Recent tests raw data:', recentTests.map(t => ({
      id: t._id,
      user: t.user ? { name: t.user.name, email: t.user.email } : null,
      test: t.test ? { subject: t.test.subject } : null
    })));
    
    // Format the data (don't filter out tests with missing users for debugging)
    const formattedRecentTests = recentTests.map(test => ({
      id: test._id,
      user: test.user ? test.user.name : 'Unknown User',
      email: test.user ? test.user.email : 'unknown@example.com',
      test: test.test ? test.test.subject : 'Unknown Test',
      subject: test.test ? test.test.subject : 'unknown',
      score: test.score || 0,
      totalQuestions: test.totalQuestions || 0,
      percentage: test.percentage || 0,
      submittedAt: test.createdAt || new Date()
    }));

    console.log(`Formatted ${formattedRecentTests.length} recent tests`);
    
    const responseData = {
      totalUsers,
      activeUsers,
      totalTestsTaken,
      userStats: testStats,
      recentTests: formattedRecentTests
    };
    
    console.log('Sending response with user statistics');
    console.log('Response data summary:', {
      totalUsers: responseData.totalUsers,
      activeUsers: responseData.activeUsers,
      totalTestsTaken: responseData.totalTestsTaken,
      userStatsCount: responseData.userStats.length,
      recentTestsCount: responseData.recentTests.length
    });
    
    return res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: responseData
    });
    
  } catch (error) {
    console.error("getUserStats error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while fetching user statistics.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/admin/users/:userId/tests - Get test history for a specific user
export const getUserTestHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find all test results for the user with test details
    const userResults = await Result.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('test', 'subject');
    
    // Format the results
    const formattedResults = userResults.map(result => ({
      id: result._id,
      test: result.test ? result.test.subject : 'Unknown Test',
      subject: result.test ? result.test.subject : 'unknown',
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      submittedAt: result.createdAt,
      timeTaken: result.timeTaken
    }));

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        totalTests: formattedResults.length,
        tests: formattedResults
      }
    });
    
  } catch (error) {
    console.error('getUserTestHistory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching user test history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/admin/users - Get all users with basic info
export const getAllUsers = async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    // Get all users with their basic information
    const users = await User.find({ isActive: true })
      .select('name email role createdAt lastLogin loginCount')
      .sort({ createdAt: -1 });

    // Get test counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const testCount = await Result.countDocuments({ user: user._id });
        const avgScoreResult = await Result.aggregate([
          { $match: { user: user._id } },
          { $group: { _id: null, avgScore: { $avg: "$percentage" } } }
        ]);
        
        const avgScore = avgScoreResult.length > 0 ? avgScoreResult[0].avgScore : 0;
        
        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount || 0,
          testCount,
          averageScore: Math.round(avgScore * 100) / 100
        };
      })
    );

    console.log(`Found ${usersWithStats.length} users`);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        totalUsers: usersWithStats.length,
        users: usersWithStats
      }
    });
    
  } catch (error) {
    console.error('getAllUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/admin/debug - Debug endpoint to check database data
export const debugData = async (req, res) => {
  try {
    console.log('Debug: Checking database data...');
    
    // Check users
    const userCount = await User.countDocuments();
    const users = await User.find().limit(5).select('name email role isActive');
    
    // Check results
    const resultCount = await Result.countDocuments();
    const results = await Result.find().limit(5).select('user test score percentage');
    
    // Check tests
    const testCount = await Test.countDocuments();
    const tests = await Test.find().limit(5).select('title subject');
    
    const debugInfo = {
      users: { count: userCount, sample: users },
      results: { count: resultCount, sample: results },
      tests: { count: testCount, sample: tests }
    };
    
    console.log('Debug info:', debugInfo);
    
    return res.status(200).json({
      success: true,
      message: 'Debug data retrieved',
      data: debugInfo
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
};

// POST /api/admin/login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = createAdminToken(admin);
    const adminData = admin.toJSON();
    delete adminData.password;

    return res.status(200).json({ success: true, data: { admin: adminData, token } });
  } catch (error) {
    console.error("loginAdmin error:", error);
    return res.status(500).json({ success: false, message: "Server error while logging in." });
  }
};

// POST /api/admin/create - (Protected Route)
export const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Admin with this email already exists." });
    }

    // Password hashing is handled by pre-save hook in adminModel
    const newAdmin = await Admin.create({ email, password });

    const adminData = newAdmin.toJSON();
    delete adminData.password;

    return res.status(201).json({ success: true, message: "Admin created successfully.", data: adminData });
  } catch (error) {
    console.error("createAdmin error:", error);
    return res.status(500).json({ success: false, message: "Server error while creating admin." });
  }
};

// GET /api/admin/all - (Protected Route)
export const getAdmins = async (req, res) => {
  try {
    // Exclude the current admin from the list if needed, but for now, we get all.
    const admins = await Admin.find().select('-password');
    return res.status(200).json({ success: true, data: admins });
  } catch (error) {
    console.error("getAdmins error:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching admins." });
  }
};

// DELETE /api/admin/:id - (Protected Route)
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid admin ID format' });
    }

    // Prevent an admin from deleting themselves
    if (req.admin.id === id) {
      return res.status(403).json({ success: false, message: "You cannot delete your own account." });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    await Admin.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Admin deleted successfully." });
  } catch (error) {
    console.error("deleteAdmin error:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting admin." });
  }
};
