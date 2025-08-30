import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../CreateClient"; // ← adjust if your path differs

// Icons
import {
  FaUser, FaSignOutAlt, FaTooth, FaSignInAlt, FaUserPlus, FaBars, FaTimes,
  FaUserInjured, FaUserFriends, FaCalendarAlt, FaChartLine, FaCog, FaClinicMedical,
} from "react-icons/fa";
import { FaRegCalendarCheck } from "react-icons/fa6";

/* --------------------------- Nav Items (Left Sidebar) --------------------------- */
const navItems = [
  { to: "/doctor",              label: "Patients",      icon: FaUserFriends, exact: true },
  { to: "/doctor/form",         label: "New Patient",   icon: FaUserInjured },
  { to: "/doctor/followups",    label: "Follow-ups",    icon: FaCalendarAlt },
  { to: "/doctor/appointments", label: "Appointments",  icon: FaRegCalendarCheck },
  { to: "/doctor/analytics",    label: "Statistics",    icon: FaChartLine },
];

const SIDEBAR_W = 320;

/* ---------------------------------- Navbar ---------------------------------- */
const TopNavbar = ({ onMenuClick, menuOpen = false }) => {
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
      setUser(session?.user ?? null);
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

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: mobile menu + brand */}
          <div className="flex items-center">
            {typeof onMenuClick === "function" && (
              <button
                onClick={() => onMenuClick(!menuOpen)}
                className="mr-2 p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden"
                aria-label={menuOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={menuOpen}
                aria-controls="doctor-sidebar"
              >
                {menuOpen ? <FaTimes /> : <FaBars />}
              </button>
            )}

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
              <FaTooth className="h-12 w-8 text-sky-500" />
              <Link to="/doctor" className="ml-2 text-lg font-bold text-gray-900">
                DentalCare
              </Link>
            </motion.div>
          </div>

          {/* Right: auth */}
          <div className="flex items-center">
            {!user ? (
              <div className="flex space-x-2">
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
                  className="ml-4 p-2 rounded-full text-gray-500 hover:text-sky-600 hover:bg-gray-100 focus:outline-none"
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

/* ------------------------------- Doctor Layout ------------------------------- */
const DoctorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const location = useLocation();

  // desktop vs mobile
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  // close on route change (mobile)
  useEffect(() => { if (!isDesktop) setSidebarOpen(false); }, [location.pathname, isDesktop]);

  // close with Esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const sidebarX = isDesktop ? 0 : (sidebarOpen ? 0 : -SIDEBAR_W);

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Top navbar (controls sidebar on mobile) */}
      <TopNavbar onMenuClick={setSidebarOpen} menuOpen={sidebarOpen} />

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex gap-6 py-6">
          {/* Mobile overlay (below navbar) */}
          <AnimatePresence>
            {sidebarOpen && !isDesktop && (
              <motion.button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setSidebarOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-x-0 top-16 bottom-0 bg-black/50 z-40 lg:hidden"
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <motion.aside
            id="doctor-sidebar"
            initial={false}
            animate={{ x: sidebarX, boxShadow: !isDesktop && sidebarOpen ? "0 0 20px rgba(0,0,0,0.15)" : "none" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={[
              "fixed lg:sticky z-50 lg:z-10",
              "top-16 lg:top-16",
              "h-[calc(100vh-4rem)]",
              "w-[320px]",
              "bg-gradient-to-b from-sky-900 to-sky-800 text-white",
              "overflow-y-auto rounded-r-2xl lg:rounded-2xl",
            ].join(" ")}
            aria-hidden={!isDesktop && !sidebarOpen}
          >
            <div className="flex flex-col justify-between h-full">
              <div>
                {/* Brand in sidebar */}
                <div className="p-6 border-b border-sky-700 flex items-center gap-3">
                  <div className="p-2 bg-sky-700 rounded-lg">
                    <FaClinicMedical className="text-xl" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">MediCare Clinic</h2>
                    <p className="text-sky-300 text-sm">Doctor Console</p>
                  </div>
                </div>

                {/* User */}
                <div className="p-6 flex items-center gap-4 border-b border-sky-700">
                  <img
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80"
                    alt="Doctor avatar"
                    className="w-12 h-12 rounded-full object-cover border-2 border-sky-500"
                    loading="lazy"
                  />
                  <div>
                    <h3 className="font-semibold">Dr. Sarah Johnson</h3>
                    <p className="text-sky-300 text-sm">Cardiologist</p>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                  {navItems.map(({ to, label, icon: Icon, exact }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={exact}
                      onClick={() => !isDesktop && setSidebarOpen(false)}
                      className={({ isActive }) =>
                        [
                          "group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none",
                          "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-800",
                          isActive
                            ? "bg-sky-700 text-white shadow-lg"
                            : "text-sky-100 hover:bg-sky-800 hover:text-white",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            aria-hidden="true"
                            className={[
                              "absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r",
                              isActive ? "bg-sky-300" : "bg-transparent",
                            ].join(" ")}
                          />
                          <Icon className="text-lg shrink-0" />
                          <span className="font-medium">{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-sky-700">
                <button
                  className="flex items-center gap-4 px-4 py-3 rounded-xl text-sky-100 hover:bg-sky-800 hover:text-white w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  type="button"
                >
                  <FaCog className="text-lg" />
                  <span className="font-medium">Settings</span>
                </button>
                <button
                  className="mt-2 flex items-center gap-4 px-4 py-3 rounded-xl text-sky-100 hover:bg-sky-800 hover:text-white w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  type="button"
                  onClick={() => {/* hook your logout */}}
                >
                  <FaSignOutAlt className="text-lg" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </motion.aside>

          {/* Right content */}
          <main className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DoctorLayout;
