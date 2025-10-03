import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  }
}, { timestamps: true });

// Check if the model exists before creating it to prevent OverwriteModelError
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

export default Question;