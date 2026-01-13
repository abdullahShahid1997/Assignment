const cors = require("cors");
const { env } = require("./env");

const corsPolicy = cors({
  origin: env.UI_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Origin", "X-CSRF-TOKEN", "Authorization"],
  credentials: true,
});

module.exports = { corsPolicy };
