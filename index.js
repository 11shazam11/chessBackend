import dotenv from "dotenv";
dotenv.config();

import express from "express";
import db from "./config/db.js";
import tournamentRoutes from "./features/Tournaments/tournamentRoutes.js";
import userRoutes from "./features/Users/userRoutes.js";
import roundsRoutes from "./features/Rounds/RoundsRoutes.js";
import cookieParser from "cookie-parser";

import cors from "cors";


//setting up the server
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

app.use(cors({
  origin: ["http://localhost:5173","https://chessbackend-production-cffd.up.railway.app/"], // frontend URL
  credentials: true
}));
app.use("/api/users", userRoutes);
app.use("/api/tournaments",tournamentRoutes);
app.use("/api/rounds", roundsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

//demo test of deb running
app.use("/db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({ time: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(3000, () => {
  console.log("Server is listnening on port 3000");
});
