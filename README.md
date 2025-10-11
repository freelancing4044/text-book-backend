# TextBook Backend

## 🚀 Getting Started

### Prerequisites
- Node.js v20.x
- MongoDB Atlas account
- Cloudinary account

### Installation

```bash
# Clone the repository
git clone https://github.com/freelancing4044/text-book-backend.git
cd textbook-backend

# Install dependencies
npm install

# Start development server
npm run start
or
nodemon server.js
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URL="your_mongodb_connection_string"
JWT_SECRET='your_jwt_secret'
PORT=4000
NODE_ENV='development'
CLOUDINARY_URL='your_cloudinary_url'
FRONTEND_URL='http://frontend.com'
ADMIN_URL='http://admin.com'
```

### Project Structure

```
backend/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/           # Database models
├── routes/           # API routes
├── utils/            # Utility functions
├── .env              # Environment variables
├── .env.example      # Example env file
├── package.json
└── server.js         # Application entry point
```



## 📦 Dependencies

- Express - Web framework
- Mongoose - MongoDB ODM
- JWT - Authentication
- Cloudinary - File storage
- Joi - Request validation
- Winston - Logging

