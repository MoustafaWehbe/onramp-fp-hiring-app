import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Candidate {
  id: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
}

export function RecruiterCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCandidates() {
      try {
        const response = await fetch(
          "http://localhost:3000/api/candidate-profiles"
        );

        const data = await response.json();

        setCandidates(data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidates();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Candidates
      </h1>

      <p>Total candidates: {candidates.length}</p>

      <div className="space-y-4">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="rounded-lg border p-4"
          >
            <h2 className="font-semibold">
              {candidate.headline}
            </h2>

            <p>{candidate.location}</p>

            <p>{candidate.phone}</p>

            {candidate.resumeUrl && (
              <p>{candidate.resumeUrl}</p>
            )}

            <Link
              to={`/recruiter/candidates/${candidate.id}`}
              className="text-blue-600 underline"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}