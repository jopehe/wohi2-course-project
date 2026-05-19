const express = require("express");
const app = express();

app.use(express.json());

//const prisma = require("./lib/prisma");
const quizRouter = require("./routes/quiz");
const authRouter = require("./routes/auth");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");
const { NotFoundError } = require("./lib/errors");
//const PORT = process.env.PORT || 3000;

const pinoHttp = require("pino-http");
const logger = require("./lib/logger");

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
  }),
);

app.use(express.static(path.join(__dirname, "..", "public")));

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/questions", quizRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);
module.exports = app;
