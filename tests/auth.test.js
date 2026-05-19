const bcrypt = require("bcrypt");
const {
  resetDb,
  request,
  app,
  prisma,
  registerAndLogin,
  createQuestion,
} = require("./helpers");

beforeEach(resetDb);

describe("authorization tests", () => {
  it("registers, hashes the password, returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@a.io", password: "1234", name: "A" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));

    const user = await prisma.user.findUnique({ where: { email: "a@a.io" } });
    expect(user.password).not.toBe("1234"); // not plain
    expect(await bcrypt.compare("1234", user.password)).toBe(true); // valid hash
  });
  it("return 400 when login with invalid credentials", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "a@a.com", password: "1234", name: "A" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@a.com", password: "huh" });
    expect(res.status).toBe(400);
  });
  it("return 400 when login with missing password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "a@a.com", password: "1234", name: "A" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@a.com" });
    expect(res.status).toBe(400);
  });
  it("returns 409 when email already exists", async () => {
    await request(app).post("/api/auth/register").send({
      email: "a@a.com",
      password: "1234",
      name: "A",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "a@a.com",
      password: "1234",
      name: "A",
    });
    expect(res.status).toBe(409);
  });
  it("logs in successfully and returns token", async () => {
    await request(app).post("/api/auth/register").send({
      email: "a@a.com",
      password: "1234",
      name: "A",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "a@a.com",
      password: "1234",
    });
    expect(res.status).toBe(200);
  });
});
