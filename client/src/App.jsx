import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { supabase } from "./CreateClient";

import Login from "./AuthPages/Login";
import ForgotPassword from "./AuthPages/ForgotPassword";
import ResetPassword from "./AuthPages/ResetPassword";
import Register from "./AuthPages/Register";
import VerifyOtp from "./AuthPages/VerifyOtp";
import EmailConfirmed from "./AuthPages/EmailConfirmed";

import Home from "./Page/Home";
import Navbar from "./Page/Navbar";
import Dashboard from "./components/Doctor/Dashboard";
import MultiStepForm from "./components/Forms/MultiStepForm";

import ProtectedRoute from "./ProtectedRoute";

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />

        {/* Private & Protected Routes */}
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/form"
          element={
            <ProtectedRoute>
              <MultiStepForm />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
