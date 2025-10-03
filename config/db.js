
import mongoose from 'mongoose';
import '../models/index.js'; // Register all models

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL, {
            maxPoolSize: 100,           // Allow up to 150 concurrent connections
            serverSelectionTimeoutMS: 10000, // Wait up to 10s for a server
            socketTimeoutMS: 45000,    // 45s per request before socket timeout
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // List all registered models
        const modelNames = Object.keys(mongoose.connection.models);
        console.log('Registered models:', modelNames);

        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        throw error;
    }
};
