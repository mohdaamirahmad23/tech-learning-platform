import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String, required: true },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "" },
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["discussion", "question"], default: "discussion" },
  tags: [{ type: String }],
  image: { type: String, default: "" },         // ✅ Image URL
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ✅ Array of userIds
  comments: [commentSchema],                     // ✅ Embedded comments
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);
export default Post;