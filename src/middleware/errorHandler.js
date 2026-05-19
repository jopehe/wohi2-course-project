const multer = require("multer");
const { ZodError } = require("zod");
const { AppError } = require("../lib/errors");
const jwt = require("jsonwebtoken");

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ message: "Invalid input", issues: err.issues });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError
  ) {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ message: err.message, stack: err.stack });
} //{ message: "Internal server error" }

module.exports = errorHandler;
