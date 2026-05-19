//const { expect } = require("vitest");
const {
  resetDb,
  registerAndLogin,
  createQuestion,
  request,
  app,

  prisma,
} = require("./helpers");

beforeEach(resetDb);

describe("question tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown question", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions/999999999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("returns 400 for invalid question body", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "", answer: "" });
    expect(res.status).toBe(400);
  });
  it("retunrs 200 when seaching full list of questions", async () => {
    const token = await registerAndLogin();
    await createQuestion(token);

    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("returns 404 for deleting without id", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .delete("/api/questions/")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 when updating own question", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token);

    const res = await request(app)
      .put(`/api/questions/${q.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Updated", answer: "New", keywords: [] });

    expect(res.status).toBe(200);
    expect(res.body.question).toBe("Updated");
  });

  it("return 201 when anwsering wrong to question", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token);

    const res = await request(app)
      .post(`/api/questions/${q.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "O" }); // T

    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(false);
  });

  it("return 201 when anwsering correct to question", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token);

    const res = await request(app)
      .post(`/api/questions/${q.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "T" }); // T

    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(true);
  });
  it("returns correct page info", async () => {
    const token = await registerAndLogin();

    for (let i = 0; i < 15; i++) {
      await createQuestion(token);
    }

    const res = await request(app)
      .get("/api/questions?page=2&limit=5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
  });
  it("returns 401 for misspelled Authorization", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions")
      .set("Authorizations", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
  it("returns 401 for misspelled Bearer", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", `Beare ${token}`);

    expect(res.status).toBe(401);
  });

  it("creates question with different keywords", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        question: "Question",
        answer: "Anwser",
        keywords: ["huh", "hah"],
      });

    expect(res.status).toBe(201);
    expect(res.body.keywords.length).toBe(2);
  });
  it("returns 400 for invalid id formating", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions/abc")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("resets attempts with delete", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token);

    await request(app)
      .post(`/api/questions/${q.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "wrong" });

    const res = await request(app)
      .delete(`/api/questions/${q.id}/play`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.attempted).toBe(false);
  });
  it("deleting object that does not exist", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token);

    const res = await request(app)
      .delete(`/api/questions/999999`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("deleting object", async () => {
    const token = await registerAndLogin();
    const q = await createQuestion(token);

    const res = await request(app)
      .delete(`/api/questions/${q.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
