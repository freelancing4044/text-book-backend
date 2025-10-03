import Test from '../models/testModel.js';
import Result from '../models/resultModel.js';

// @desc    Get a test by its subject
// @route   GET /api/tests/:subject
// @access  Public
const getTestBySubject = async (req, res) => {
  console.log('getTestBySubject called with subject:', req.params.subject);
  try {
    const { subject } = req.params;
    
    if (!subject) {
      return res.status(400).json({
        status: 'error',
        message: 'Subject parameter is required'
      });
    }
    
    console.log('Searching for test with subject:', subject);
    
    // Simple response for testing
    if (subject === 'test') {
      return res.status(200).json({
        status: 'success',
        message: 'Test endpoint is working',
        subject: subject,
        timestamp: new Date().toISOString()
      });
    }
    
    // Find the test by subject and populate its questions
    const test = await Test.findOne({ subject: subject.toLowerCase() })
      .populate('questions', '-correctAnswerIndex');

    if (!test) {
      console.log('Test not found for subject:', subject);
      return res.status(404).json({ 
        status: 'error',
        message: `Test with subject '${subject}' not found.` 
      });
    }

    if (!test.questions || test.questions.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No questions found for this test.'
      });
    }

    console.log('Test found:', test.subject);
    
    // Create a deep copy of the test object and convert to plain JavaScript object
    const testObj = test.toObject();
    
    // Get the questions array and create a copy to shuffle
    const questions = [...testObj.questions];
    
    // Seeded shuffle to ensure consistent order across pagination
    const seed = req.query.testSeed || Math.random().toString();
    let m = questions.length, t, i;

    // While there remain elements to shuffle…
    while (m) {
      // Pick a remaining element…
      i = Math.floor(seededRandom(seed + m) * m--);

      // And swap it with the current element.
      t = questions[m];
      questions[m] = questions[i];
      questions[i] = t;
    }

    function seededRandom(seed) {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    // Pagination logic
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const totalQuestions = questions.length;
    const totalPages = Math.ceil(totalQuestions / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedQuestions = questions.slice(startIndex, endIndex);

    // Replace the questions array with the paginated and shuffled one
    testObj.questions = paginatedQuestions;

    return res.status(200).json({
      status: 'success',
      data: {
        ...testObj,
        pagination: {
          currentPage: page,
          totalPages,
          totalQuestions,
        },
        testSeed: seed, // Send seed back to client
      },
    });

  } catch (error) {
    console.error('Error in getTestBySubject:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Server error while fetching test.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Submit test answers
// @route   POST /api/tests/submit
// @access  Private
const submitTest = async (req, res) => {
  console.log('Received test submission:', JSON.stringify(req.body, null, 2));
  
  try {
    const { testId, userAnswers, timeTaken } = req.body;
    
    // Input validation
    if (!testId || !Array.isArray(userAnswers)) {
      console.error('Invalid request data:', { testId, hasUserAnswers: !!userAnswers });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data. Test ID and user answers are required.'
      });
    }
    
    const userId = req.user.id; // Use the authenticated user's ID

    console.log('Fetching test with ID:', testId);
    // 1. Fetch the full test data from the DB
    const test = await Test.findById(testId).populate('questions');

    if (!test) {
      console.error('Test not found for ID:', testId);
      return res.status(404).json({ 
        status: 'error',
        message: 'Test not found for submission.' 
      });
    }

    console.log(`Found test: ${test._id} with ${test.questions.length} questions`);

    // 2. Create a map of question IDs to their correct answers for quick lookup
    const questionMap = new Map();
    test.questions.forEach(question => {
      if (!question._id) {
        console.error('Question missing _id:', question);
        return;
      }
      questionMap.set(question._id.toString(), {
        correctAnswerIndex: question.correctAnswerIndex,
        options: question.options
      });
    });
    
    console.log(`Processed ${questionMap.size} questions`);
    
    // 3. Process and validate user answers
    let score = 0;
    const processedAnswers = [];
    
    userAnswers.forEach((userAnswer, index) => {
      try {
        if (!userAnswer || typeof userAnswer !== 'object') {
          console.error(`Invalid user answer at index ${index}:`, userAnswer);
          return;
        }
        
        const { questionId, selectedOptionIndex } = userAnswer;
        
        if (!questionId) {
          console.error(`Missing questionId in answer at index ${index}:`, userAnswer);
          return;
        }
        
        const question = questionMap.get(questionId.toString());
        if (!question) {
          console.error(`Question not found for ID: ${questionId}`);
          return;
        }
        
        // Ensure selectedOptionIndex is a number
        const selectedIndex = Number(selectedOptionIndex);
        if (isNaN(selectedIndex)) {
          console.error(`Invalid selectedOptionIndex for question ${questionId}:`, selectedOptionIndex);
          return;
        }
        
        const isCorrect = selectedIndex === question.correctAnswerIndex;
        if (isCorrect) {
          score++;
        }
        
        processedAnswers.push({
          questionId,
          selectedOptionIndex: selectedIndex,
          isCorrect,
          correctAnswerIndex: question.correctAnswerIndex,
          options: question.options
        });
      } catch (err) {
        console.error(`Error processing answer at index ${index}:`, err);
      }
    });
    
    console.log(`Processed ${processedAnswers.length} answers, score: ${score}`);
    
    // 4. Calculate score and percentage
    const totalQuestions = test.questions.length;
    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    
    console.log('Creating result record...');
    // 5. Create a result record
    const result = new Result({
      user: userId,
      test: testId,
      answers: processedAnswers,
      score,
      totalQuestions,
      timeTaken: timeTaken || 0,
      percentage: parseFloat(percentage.toFixed(2))
    });

    await result.save();
    console.log('Result saved successfully:', result._id);

    const responseData = {
      status: 'success',
      data: {
        score,
        totalQuestions,
        timeTaken: result.timeTaken,
        percentage: result.percentage,
        answers: processedAnswers
      }
    };
    
    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Error submitting test:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error.errors && { errors: error.errors })
    });
    
    return res.status(500).json({ 
      status: 'error',
      message: 'Server error while processing your test submission.',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack
      })
    });
  }
};

export {
  getTestBySubject,
  submitTest,
};