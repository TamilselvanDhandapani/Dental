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
            {/* Logo / clinic */}
            <div className="p-6 border-b border-teal-700 flex items-center gap-3">
              <div className="p-2 bg-teal-700 rounded-lg">
                <FaClinicMedical className="text-xl" />
              </div>
              <div>
                <h1 className="font-bold text-xl">MediCare Clinic</h1>
                <p className="text-teal-300 text-sm">Doctor Console</p>
              </div>
            </div>

            {/* User */}
            <div className="p-6 flex items-center gap-4 border-b border-teal-700">
              <img
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80"
                alt="Doctor avatar"
                className="w-12 h-12 rounded-full object-cover border-2 border-teal-500"
                loading="lazy"
              />
              <div>
                <h2 className="font-semibold">Dr. Sarah Johnson</h2>
                <p className="text-teal-300 text-sm">Cardiologist</p>
              </div>
            </div>

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

          {/* Footer actions */}
          <div className="p-4 border-t border-teal-700">
            <button
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-teal-100 hover:bg-teal-800 hover:text-white w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              type="button"
            >
              <FaCog className="text-lg" />
              <span className="font-medium">Settings</span>
            </button>
            <button
              className="mt-2 flex items-center gap-4 px-4 py-3 rounded-xl text-teal-100 hover:bg-teal-800 hover:text-white w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              type="button"
              onClick={() => {/* hook your logout */}}
            >
              <FaSignOutAlt className="text-lg" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={sidebarOpen}
                aria-controls="doctor-sidebar"
              >
                {sidebarOpen ? <FaTimes /> : <FaBars />}
              </button>
              <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
                Doctor Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="hidden md:flex items-center gap-3 p-2 rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80"
                  alt="Doctor avatar"
                  className="w-8 h-8 rounded-full object-cover"
                  loading="lazy"
                />
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-800">Dr. Sarah Johnson</p>
                  <p className="text-xs text-gray-500">Cardiologist</p>
                </div>
              </div>
            </div>
          </div>
        </header>

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
