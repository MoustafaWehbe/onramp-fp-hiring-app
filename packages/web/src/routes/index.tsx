import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { RecruiterLayout } from "../layouts/RecruiterLayout";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { OAuthCallback } from "../pages/auth/OAuthCallback";
import { SelectRolePage } from "../pages/auth/SelectRolePage";
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
import { RecruiterCandidatesPage } from "../pages/recruiter/RecruiterCandidatesPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RecruiterCandidateDetailsPage } from "../pages/recruiter/RecruiterCandidateDetailsPage";
import { RecruiterCreateCompanyPage } from "../pages/recruiter/RecruiterCreateCompanyPage";
import { RecruiterCreateJobPage } from "../pages/recruiter/RecruiterCreateJobPage";
import { RecruiterScorecardTemplatesPage } from "../pages/recruiter/RecruiterScorecardTemplatesPage";
import { RecruiterJobDetailsPage } from "../pages/recruiter/RecruiterJobDetailsPage";
import { RecruiterEditJobPage } from "../pages/recruiter/RecruiterEditJobPage";
import { RecruiterCalendarPage } from "../pages/recruiter/RecruiterCalendarPage";
import { RecruiterSettingsPage } from "../pages/recruiter/RecruiterSettingsPage";
import { RecruiterUpgradePage } from "../pages/recruiter/RecruiterUpgradePage";
import { PublicCareerPage } from "../pages/PublicCareerPage";
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Provider round-trip: the API redirects the browser back here. */}
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/auth/select-role" element={<SelectRolePage />} />
      </Route>

      <Route element={<AppLayout />}>
        {/* Public routes — browsable without an account */}
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/careers/:companyId" element={<PublicCareerPage />} />

        {/* Candidate workspace */}
        <Route element={<ProtectedRoute allowedRoles={["candidate"]} />}>
          <Route path="/candidate" element={<CandidateHomePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
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

      {/* Recruiter workspace — its own sidebar shell, not AppLayout's top nav. */}
      <Route element={<RecruiterLayout />}>
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
          <Route
            path="/recruiter/calendar"
            element={<RecruiterCalendarPage />}
          />
          <Route
            path="/recruiter/settings"
            element={<RecruiterSettingsPage />}
          />
          <Route
            path="/recruiter/candidates"
            element={<RecruiterCandidatesPage />}
          />
          <Route
            path="/recruiter/candidates/:id"
            element={<RecruiterCandidateDetailsPage />}
          />
          <Route
            path="/recruiter/company/create"
            element={<RecruiterCreateCompanyPage />}
          />
          <Route
            path="/recruiter/jobs/create"
            element={<RecruiterCreateJobPage />}
          />
          <Route
            path="/recruiter/jobs/:id"
            element={<RecruiterJobDetailsPage />}
          />
          <Route
            path="/recruiter/jobs/:id/edit"
            element={<RecruiterEditJobPage />}
          />
          <Route
            path="/recruiter/pipeline/:jobId"
            element={<RecruiterPipelinePage />}
          />
          <Route
            path="/recruiter/scorecard-templates"
            element={<RecruiterScorecardTemplatesPage />}
          />
          <Route
            path="/recruiter/upgrade"
            element={<RecruiterUpgradePage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
