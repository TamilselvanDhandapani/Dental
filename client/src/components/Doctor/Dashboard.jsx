import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserInjured, FaUserFriends, FaCalendarAlt, FaTooth, FaChartLine } from 'react-icons/fa';
import { FaRegCalendarCheck } from "react-icons/fa6";
import { motion } from 'framer-motion';

const Dashboard = () => {
  const cards = [
    {
      icon: <FaUserInjured className="text-4xl text-teal-600" />,
      title: "New Patient",
      description: "Register a new patient",
      link: "/form",
      color: "bg-teal-50 hover:bg-teal-100 border-teal-200"
    },
    {
      icon: <FaUserFriends className="text-4xl text-blue-600" />,
      title: "Patient Records",
      description: "View and manage patient list",
      link: "/patients",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200"
    },
    {
      icon: <FaCalendarAlt className="text-4xl text-purple-600" />,
      title: "Follow-ups",
      description: "Manage today's schedule",
      link: "/followups",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200"
    },
    {
      icon: <FaChartLine className="text-4xl text-green-600" />,
      title: "Statistics",
      description: "Practice analytics",
      link: "/analytics",
      color: "bg-green-50 hover:bg-green-100 border-green-200"
    },
    {
      icon: <FaRegCalendarCheck className="text-4xl text-indigo-600" />,
      title: "Appointments",
      description: "Manage patient appointments",
      link: "/appointments",
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      
      </div>

     

      {/* Quick Actions */}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.03 }}
          >
            <Link
              to={card.link}
              className={`${card.color} p-6 rounded-xl shadow-sm border transition-all duration-300 flex flex-col items-center text-center h-full hover:shadow-md`}
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