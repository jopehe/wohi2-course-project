const express = require("express");
const router = express.Router();

const questions = require("../data/quiz");

// GET /quiz
// List all quizts
router.get("/questions", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json(questions);
  }

  const filteredPosts = questions.filter((quiz) =>
    quiz.keywords.includes(keyword.toLowerCase()),
  );

  res.json(filteredPosts);
});

//Get specific question
router.get("/questions/:qId", (req, res) => {
  const quizId = Number(req.params.qId);

  const quiz = questions.find((p) => p.id === quizId);

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  res.json(quiz);
});

// Create a new quiz
router.post("/questions", (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required",
    });
  }
  const maxId = Math.max(...questions.map((p) => p.id), 0);

  const newQuiz = {
    id: questions.length ? maxId + 1 : 1,
    question,
    answer,
  };
  questions.push(newQuiz);
  res.status(201).json(newQuiz);
});

// Edit a quiz !?
router.put("/questions/:qId", (req, res) => {
  const quizId = Number(req.params.qId);
  const { question, answer } = req.body;

  const quiz = questions.find((q) => q.id === quizId);

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  if (!question || !answer) {
    return res.json({
      message: "question and answer are required",
    });
  }

  quiz.question = question;
  quiz.answer = answer;

  res.json(quiz);
});

// Delete a quiz
router.delete("/questions/:qId", (req, res) => {
  const quizId = Number(req.params.qId);

  const quizIndex = questions.findIndex((p) => p.id === quizId);

  if (quizIndex === -1) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  const deletedQuiz = questions.splice(quizIndex, 1);

  res.json({
    message: "Quiz deleted successfully",
    post: deletedQuiz, //[0]
  });
});

module.exports = router;
