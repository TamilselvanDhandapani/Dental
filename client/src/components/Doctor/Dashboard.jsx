import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserInjured, FaUserFriends, FaCalendarAlt, FaTooth, FaChartLine, FaFileMedical, FaCog } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const cards = [
    {
      icon: <FaUserInjured className="text-4xl text-teal-500" />,
      title: "New Patient",
      description: "Register a new patient",
      link: "/form",
      color: "bg-teal-50"
    },
    {
      icon: <FaUserFriends className="text-4xl text-blue-500" />,
      title: "Patient Records",
      description: "View and manage patient list",
      link: "/patients",
      color: "bg-blue-50"
    },
    {
      icon: <FaCalendarAlt className="text-4xl text-purple-500" />,
      title: "Follow-ups",
      description: "Manage today's schedule",
      link: "/appointments",
      color: "bg-purple-50"
    },
   
    {
      icon: <FaChartLine className="text-4xl text-green-500" />,
      title: "Statistics",
      description: "Practice analytics",
      link: "/analytics",
      color: "bg-green-50"
    },
   
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50 mr-4">
              <FaUserFriends className="text-blue-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-800">12</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-teal-50 mr-4">
              <FaUserInjured className="text-teal-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">New Patients</p>
              <p className="text-2xl font-bold text-gray-800">3</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-50 mr-4">
              <FaTooth className="text-amber-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Procedures Today</p>
              <p className="text-2xl font-bold text-gray-800">7</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1  lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Link
              to={card.link}
              className={`${card.color} p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center h-full transition-all hover:shadow-md`}
            >
              <div className="mb-4">{card.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-1">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>

    
    </div>
  );
};

export default Dashboard;