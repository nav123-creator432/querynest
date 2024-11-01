const mongoose = require("mongoose");
require("dotenv").config(); // Make sure to install dotenv

const MONGODB_URL = process.env.MONGODB_URL;

exports.connect = () => {
    mongoose.connect(MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log("DB connection successful");
    })
    .catch((error) => {
        console.error("DB connection FAILED");
        console.error(error);
        process.exit(1);
    });
};
