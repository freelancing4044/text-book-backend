import mongoose from "mongoose"

const newsSchema = new mongoose.Schema({
    title:{type:String,required:true},
    desc:{type:String,required:true},
    image:{type:String,required:true},
})

const newsModel = mongoose.models.news || mongoose.model("news",newsSchema)
 
export default newsModel; 