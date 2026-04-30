import express from "express";
import mongoose from "mongoose";

const router = express.Router();

const contactSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true },
  subject:   { type: String, required: true },
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model("Contact", contactSchema);

router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return res.status(400).json({ success: false, message: "All fields required" });

    await new Contact({ name, email, subject, message }).save();
    res.json({ success: true, message: "Message saved!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;