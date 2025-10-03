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

// Routes for managing other admins
router.post('/create', createAdmin);
router.get('/all', getAdmins);
router.delete('/:id', deleteAdmin);

// Routes for managing users and viewing stats
router.get('/debug', debugData);
router.get('/users/stats', getUserStats);
router.get('/users', getAllUsers);
router.get('/users/:userId/tests', getUserTestHistory);
router.delete('/users/:userId', deactivateUser);

export default router;
