const rateLimit = require('express-rate-limit');

function makeLimit({ windowMin, max, message }) {
  return rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,   // RateLimit-* headers
    legacyHeaders: false,
    message: { error: message, retry_after_minutes: windowMin },
    skipSuccessfulRequests: false,
  });
}

// Strict: login / register — prevents brute-force
const authLimiter = makeLimit({
  windowMin: 15,
  max: 10,
  message: 'Too many auth attempts. Please wait 15 minutes.',
});

// Moderate: secret creation and share creation
const writeLimiter = makeLimit({
  windowMin: 15,
  max: 60,
  message: 'Too many write requests. Please wait 15 minutes.',
});

// Generous: read endpoints (dashboard list, share view)
const readLimiter = makeLimit({
  windowMin: 15,
  max: 300,
  message: 'Too many requests. Please wait 15 minutes.',
});

// API key ingest — CI/CD friendly but still bounded
const ingestLimiter = makeLimit({
  windowMin: 15,
  max: 120,
  message: 'Ingest rate limit exceeded. Please wait 15 minutes.',
});

module.exports = { authLimiter, writeLimiter, readLimiter, ingestLimiter };
