import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import 'dotenv/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Express
const app = express();
const port = 4000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// CORS configuration middleware
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174',
  'https://text-book-frontend.vercel.app',
  'https://text-book-admin.vercel.app'
];

// Enable CORS for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Connect to database
console.log('Connecting to database...');
connectDB()
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Import routes after DB connection
console.log('Importing routes...');
import userRouter from "./routes/userRoute.js";
import newsRouter from "./routes/newsRoute.js";
import testRouter from "./routes/testRoute.js";
import adminRouter from "./routes/adminRoute.js";

// API routes
app.use("/api/users", userRouter);
app.use("/api/news", newsRouter);
app.use("/api/tests", testRouter);
app.use("/api/admin", adminRouter);


// 404 handler - must be after all other routes
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`\n=== Server started successfully ===`);
  console.log(`Server running at http://localhost:${port}`);
  console.log(`\nAvailable routes:`);
  console.log(`GET  /`);
  console.log(`GET  /test`);
  console.log(`GET  /api/tests/health`);
  console.log(`GET  /api/tests/test-route`);
  console.log(`GET  /api/tests/:subject`);
  console.log(`POST /api/tests/submit`);
  console.log(`\nUse Ctrl+C to stop the server\n`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: Port ${port} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server has been terminated');
    process.exit(0);
  });
});
