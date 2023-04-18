var mongoose = require("mongoose");

mongoose.set('strictQuery', false);

mongoose
    .connect(
        "mongodb://127.0.0.1:27017/instaDB"
    )
    .then(function () {
        console.log("Database connected!");
    })
    .catch(function (err) {
        console.log(err);
    });
