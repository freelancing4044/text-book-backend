// Backend/config/cloudinary.js
import pkg from "cloudinary";

const { v2: cloudinary } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (!cloudinaryUrl) {
  throw new Error('CLOUDINARY_URL is not defined in environment variables');
}

// Parse the URL to extract credentials
const matches = cloudinaryUrl.match(/^cloudinary:\/\/(\w+):(\w+)@(.+)$/);
if (!matches || matches.length < 4) {
  throw new Error('Invalid CLOUDINARY_URL format. Expected format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
}

const [, apiKey, apiSecret, cloudName] = matches;

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true // Use HTTPS
});

export default cloudinary;