const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} = require("../lib/errors");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const SECRET = process.env.JWT_SECRET;

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new ValidationError("email, password and name are required");
    }
    console.log("Email, username and password ok...");

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }
    console.log("email ok....");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });
    console.log("User created....");

    //Token
    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
    res.status(201).json({
      message: "User registered successfully",
      token,
    });
  }),
);

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError("email and password are required");
  }
  console.log("Email and password ok...");
  const user = await prisma.user.findUnique({ where: { email } });

  //User exist
  if (!user) {
    throw new ValidationError("Invalid credentials");
  }
  //console.log("User found...");
  //Password is ok
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new ValidationError("Invalid credentials");
  }
  //console.log("Password ok...");
  //Token
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
  res.json({ token });
});

module.exports = router;
