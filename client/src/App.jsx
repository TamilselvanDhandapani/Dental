import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ImageKitProvider from "./components/Forms/ImageKitProvider";

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
import DoctorLayout from "./components/Doctor/DoctorLayout"; // ← new

const App = () => {
  return (
    <ImageKitProvider>
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

          {/* Protected / Doctor area with sidebar layout */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute>
                <DoctorLayout />
              </ProtectedRoute>
            }
          >
            {/* Right-pane routes */}
            <Route index element={<Dashboard />} /> {/* /doctor */}
            <Route path="form" element={<MultiStepForm />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="visits/:visitId" element={<VisitDetail />} />
            <Route path="followups" element={<FollowUps />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="appointments" element={<AppointmentDashboard />} />
          </Route>

         
           </Routes>
      </Router>
    </ImageKitProvider>
  );
};

export default App;
