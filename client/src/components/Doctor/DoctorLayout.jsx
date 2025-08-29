import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
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
  FaClinicMedical
} from "react-icons/fa";
import { FaRegCalendarCheck } from "react-icons/fa6";

const navItems = [
  { to: "/doctor",               label: "Patients",       icon: FaUserFriends,    exact: true },
  { to: "/doctor/form",          label: "New Patient",    icon: FaUserInjured },
  { to: "/doctor/followups",     label: "Follow-ups",     icon: FaCalendarAlt },
  { to: "/doctor/appointments",  label: "Appointments",   icon: FaRegCalendarCheck },
  { to: "/doctor/analytics",     label: "Statistics",     icon: FaChartLine },
];

const DoctorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({
    name: "Dr. Sarah Johnson",
    role: "Cardiologist",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80"
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          x: sidebarOpen ? 0 : -280,
          boxShadow: sidebarOpen ? "0 0 20px rgba(0,0,0,0.15)" : "none"
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed lg:relative w-80 h-screen bg-gradient-to-b from-teal-900 to-teal-800 text-white z-50 lg:z-auto flex flex-col justify-between overflow-y-auto"
      >
        <div>
          {/* Logo and clinic name */}
          <div className="p-6 border-b border-teal-700 flex items-center gap-3">
            <div className="p-2 bg-teal-700 rounded-lg">
              <FaClinicMedical className="text-xl" />
            </div>
            <div>
              <h1 className="font-bold text-xl">MediCare Clinic</h1>
              <p className="text-teal-300 text-sm">Doctor Console</p>
            </div>
          </div>

          {/* User profile */}
          <div className="p-6 flex items-center gap-4 border-b border-teal-700">
            <img 
              src={user.avatar} 
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-teal-500"
            />
            <div>
              <h2 className="font-semibold">{user.name}</h2>
              <p className="text-teal-300 text-sm">{user.role}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <motion.div 
                key={to}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <NavLink
                  to={to}
                  end={exact}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-teal-700 text-white shadow-lg"
                        : "text-teal-100 hover:bg-teal-800 hover:text-white",
                    ].join(" ")
                  }
                >
                  <Icon className="text-lg" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              </motion.div>
            ))}
          </nav>
        </div>

        {/* Footer section */}
        <div className="p-4 border-t border-teal-700">
          <button className="flex items-center gap-4 px-4 py-3 rounded-xl text-teal-100 hover:bg-teal-800 hover:text-white w-full transition-colors">
            <FaCog className="text-lg" />
            <span className="font-medium">Settings</span>
          </button>
          <button className="flex items-center gap-4 px-4 py-3 rounded-xl text-teal-100 hover:bg-teal-800 hover:text-white w-full transition-colors">
            <FaSignOutAlt className="text-lg" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden"
              >
                {sidebarOpen ? <FaTimes /> : <FaBars />}
              </button>
              <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
                Doctor Dashboard
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="hidden md:flex items-center gap-3 p-2 rounded-lg">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
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
            className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;