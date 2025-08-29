// src/components/Doctor/DoctorLayout.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserInjured,
  FaUserFriends,
  FaCalendarAlt,
  FaChartLine,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaCog,
  FaClinicMedical,
} from "react-icons/fa";
import { FaRegCalendarCheck } from "react-icons/fa6";

const navItems = [
  { to: "/doctor",              label: "Patients",      icon: FaUserFriends, exact: true },
  { to: "/doctor/form",         label: "New Patient",   icon: FaUserInjured },
  { to: "/doctor/followups",    label: "Follow-ups",    icon: FaCalendarAlt },
  { to: "/doctor/appointments", label: "Appointments",  icon: FaRegCalendarCheck },
  { to: "/doctor/analytics",    label: "Statistics",    icon: FaChartLine },
];

const SIDEBAR_W = 320; // px

const DoctorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const location = useLocation();

  // Track desktop vs mobile to lock sidebar open on desktop
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

  // Close the sidebar on navigation (mobile only)
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [location.pathname, isDesktop]);

  // Allow closing with Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleSidebar = () => setSidebarOpen((s) => !s);

  // Compute animated X position (only matters on mobile)
  const sidebarX = isDesktop ? 0 : sidebarOpen ? 0 : -SIDEBAR_W;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarX, boxShadow: !isDesktop && sidebarOpen ? "0 0 20px rgba(0,0,0,0.15)" : "none" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className={[
          "fixed lg:sticky lg:top-0",
          "z-50 lg:z-10",
          "h-screen lg:h-[100dvh]",
          "w-[320px]",
          "bg-gradient-to-b from-teal-900 to-teal-800 text-white",
          "overflow-y-auto",
        ].join(" ")}
        aria-hidden={!isDesktop && !sidebarOpen}
      >
        <div className="flex flex-col justify-between h-full">
          <div>
          
           
           

            {/* Nav */}
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
                      "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-800",
                      isActive
                        ? "bg-teal-700 text-white shadow-lg"
                        : "text-teal-100 hover:bg-teal-800 hover:text-white",
                    ].join(" ")
                  }
                >
                  {/* Left accent bar on active */}
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={[
                          "absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r",
                          isActive ? "bg-teal-300" : "bg-transparent",
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

          
        </div>
      </motion.aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col lg:ml-0">
     

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;
