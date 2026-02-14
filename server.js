const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use("/api", apiLimiter);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server & Postman
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "https://www.pasameme.in",
        "https://pasameme.in",
        "http://localhost:5173",
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// 🔥 THIS IS THE KEY FIX FOR RENDER
app.options("*", cors({
  origin: [
    "https://www.pasameme.in",
    "https://pasameme.in",
    "http://localhost:5173",
    "https://meme-ayodhya-1.onrender.com"
  ],
  credentials: true,
}));


// ===================== MIDDLEWARE =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================== DB & ROUTES =====================
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const headerRoutes = require("./routes/headerRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const priceRoutes = require("./routes/priceRoutes");
const priceWS = require("./websocket/priceWebSocket");

// connectDB(); // Called in startServer

app.get("/", (req, res) => {
  res.status(200).send("PasaMeme API Live");
});

app.use("/api/auth", authRoutes);
app.use("/api/header", headerRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/prices", priceRoutes);

// ===================== SERVER =====================
const server = http.createServer(app);

if (priceWS?.init) {
  priceWS.init(server);
}

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
  );
};

startServer();
