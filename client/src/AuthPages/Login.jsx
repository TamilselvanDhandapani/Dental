import { useState, useEffect } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaTooth, FaUser, FaLock, FaArrowRight } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import 'aos/dist/aos.css';
import GDC from "../assets/gdc.png"

const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  ''; // e.g. '' if your server routes are proxied, else 'https://api.yourdomain.com'

const Login = () => {
  const [form, setForm] = useState({
    identifier: '', // username OR email
    password: ''
  });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/doctor');
    };
    checkSession();
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', type: '' });

    const identifier = form.identifier.trim();
    const password = form.password.trim();

    if (!identifier || !password) {
      setMsg({ text: 'Please enter username/email and password.', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      if (isEmail(identifier)) {
        // Email path: sign in directly with Supabase
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password
        });
        if (error) throw error;
      } else {
        // Username path: call backend, then set Supabase session on the client
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier, password })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.msg || 'Login failed');

        const { token, refresh_token } = json;
        if (!token || !refresh_token) {
          throw new Error('Invalid auth response from server.');
        }

        const { error: setErr } = await supabase.auth.setSession({
          access_token: token,
          refresh_token
        });
        if (setErr) throw setErr;
      }

      navigate('/doctor');
    } catch (error) {
      setMsg({
        text: error.message || 'Login failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center"
    >
      <motion.form
        onSubmit={onSubmit}
        variants={itemVariants}
        data-aos="fade-up"
        className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full"
      >
        <div className="flex flex-col items-center mb-6">
          <img src={GDC} alt="Logo" className="mb-2 w-24 h-24" />
          <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-500 mt-1">Sign in to your dental account</p>
        </div>

        <div className="space-y-4">
          {/* Username or Email */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Username or Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                placeholder="username or name@email.com"
                type="text"
                required
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                autoComplete="username"
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                placeholder="Enter your password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                autoComplete="current-password"
              />
            </div>
          </motion.div>
        </div>

        {/* Submit Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className={`w-full mt-6 py-3 rounded-lg font-semibold text-white transition-colors shadow-md flex items-center justify-center ${
            isLoading ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing In...
            </span>
          ) : (
            <span className="flex items-center">
              Sign In <FaArrowRight className="ml-2" />
            </span>
          )}
        </motion.button>

        {/* Forgot Password Link */}
        <motion.div variants={itemVariants} className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-teal-600 hover:text-teal-800 text-sm font-medium"
          >
            Forgot your password?
          </Link>
        </motion.div>

        {/* Message */}
        {msg.text && (
          <motion.div
            variants={itemVariants}
            className={`mt-4 p-3 rounded-lg text-center ${
              msg.type === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-teal-100 text-teal-700'
            }`}
          >
            {msg.text}
          </motion.div>
        )}
      </motion.form>
    </motion.div>
  );
};

export default Login;
