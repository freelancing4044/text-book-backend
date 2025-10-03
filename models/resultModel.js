import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOptionIndex: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  correctAnswerIndex: { type: Number, required: true }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number, // Time in seconds
    required: true
  },
  percentage: {
    type: Number,
    required: true,
  },
  // BUG FIX: Added the 'answers' field to store detailed results
  answers: [answerSchema],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// RECOMMENDATION: Use the simpler, more robust definition
const Result = mongoose.model('Result', resultSchema);

export default Result;