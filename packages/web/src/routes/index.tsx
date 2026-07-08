import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { ApplicationsPage } from "../pages/applications/ApplicationsPage";
import { CandidateHomePage } from "../pages/candidate/CandidateHomePage";
import { HomePage } from "../pages/HomePage";
import { InterviewerHomePage } from "../pages/interviewer/InterviewerHomePage";
import { InterviewerPipelinePage } from "../pages/interviewer/InterviewerPipelinePage";
import { InterviewerSchedulePage } from "../pages/interviewer/InterviewerSchedulePage";
import { JobDetailPage } from "../pages/jobs/JobDetailPage";
import { JobsPage } from "../pages/jobs/JobsPage";
import { NotFound } from "../pages/NotFound";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { RecruiterDashboardPage } from "../pages/recruiter/RecruiterDashboardPage";
import { RecruiterJobsPage } from "../pages/recruiter/RecruiterJobsPage";
import { RecruiterPipelinePage } from "../pages/recruiter/RecruiterPipelinePage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<AppLayout />}>
        {/* Public routes — browsable without an account */}
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />

        {/* Candidate workspace */}
        <Route element={<ProtectedRoute allowedRoles={["candidate"]} />}>
          <Route path="/candidate" element={<CandidateHomePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Recruiter workspace */}
        <Route element={<ProtectedRoute allowedRoles={["recruiter"]} />}>
          <Route
            path="/recruiter"
            element={<Navigate to="/recruiter/dashboard" replace />}
          />
          <Route
            path="/recruiter/dashboard"
            element={<RecruiterDashboardPage />}
          />
          <Route
            path="/recruiter/pipeline"
            element={<RecruiterPipelinePage />}
          />
          <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
        </Route>

        {/* Interviewer workspace */}
        <Route element={<ProtectedRoute allowedRoles={["interviewer"]} />}>
          <Route path="/interviewer" element={<InterviewerHomePage />} />
          <Route
            path="/interviewer/pipeline"
            element={<InterviewerPipelinePage />}
          />
          <Route
            path="/interviewer/schedule"
            element={<InterviewerSchedulePage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
