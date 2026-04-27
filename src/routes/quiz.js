const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

function formatQuiz(quiz) {
  return {
    ...quiz,
    date: quiz.date.toISOString().split("T")[0],
    keywords: quiz.keywords.map((k) => k.name),
  };
}

router.use(authenticate);

// GET
// /questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword ? { keywords: { some: { name: keyword } } } : {};

  const questions = await prisma.question.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" },
  });

  res.json(questions.map(formatQuiz));
});

// GET
// /questions/:id
router.get("/:qId", async (req, res) => {
  const id = Number(req.params.qId);

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  const question = await prisma.question.findUnique({
    where: { id },
    include: { keywords: true },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(formatQuiz(question));
});

// POST
// /questions
router.post("/", async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required",
    });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
      date: new Date(),
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatQuiz(newQuestion));
});

// PUT
// /questions/:id
router.put("/:qId", isOwner, async (req, res) => {
  const id = Number(req.params.qId);
  const { question, answer, keywords } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  const existing = await prisma.question.findUnique({
    where: { id },
  });

  if (!existing) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required",
    });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const updated = await prisma.question.update({
    where: { id },
    data: {
      question,
      answer,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });

  res.json(formatQuiz(updated));
});

// DELETE
// /questions/:id
router.delete("/:qId", isOwner, async (req, res) => {
  const id = Number(req.params.qId);

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  const existing = await prisma.question.findUnique({
    where: { id },
    include: { keywords: true },
  });

  if (!existing) {
    return res.status(404).json({ message: "Question not found" });
  }

  await prisma.question.delete({ where: { id } });

  res.json({
    message: "Question deleted successfully",
    question: formatQuiz(existing),
  });
});

module.exports = router;
