import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUserInjured,
  FaUserFriends,
  FaCalendarAlt,
  FaChartLine,
} from "react-icons/fa";
import { FaRegCalendarCheck } from "react-icons/fa6";

const navItems = [
  { to: "/doctor",                label: "Dashboard",        icon: FaCalendarAlt,    exact: true },
  { to: "/doctor/form",           label: "New Patient",      icon: FaUserInjured },
  { to: "/doctor/patients",       label: "Patient Records",  icon: FaUserFriends },
  { to: "/doctor/followups",      label: "Follow-ups",       icon: FaCalendarAlt },
  { to: "/doctor/analytics",      label: "Statistics",       icon: FaChartLine },
  { to: "/doctor/appointments",   label: "Appointments",     icon: FaRegCalendarCheck },
];

const DoctorLayout = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6">
      <div className="flex gap-6 py-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden sm:block">
          <div className="sticky top-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Doctor Console</h2>
              <p className="text-sm text-gray-500">Quick navigation</p>
            </div>

            <nav className="space-y-1">
              {navItems.map(({ to, label, icon: Icon, exact }) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <NavLink
                    to={to}
                    end={exact}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
                        isActive
                          ? "bg-teal-50 border-teal-200 text-teal-700"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                      ].join(" ")
                    }
                  >
                    <Icon className="text-xl" />
                    <span className="font-medium">{label}</span>
                  </NavLink>
                </motion.div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;
