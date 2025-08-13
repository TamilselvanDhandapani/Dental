// config/supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const isValidEmail = (addr) =>
    typeof addr === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr);

const register = async (req, res) => {
    const { username, phone, email, password } = req.body;

    try {
        if (!username || !email || !password) {
            return res.status(400).json({ msg: "Missing required fields" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ msg: "Invalid email format" });
        }

        const normalizedEmail = email.toLowerCase();

        const { data: signUpData, error: signUpErr } =
            await supabaseAdmin.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                    data: { username, phone, role: "dentist" },
                    emailRedirectTo: process.env.FRONTEND_URL,
                },
            });
        if (signUpErr) return res.status(400).json({ msg: signUpErr.message });

        const authUser = signUpData.user;
        if (!authUser) return res.status(500).json({ msg: "Sign up failed" });

        const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            {
                user_metadata: {
                    name: username,
                    username,
                    role: "dentist",
                    phone,
                },
            }
        );
        if (metaErr) {
            console.warn("updateUserById metadata error:", metaErr.message);
        }

        const { error: insertErr } = await supabaseAdmin.from("users").insert({
            id: authUser.id,
            username,
            email: normalizedEmail,
            phone,
        });

        if (insertErr) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            const msg = /duplicate key value|already exists/i.test(insertErr.message)
                ? "Email or phone already exists"
                : insertErr.message;
            return res.status(400).json({ msg });
        }

        // await sendEmail(normalizedEmail, 'welcome', { username });

        return res.status(201).json({
            msg: "Registered. Check your email to confirm your account.",
        });
    } catch (err) {
        return res
            .status(500)
            .json({ msg: "Registration failed", error: err.message });
    }
};

const verifyOtp = async (req, res) => {
    const { email, token, type = "signup" } = req.body;
    try {
        if (!email || !token) {
            return res.status(400).json({ msg: "Email and token are required" });
        }

        const normalizedEmail = email.toLowerCase();
        const { data, error } = await supabaseAdmin.auth.verifyOtp({
            email: normalizedEmail,
            token,
            type,
        });
        if (error) return res.status(400).json({ msg: error.message });

        const userId = data.user?.id;
        if (userId) {
            await supabaseAdmin
                .from("users")
                .update({ is_verified: true })
                .eq("id", userId);
        }

        // await sendEmail(normalizedEmail, "welcome", {
        //   username: data.user?.user_metadata?.username || "",
        // });

        return res.json({ msg: "Email verified successfully" });
    } catch (err) {
        return res
            .status(500)
            .json({ msg: "Verification failed", error: err.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ msg: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase();
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        });
        if (error) {
            return res.status(400).json({ msg: error.message });
        }

        return res.json({
            token: data.session?.access_token,
            user: {
                id: data.user?.id,
                email: data.user?.email,
                role: data.user?.user_metadata?.role || "dentist",
            },
        });
    } catch (err) {
        return res.status(500).json({ msg: "Login failed", error: err.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const normalizedEmail = email.toLowerCase();
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
            normalizedEmail,
            {
                redirectTo: `${process.env.FRONTEND_URL}/#/reset-password`,
            }
        );
        if (error) return res.status(400).json({ msg: error.message });

        return res.json({ msg: "Password recovery email sent" });
    } catch (err) {
        return res
            .status(500)
            .json({ msg: "Failed to send reset link", error: err.message });
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

    // Create a Supabase client bound to this request's recovery access token
    const supabaseWithToken = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { error } = await supabaseWithToken.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = /jwt|token|expired/i.test(error.message) ? 'Session expired. Request a new recovery link.' : error.message;
      return res.status(400).json({ success: false, message: msg });
    }

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Password reset failed', error: err.message });
  }
};


const resendOtp = async (req, res) => {
    const { email, type = "signup" } = req.body;
    try {
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const normalizedEmail = email.toLowerCase();
        const { error } = await supabaseAdmin.auth.resend({
            type,
            email: normalizedEmail,
        });
        if (error) return res.status(400).json({ msg: error.message });

        return res.json({ msg: "Email sent. Check your inbox." });
    } catch (err) {
        return res.status(500).json({ msg: "Resend failed", error: err.message });
    }
};

module.exports = {
    register,
    login,
    verifyOtp,
    forgotPassword,
    resetPassword,
    resendOtp,
};
