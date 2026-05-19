require("dotenv").config();
const app = require("./app");
//const app = express();
const PORT = process.env.PORT || 3000;

const prisma = require("./lib/prisma");
//const pinoHttp = require("pino-http");
const logger = require("./lib/logger");

// Start the server
app.listen(PORT, () => {
  logger.info({ port: PORT }, `Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
