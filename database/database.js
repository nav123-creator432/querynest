const mongoose = require("mongoose")

const MONGODB_URL = 'mongodb+srv://navya:1234@cluster0.wkzfywa.mongodb.net/user?retryWrites=true&w=majority&appName=Cluster0'

exports.connect = () => {
    mongoose.connect(MONGODB_URL)
    .then()
    .catch((error) => {
        console.log(`DB connection FAILED`);
        console.log(error);
        process.exit(1)
    })
}