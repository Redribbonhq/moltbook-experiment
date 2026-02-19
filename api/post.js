let lastFlip = null;
let lastTimestamp = 0;

export default async function handler(req, res) {
  const now = Date.now();
  const interval = 300000; // 5 minutes

  if (!lastFlip || now - lastTimestamp > interval) {
    lastFlip = Math.random() < 0.5 ? 0 : 1;
    lastTimestamp = now;
  }

  res.status(200).json({
    flip: lastFlip,
    timestamp: lastTimestamp
  });
}
