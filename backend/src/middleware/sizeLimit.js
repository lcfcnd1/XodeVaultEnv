// Plaintext is hex-encoded before sending: each byte → 2 hex chars.
// So a hex string of length N represents N/2 bytes of original plaintext.
const MAX_PLAINTEXT_BYTES = 3 * 1024 * 1024; // 3 MB

function checkContentSize(req, res, next) {
  const { content } = req.body;
  if (!content) return next();

  // content is a hex string — each pair of chars is one byte
  const plaintextBytes = Math.ceil(content.length / 2);
  if (plaintextBytes > MAX_PLAINTEXT_BYTES) {
    return res.status(413).json({
      error: `Content exceeds the 3 MB limit (got ~${(plaintextBytes / 1024 / 1024).toFixed(2)} MB).`,
      limit_mb: 3,
    });
  }
  next();
}

module.exports = { checkContentSize, MAX_PLAINTEXT_BYTES };
