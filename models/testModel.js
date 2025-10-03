import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  duration: {
    type: Number, // Duration in minutes
    required: true,
    default: 60
  }
}, { timestamps: true });

// RECOMMENDATION: Use the simpler, more robust definition
const Test = mongoose.model('Test', testSchema);

export default Test;