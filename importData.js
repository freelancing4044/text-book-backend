// node importData.js <subject> <filePath> [durationInMinutes]
// Example: node importData.js physics ./examPapers/sample.xlsx 90

import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import Question from './models/questionModel.js';
import Test from './models/testModel.js';
import { connectDB, disconnectDB } from './config/db.js';

dotenv.config();

// NEW: Helper function to convert 'A'/'1' -> 0, 'B'/'2' -> 1, etc.
const getAnswerIndex = (answerValue) => {
  if (answerValue === null || answerValue === undefined) return null;

  const answerStr = answerValue.toString().trim().toUpperCase();

  const mapping = {
    'A': 0, 'B': 1, 'C': 2, 'D': 3,
    '1': 0, '2': 1, '3': 2, '4': 3
  };

  const index = mapping[answerStr];

  // Return index if it's valid (0, 1, 2, 3), otherwise return null
  return (index !== undefined && index >= 0 && index <= 3) ? index : null;
};


const importQuestions = async (subject, filePath, duration = 60) => {
  try {
    await connectDB();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const absolutePath = join(__dirname, filePath);

    if (!existsSync(absolutePath)) throw new Error(`File not found at: ${absolutePath}`);
    console.log(`📂 Processing file: ${absolutePath}`);

    const workbook = xlsx.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) throw new Error('No data found in the Excel file');
    console.log(`📊 Found ${data.length} questions to import for subject: ${subject}`);

    const questionsToInsert = data.map((row, index) => {
      if (!row.question || !row.option1 || !row.option2 || !row.option3 || !row.option4 || !row.answer) {
        console.warn(`⚠️ Skipping row ${index + 2} due to missing fields.`);
        return null;
      }
      
      // CHANGED: Use the new helper function to get the index
      const ansIndex = getAnswerIndex(row.answer);
      
      if (ansIndex === null) {
        console.warn(`⚠️ Skipping row ${index + 2} due to invalid answer: "${row.answer}". Must be A, B, C, D, or 1, 2, 3, 4.`);
        return null;
      }

      return {
        questionText: row.question.toString().trim(),
        options: [
          row.option1.toString().trim(),
          row.option2.toString().trim(),
          row.option3.toString().trim(),
          row.option4.toString().trim(),
        ],
        correctAnswerIndex: ansIndex,
      };
    }).filter(Boolean);

    if (questionsToInsert.length === 0) {
      throw new Error('No valid questions could be prepared from the file.');
    }

    const existingTest = await Test.findOne({ subject });
    if (existingTest) {
      console.log(`Found existing test for "${subject}". Deleting old questions...`);
      await Question.deleteMany({ _id: { $in: existingTest.questions } });
    }

    const savedQuestions = await Question.insertMany(questionsToInsert);
    const questionIds = savedQuestions.map(q => q._id);
    console.log(`✅ Successfully inserted ${questionIds.length} new questions into the database.`);

    const updatedTest = await Test.findOneAndUpdate(
      { subject: subject.trim().toLowerCase() },
      { questions: questionIds, duration: duration },
      { upsert: true, new: true, runValidators: true }
    );

    console.log('\n📊 Import Summary:');
    console.log(`✅ Processed: ${data.length} rows`);
    console.log(`📚 ${existingTest ? 'Updated' : 'Created'} test: "${updatedTest.subject}" with ${updatedTest.questions.length} questions and a duration of ${updatedTest.duration} minutes.`);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
  } finally {
    await disconnectDB();
  }
};

// Main execution block (no changes here)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length < 4) {
    console.error('Usage: node importData.js <subject> <path/to/excel.xlsx> [durationInMinutes]');
    process.exit(1);
  }
  const [, , subject, filePath, duration] = process.argv;
  importQuestions(subject, filePath, duration ? parseInt(duration, 10) : undefined);
}

export default importQuestions;