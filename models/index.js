// This file ensures all models are loaded and registered with Mongoose

// Import all models
import './userModel.js';
import './questionModel.js';
import './testModel.js';
import './resultModel.js';

// No need to export anything, just importing is enough to register the models
console.log('All models have been registered');
