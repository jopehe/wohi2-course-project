const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");
const { NotFoundError, ValidationError } = require("../lib/errors");
const { z } = require("zod");
const console = require("console");
const { isNumberObject } = require("util/types");

const QuizInput = z.object({
  //date: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new ValidationError("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function formatQuiz(quiz) {
  return {
    ...quiz,
    date: quiz.date.toISOString().split("T")[0],
    keywords: quiz.keywords.map((k) => k.name),
    userName: quiz.user ? quiz.user.name : null, // !!

    attempted: quiz.attempts && quiz.attempts.length > 0,

    solved: quiz.attempts?.some((a) => a.correct) || false,

    attemptCount: quiz._count?.attempts ?? 0,

    user: undefined, // !!
    _count: undefined,
    attempts: undefined,
  };
}

router.use(authenticate);

//api/questions, api/questions?keyword=funny&page&limit=5
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword ? { keywords: { some: { name: keyword } } } : {};

  const page = Math.max(1, parseInt(req.query.page) || 1);
  if (page < 1) {
    page = 1;
  }
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const [filteredQuestions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        keywords: true,
        user: true,
        attempts: { where: { userId: req.user.userId }, take: 1 },
        _count: { select: { attempts: true } },
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    data: filteredQuestions.map(formatQuiz),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/:qId", async (req, res) => {
  const id = Number(req.params.qId);
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("Id is not a number");
  }
  const existing = await prisma.question.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Question not found");
  }

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      keywords: true,
      user: true,
      attempts: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { attempts: true } },
    },
  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  res.json(formatQuiz(question));
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { question, answer, keywords } = QuizInput.parse(req.body);
    //const rawDate = req.body.date;
    if (question === "" || answer === "") {
      throw new ValidationError("Anwser and question are required");
    }

    const keywordsArray = Array.isArray(keywords)
      ? keywords
      : typeof keywords === "string"
        ? keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const newQuestion = await prisma.question.create({
      data: {
        question,
        answer,
        //date: rawDate,
        userId: req.user.userId,
        imageUrl,
        keywords: {
          connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
      include: {
        keywords: true,
        user: true,
        attempts: {
          where: { userId: req.user.userId },
          take: 1,
        },
        _count: {
          select: { attempts: true },
        },
      },
    });
    res.status(201).json(formatQuiz(newQuestion));
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: "Input was not valid",
        derails: err.error,
      });
    }
    console.log(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.put("/:qId", isOwner, upload.single("image"), async (req, res) => {
  const id = Number(req.params.qId);
  const { question, answer, keywords } = QuizInput.parse(req.body);

  const existing = await prisma.question.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Question not found");
  }

  const keywordsArray = Array.isArray(keywords)
    ? keywords
    : typeof keywords === "string"
      ? keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const updated = await prisma.question.update({
    where: { id },
    data: {
      question,
      answer,
      imageUrl,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: { userId: req.user.userId },
        take: 1,
      },
      _count: {
        select: { attempts: true },
      },
    },
  });

  res.json(formatQuiz(updated));
});

router.delete("/:qId", isOwner, async (req, res) => {
  const id = Number(req.params.qId);
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("Id is not a number");
  }

  if (isNaN(id) || !Number.isInteger(id)) {
    throw new ValidationError("Id not valid");
  }

  const existing = await prisma.question.findUnique({
    where: { id },
    include: { keywords: true, user: true },
  });

  if (!existing) {
    throw new NotFoundError("Question not found");
  }

  await prisma.attempt.deleteMany({
    where: { questionId: id },
  });

  await prisma.question.delete({
    where: { id },
  });

  res.json({
    message: "Question deleted successfully",
    question: formatQuiz(existing),
  });
});

router.post("/:qId/play", async (req, res) => {
  const questionId = Number(req.params.qId);
  const { answer } = req.body;

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!existing) {
    throw new NotFoundError("Question not found");
  }

  const correct =
    existing.answer.trim().toLowerCase() === answer.trim().toLowerCase();

  const attempt = await prisma.attempt.create({
    data: {
      userId: req.user.userId,
      questionId,
      correct,
    },
  });

  const attemptCount = await prisma.attempt.count({ where: { questionId } });

  res.status(201).json({
    id: attempt.id,
    questionId,
    correct,
    attemptCount,
    submittedAnswer: answer,
    correctAnswer: existing.answer,
    createdAt: attempt.attemptedAt,
  });
});

router.delete("/:qId/play", async (req, res) => {
  const questionId = Number(req.params.qId);
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!existing) {
    throw new NotFoundError("Question not found");
  }
  const attempt = await prisma.attempt.deleteMany({
    where: { userId: req.user.userId, questionId: questionId },
  });

  const attemptCount = await prisma.attempt.count({
    where: { questionId },
  });

  res.json({
    quizId: questionId,
    attempted: false,
    attemptCount,
  });
});

router.use((err, req, res, next) => {
  console.error("Error: " + err);
  if (
    err instanceof multer.MulterError ||
    err?.message === "Only image files are allowed"
  ) {
    return res.status(400).json({ message: err.message });
  }

  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  res.status(500).json({ message: err.message || "Server error" });
});

module.exports = router;
