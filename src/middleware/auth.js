const jwt = require("jsonwebtoken");
const { ForbiddenError, UnauthorizedError } = require("../lib/errors");
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  //console.log("Authenticating...");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }
  //console.log("Token found...");
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: ["HS256"] }); //????
    req.user = decoded;
    next();
  } catch (err) {
    req.log.warn({}, "Error authenticating");
    throw new ForbiddenError("Invalid or expired token");
  }
}
module.exports = authenticate;
