import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Post from "../models/Post.js";

const router = express.Router();

// ✅ Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// GET all posts (discussions + questions dono)
router.get("/all", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET discussions only
router.get("/discussions", async (req, res) => {
  try {
    const posts = await Post.find({ type: "discussion" }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET questions only
router.get("/questions", async (req, res) => {
  try {
    const posts = await Post.find({ type: "question" }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ CREATE post with optional image
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { title, content, author, authorId, type, tags } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: "Title aur author required hain" });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const post = new Post({
      title,
      content,
      author,
      authorId: authorId || null,
      type: type || "discussion",
      tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      image: imageUrl,
      likes: [],
      comments: [],
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ LIKE / UNLIKE post (toggle)
router.post("/:id/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post nahi mila" });

    const alreadyLiked = post.likes.includes(userId);
    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ ADD comment
router.post("/:id/comment", async (req, res) => {
  try {
    const { author, authorId, content } = req.body;
    if (!author || !content) {
      return res.status(400).json({ message: "Author aur content required hai" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post nahi mila" });

    post.comments.push({ author, authorId: authorId || null, content });
    await post.save();

    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;