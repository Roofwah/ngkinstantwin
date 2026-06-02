function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;
  const password = process.env.ADMIN_PASSWORD || 'changeme';
  if (token === password) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { adminAuth };
