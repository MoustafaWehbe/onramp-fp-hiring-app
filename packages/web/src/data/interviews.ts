import type { Interview } from "../types/interviews";

export const mockInterviews: Interview[] = [
  {
    id: "interview-avery",
    candidateName: "Avery Stone",
    role: "Senior Frontend Engineer",
    date: "Today",
    time: "2:00 PM",
    interviewType: "Technical screen",
    status: "Scheduled",
    feedbackStatus: "Not started",
  },
  {
    id: "interview-diego",
    candidateName: "Diego Torres",
    role: "DevOps Engineer",
    date: "Tomorrow",
    time: "11:30 AM",
    interviewType: "Systems review",
    status: "Scheduled",
    feedbackStatus: "Not started",
  },
  {
    id: "interview-nina",
    candidateName: "Nina Patel",
    role: "Product Designer",
    date: "Yesterday",
    time: "4:00 PM",
    interviewType: "Portfolio review",
    status: "Needs feedback",
    feedbackStatus: "Pending",
  },
];
