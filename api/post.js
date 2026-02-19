export default async function handler(req, res) {
  const value = Math.random() < 0.5 ? 0 : 1;

  res.status(200).json({
    flip: value,
    timestamp: Date.now()
  });
}
