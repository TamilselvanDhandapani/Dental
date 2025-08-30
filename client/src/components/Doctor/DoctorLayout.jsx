import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../CreateClient"; // ← adjust if your path differs

// Icons
import {
  FaUser, FaSignOutAlt, FaTooth, FaSignInAlt, FaUserPlus, FaBars, FaTimes,
  FaUserInjured, FaUserFriends, FaCalendarAlt, FaChartLine,
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


/* ------------------------------- Doctor Layout ------------------------------- */
const DoctorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [authUser, setAuthUser] = useState(null); // for sidebar username
  const location = useLocation();
  const navigate = useNavigate();

  // fetch auth user for sidebar
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setAuthUser(data.session?.user ?? null);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthUser(session?.user ?? null);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

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

  // Slide from RIGHT on mobile, stay in place on desktop
  const sidebarX = isDesktop ? 0 : (sidebarOpen ? 0 : SIDEBAR_W);

  // Logout handler for sidebar button
  const handleSidebarLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName =
    authUser?.user_metadata?.username ??
    authUser?.email?.split("@")[0] ??
    "User";

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

          {/* Sidebar (RIGHT on mobile, LEFT sticky on desktop) */}
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
              "overflow-y-auto rounded-l-2xl lg:rounded-2xl", // rounded on the visible edge (left when docked on right)
              // Positioning: right on mobile, left on desktop
              "right-0 lg:right-auto lg:left-0",
            ].join(" ")}
            aria-hidden={!isDesktop && !sidebarOpen}
          >
            <div className="flex flex-col justify-between h-full">
              <div>
                {/* --- Brand removed from sidebar as requested --- */}

                {/* User (username only; photo removed) */}
                <div className="p-6 border-b border-sky-700">
                  <div className="flex items-center gap-3">
                    <FaUser className="text-xl" aria-hidden="true" />
                    <h3 className="font-semibold">{displayName}</h3>
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

              {/* Footer actions (only Logout; Settings removed) */}
              <div className="p-4 border-t border-sky-700">
                <button
                  className="flex items-center gap-4 px-4 py-3 rounded-xl text-sky-100 hover:bg-sky-800 hover:text-white w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  type="button"
                  onClick={handleSidebarLogout}
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
