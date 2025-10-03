import express from 'express';
import pkg from "cloudinary";
const { v2: cloudinary } = pkg;
import newsModel from '../models/newsModel.js';

// Add new news
const newsAdd = async (req, res) => {
    try {
        const { title, desc } = req.body;
        
        // Basic validation
        if (!title || !desc) {
            return res.status(400).json({ 
                success: false, 
                message: "Title and description are required" 
            });
        }

        // Create news with image URL if available
        const news = new newsModel({
            title,
            desc,
            image: req.file?.path || null,
        });

        await news.save();
        
        res.status(201).json({ 
            success: true, 
            message: "News added successfully",
            data: news
        });

    } catch (err) {
        console.error("Error adding news:", err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to add news" 
        });
    }
};

// Remove news
const newsRemove = async (req, res) => {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                message: "News ID is required" 
            });
        }

        const news = await newsModel.findById(id);
        if (!news) {
            return res.status(404).json({ 
                success: false, 
                message: "News not found" 
            });
        }

        // Delete image from Cloudinary if exists
        if (news.image) {
            try {
                // Extract public_id from the URL. Example: .../upload/v1629.../textbook-app/news/1629...-12345.webp
                const publicIdMatch = news.image.match(/\/upload\/v\d+\/(.+)\.\w+$/);
                if (publicIdMatch && publicIdMatch[1]) {
                    const publicId = publicIdMatch[1];
                    await cloudinary.uploader.destroy(publicId);
                    console.log(`Deleted image from Cloudinary: ${publicId}`);
                } else {
                    console.error("Could not extract publicId from URL:", news.image);
                }
            } catch (cloudErr) {
                console.error("Error deleting image from Cloudinary:", cloudErr);
                // Continue with news deletion even if image deletion fails
            }
        }

        await newsModel.findByIdAndDelete(id);
        
        res.json({ 
            success: true, 
            message: "News deleted successfully" 
        });

    } catch (error) {
        console.error("Error removing news:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to delete news" 
        });
    }
};

// Get all news
const allNews = async (req, res) => {
    try {
        const news = await newsModel.find({}).sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            data: news 
        });
    } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch news" 
        });
    }
};

export { newsAdd, newsRemove, allNews };