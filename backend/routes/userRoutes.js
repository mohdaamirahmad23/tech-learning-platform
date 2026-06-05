import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET MEMBERS - with proper fullName
router.get("/members", async (req, res) => {
  try {
    const users = await User.find().select("fullName email createdAt");

    const formattedUsers = users.map((u) => ({
      id: u._id,
      fullName: u.fullName,        // ✅ fullName bhej rahe hain
      name: u.fullName,            // ✅ dono bhej do safety ke liye
      role: "Community Member",
      avatar: u.fullName?.charAt(0).toUpperCase() || "👤",
      joined: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          })
        : "Recently",
      badges: ["🌟 Member"],
      skills: ["Tech Fusion"],
    }));

    res.json(formattedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;