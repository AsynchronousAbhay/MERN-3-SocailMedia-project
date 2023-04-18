var mongoose = require("mongoose");

var postModel = new mongoose.Schema(
    {
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
        dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
        title: String,
        content: String,
        multimedia: {
            type: String,
            default: null,
        },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    },
    { timestamps: true }
);

var post = mongoose.model("post", postModel);

module.exports = post;
