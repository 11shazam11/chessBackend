// import dotenv from "dotenv";
// dotenv.config();

// import express from "express";
// import db from "./config/db.js";
// import tournamentRoutes from "./features/Tournaments/tournamentRoutes.js";
// import userRoutes from "./features/Users/userRoutes.js";
// import roundsRoutes from "./features/Rounds/RoundsRoutes.js";
// import cookieParser from "cookie-parser";

// import cors from "cors";

// //setting up the server
//   const app = express();

//   app.use(express.json());
//   app.use(cookieParser());

// app.use(cors({
//   origin: ["http://localhost:5173","https://chess-frontend-g1v8khcys-abhays-projects-c9dcfdc7.vercel.app/"], // frontend URL
//   credentials: true
// }));
// app.use("/api/users", userRoutes);
// app.use("/api/tournaments",tournamentRoutes);
// app.use("/api/rounds", roundsRoutes);

// app.use((err, req, res, next) => {
//   console.error(err);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// });

// //demo test of deb running
// app.use("/db", async (req, res) => {
//   try {
//     const result = await db.query("SELECT NOW()");
//     res.json({ time: result.rows[0] });
//   } catch (err) {
//     console.error("DB error:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, "0.0.0.0", () => console.log("running on", PORT));

// index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import db from "./config/db.js";
import tournamentRoutes from "./features/Tournaments/tournamentRoutes.js";
import userRoutes from "./features/Users/userRoutes.js";
import roundsRoutes from "./features/Rounds/RoundsRoutes.js";

const app = express();

/* ------------------------- CORS (MUST BE FIRST) ------------------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chesstourno.netlify.app/",
];

function isAllowed(origin) {
  if (!origin) return true; // Postman/curl/no-origin requests
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (origin.endsWith(".netlify.app")) return true; // allow any Netlify preview/prod
  return false;
}

const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (isAllowed(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// ✅ Apply CORS before anything else
app.use(corsMiddleware);

// ✅ Preflight handler (DEPLOY SAFE: no "*")
app.options(/.*/, corsMiddleware);

/* -------------------------- Body + Cookies -------------------------- */
app.use(express.json());
app.use(cookieParser());

/* ------------------------------ Routes ------------------------------ */
app.get("/ping", (req, res) => res.json({ ok: true }));

app.use("/api/users", userRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/rounds", roundsRoutes);

// Demo test of DB
app.get("/db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({ time: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* -------------------------- Error Handler -------------------------- */
app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ----------------------------- Listen ----------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("running on", PORT));
