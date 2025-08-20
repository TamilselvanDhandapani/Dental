import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";


import Login from "./AuthPages/Login";
import ForgotPassword from "./AuthPages/ForgotPassword";
import ResetPassword from "./AuthPages/ResetPassword";
import Register from "./AuthPages/Register";
import VerifyOtp from "./AuthPages/VerifyOtp";
import EmailConfirmed from "./AuthPages/EmailConfirmed";


import Navbar from "./Page/Navbar";
import Dashboard from "./components/Doctor/Dashboard";
import MultiStepForm from "./components/Forms/MultiStepForm";

import ProtectedRoute from "./ProtectedRoute";

import Patients from "./components/Doctor/Patients";
import PatientDetail from "./components/Doctor/PatientDetail";
import VisitDetail from "./components/Doctor/VisitDetail";
import Analytics from "./components/Doctor/Analytics";
import FollowUps from "./components/Doctor/FollowUps";
import AppointmentDashboard from "./components/Doctor/Appointments";

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public routes */}

        <Route path="/" element={<Login />} />
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
        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/:visitId"
          element={
            <ProtectedRoute>
              <VisitDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/followups"
          element={
            <ProtectedRoute>
              <FollowUps />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <AppointmentDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
