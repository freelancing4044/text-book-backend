import express from 'express';
import {
    loginAdmin,
    createAdmin,
    getAdmins,
    deleteAdmin,
    getUserStats,
    getUserTestHistory,
    getAllUsers,
    deactivateUser,
    debugData
} from '../controllers/adminController.js';
import adminAuthMiddleware from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// Public route for admin login
router.post('/login', loginAdmin);

// All subsequent routes are protected and require admin authentication
router.use(adminAuthMiddleware);

// ===== Admin Management Routes =====
router.post('/create', createAdmin);  // Create new admin
router.get('/all', getAdmins);        // List all admins
router.delete('/:id', deleteAdmin);   // Delete admin by ID

// ===== User Management Routes =====
router.get('/users', getAllUsers);                    // Get all users
router.get('/users/stats', getUserStats);             // Get user statistics
router.get('/users/:userId/tests', getUserTestHistory); // Get user test history
router.delete('/users/:userId', deactivateUser);       // Deactivate user

// ===== Debug/Utility Routes =====
router.get('/debug', debugData);  // Debug endpoint

export default router;
