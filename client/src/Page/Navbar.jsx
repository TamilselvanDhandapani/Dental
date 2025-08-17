import { useEffect, useState } from "react";
import { supabase } from "../CreateClient";
import { motion } from "framer-motion";
import { FaUser, FaSignOutAlt, FaTooth } from "react-icons/fa";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    // get current session on mount
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data.session?.user ?? null);
    })();

    // listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0 flex items-center"
          >
            <FaTooth className="h-6 w-6 text-teal-500" />
            <Link to="/" className="ml-2 text-xl font-bold text-gray-900">
             Gugan DentalCare
            </Link>
          </motion.div>

          {/* Navigation Links */}
         

          {/* Auth Section */}
          <div className="flex items-center">
            {!user ? (
              <div className="flex space-x-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/"
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            ) : (
              <div className="ml-4 flex items-center md:ml-6">
                <div className="flex items-center">
                  <FaUser className="h-5 w-5 text-gray-500" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {user.user_metadata?.username || user.email.split("@")[0]}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="ml-4 p-2 rounded-full text-gray-500 hover:text-teal-600 hover:bg-gray-100 focus:outline-none"
                  title="Logout"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
