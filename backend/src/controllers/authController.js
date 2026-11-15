const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, get, run } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const register = (req, res) => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const result = run(
    'INSERT INTO users (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)',
    [email.toLowerCase().trim(), passwordHash, full_name.trim(), phone || null]
  );

  const user = {
    id: Number(result.lastInsertRowid),
    email: email.toLowerCase().trim(),
    full_name: full_name.trim(),
    phone: phone || null
  };

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
};

const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone
    }
  });
};

const getMe = (req, res) => {
  // Return user info and all linked care profiles
  const profiles = query(`
    SELECT cp.id, cp.display_name, cp.dob, cp.emergency_phone,
           pm.role, pm.escalation_priority, pm.notify_escalations, pm.notify_appointments
    FROM profile_members pm
    JOIN care_profiles cp ON pm.care_profile_id = cp.id
    WHERE pm.user_id = ?
    ORDER BY pm.joined_at DESC
  `, [req.user.id]);

  res.json({
    user: req.user,
    profiles
  });
};

module.exports = {
  register,
  login,
  getMe
};
