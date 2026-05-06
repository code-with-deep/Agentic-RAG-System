import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./components/auth/AuthContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Layout } from "./components/layout/Layout";

// Public Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";

// Protected Pages
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import WorkspacePage from "./pages/WorkspacePage";
import DocumentsPage from "./pages/DocumentsPage";
import ComparePage from "./pages/ComparePage";
import EvaluationPage from "./pages/EvaluationPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" theme="dark" richColors />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Route: Onboarding (No Layout) */}
          <Route 
            path="/onboarding" 
            element={
              <AuthGuard>
                <OnboardingPage />
              </AuthGuard>
            } 
          />

          {/* Protected Routes with Layout */}
          <Route 
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
