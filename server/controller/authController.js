// config/supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Admin client (server only) — bypasses RLS and can call auth.admin.*
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Public client for end-user auth (password login, password reset, etc.)
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const isValidEmail = (addr) =>
  typeof addr === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr);

/**
 * REGISTER (no verification)
 * Creates an Auth user already confirmed, then inserts a profile row.
 */
const register = async (req, res) => {
  const { username, phone, email, password } = req.body;

  try {
    if (!username || !email || !password || !phone) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    // 1) Create an Auth user, already confirmed (no email verification)
    const { data: createRes, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true, // <-- key line: skip verification
        user_metadata: { username, phone, role: 'dentist' },
      });

    if (createErr) {
      const msg = /duplicate|already exists|email/i.test(createErr.message)
        ? 'Email already exists'
        : createErr.message;
      return res.status(400).json({ msg });
    }
    const authUser = createRes.user;
    if (!authUser) return res.status(500).json({ msg: 'Sign up failed' });

    // 2) Create profile row keyed by Auth user id
    const { error: insertErr } = await supabaseAdmin.from('users').insert({
      id: authUser.id,
      username,
      email: normalizedEmail,
      phone,
      // role defaults to 'dentist' in your schema
    });

    if (insertErr) {
      // Roll back auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      const msg = /duplicate key value|already exists|unique/i.test(insertErr.message)
        ? 'Email or phone already exists'
        : insertErr.message;
      return res.status(400).json({ msg });
    }

    return res.status(201).json({
      msg: 'Registered. You can log in now (no verification needed).',
      user: { id: authUser.id, email: normalizedEmail, username, phone },
    });
  } catch (err) {
    return res.status(500).json({ msg: 'Registration failed', error: err.message });
  }
};

/**
 * LOGIN (email/password)
 * Works immediately after register because the account is already confirmed.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) return res.status(400).json({ msg: error.message });

    return res.json({
      token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.user_metadata?.role || 'dentist',
      },
    });
  } catch (err) {
    return res.status(500).json({ msg: 'Login failed', error: err.message });
  }
};

/**
 * VERIFY OTP — not needed in this flow, but kept for compatibility.
 */
const verifyOtp = (_req, res) => {
  return res.json({ msg: 'Verification not required (email auto-confirmed).' });
};

/**
 * FORGOT PASSWORD / RESET PASSWORD
 * Still supported; users can reset without ever having verified earlier.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ msg: 'Email is required' });
    const normalizedEmail = String(email).trim().toLowerCase();

    const { error } = await supabasePublic.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: `${process.env.FRONTEND_URL}/#/reset-password` }
    );
    if (error) return res.status(400).json({ msg: error.message });

    return res.json({ msg: 'Password recovery email sent' });
  } catch (err) {
    return res.status(500).json({ msg: 'Failed to send reset link', error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'newPassword is required' });
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing recovery token' });
    }

    const supabaseWithToken = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { error } = await supabaseWithToken.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = /jwt|token|expired/i.test(error.message)
        ? 'Session expired. Request a new recovery link.'
        : error.message;
      return res.status(400).json({ success: false, message: msg });
    }

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Password reset failed', error: err.message });
  }
};

const resendOtp = (_req, res) =>
  res.json({ msg: 'Verification emails are not used (account is auto-confirmed).' });

module.exports = {
  register,
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
  resendOtp,
};
