import express from 'express';
import { getTestBySubject, submitTest } from '../controllers/testController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const testRouter = express.Router();



// Get test by subject
testRouter.get('/:subject', getTestBySubject);




// Route to submit the test answers
// e.g., POST http://localhost:5000/api/tests/submit
// It's highly recommended to protect this route to ensure only logged-in users can submit.
testRouter.post('/submit', authMiddleware, submitTest);



testRouter.use((req, res) => {
  console.log(`404 - Test route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    status: 'error',
    message: 'Test route not found',
    path: req.path
  });
});

export default testRouter; 