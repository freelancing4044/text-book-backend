// Backend/middleware/uploadFileMiddleware.js
import multer from "multer";
// Cloudinary is a CommonJS module, so import it as default and destructure v2
import pkg from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import cloudinaryConfig from "../config/cloudinary.js";

const { v2: cloudinary } = pkg;
cloudinary.config(cloudinaryConfig); // Initialize Cloudinary with config

// Factory function to create multer instance with Cloudinary storage
const makeUploader = (folderName) => {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      // Generate a unique filename for each upload
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      return {
        folder: `textbook-app/${folderName}`, // Folder name in Cloudinary
        public_id: uniqueFilename, // Custom public ID
        format: "webp", // Convert to webp
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"], // Restrict allowed file types
        transformation: [
          { width: 1000, height: 1000, crop: "limit" }, // Resize to max 1000x1000
          { quality: "auto:good" }, // Auto-optimize quality
        ],
      };
    }
  });

  // File filter to allow only certain image formats
  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      return cb(new Error("Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed"));
    }
    cb(null, true);
  };

  // Return multer instance with Cloudinary storage
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });
};

export default makeUploader;
