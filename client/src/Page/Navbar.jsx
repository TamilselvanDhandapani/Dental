import { useEffect, useState } from "react";
import { supabase } from "../CreateClient";
import { motion } from "framer-motion";
import { FaUser, FaSignOutAlt, FaTooth, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import GDC from "../assets/gdc.png"

const Navbar = ({ onMenuClick, menuOpen = false }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data.session?.user ?? null);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    // Close mobile sidebar when navigating via top links
    if (typeof onMenuClick === "function" && menuOpen) onMenuClick(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName =
    user?.user_metadata?.username ??
    user?.email?.split("@")[0] ??
    "User";

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: brand only */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
           
            <Link to="/doctor" className="ml-2 text-lg font-bold text-gray-900">
              <img src={GDC} alt="Logo" className="w-24 h-18 inline-block mr-2" />
              
            </Link>
          </motion.div>

          {/* Right: auth (desktop) + mobile menu button on the far right */}
          <div className="flex items-center">
            {/* Logged-out actions: show from sm+ to keep room for the menu on tiny screens */}
            {!user ? (
              <div className="hidden sm:flex space-x-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/"
                    className="p-2 md:px-4 md:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                    aria-label="Sign In"
                  >
                    <FaSignInAlt className="md:mr-2" />
                    <span className="hidden md:inline">Sign In</span>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="p-2 md:px-4 md:py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 flex items-center"
                    aria-label="Sign Up"
                  >
                    <FaUserPlus className="md:mr-2" />
                    <span className="hidden md:inline">Sign Up</span>
                  </Link>
                </motion.div>
              </div>
            ) : (
              // Logged-in: hide username & logout on mobile; show on md+
              <div className="hidden md:flex items-center md:ml-6">
                <div className="flex items-center">
                  <FaUser className="h-5 w-5 text-gray-500" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {displayName}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="ml-4 p-2 rounded-full text-gray-500 hover:text-sky-600 hover:bg-gray-100 focus:outline-none"
                  title="Logout"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </motion.button>
              </div>
            )}

            {/* Mobile menu toggle on the RIGHT */}
            {typeof onMenuClick === "function" && (
              <button
                onClick={() => onMenuClick(!menuOpen)}
                className="ml-2 p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden"
                aria-label={menuOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={menuOpen}
                aria-controls="doctor-sidebar"
              >
                {menuOpen ? <FaTimes /> : <FaBars />}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;