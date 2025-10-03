import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import 'dotenv/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Express
const app = express();
const port = process.env.PORT || 4000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// CORS configuration middleware
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174','https://text-book-frontend.vercel.app'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

// Root route for testing
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

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

// Export the app for Vercel
export default app;
