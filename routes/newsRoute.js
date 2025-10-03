import express from 'express'
import { allNews, newsAdd, newsRemove } from '../controllers/newsController.js';
import makeUploader from '../middleware/uploadFileMiddleware.js';

const newsRouter = express.Router();
const uploadNews = makeUploader("news")


newsRouter.post('/add',uploadNews.single("image"),newsAdd)
newsRouter.get('/get',allNews)
// For form-data submissions
newsRouter.post('/delete', uploadNews.none(), newsRemove)

export default newsRouter