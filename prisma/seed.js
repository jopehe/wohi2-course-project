const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedPosts = [
  {
    question: "Hellow world",
    answer: "Hello all",
    date: new Date("2026-04-19"),
    keywords: ["funny", "cool"],
  },
  {
    question: "Hellow world 2",
    answer: "Hello all 2",
    date: new Date("2026-04-19"),
    keywords: ["hello", "cool"],
  },
  {
    question: "Hellow world 3",
    answer: "Hello all 3",
    date: new Date("2026-04-19"),
    keywords: ["funny", "slow"],
  },
  {
    question: "Hellow world 4",
    answer: "Hello all 4",
    date: new Date("2026-04-19"),
    keywords: ["bad", "cool"],
  },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of seedPosts) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        date: question.date,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
