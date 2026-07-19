import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Candidate {
  id: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
}

export function RecruiterCandidateDetailsPage() {
  const { id } = useParams();

  const [candidate, setCandidate] =
    useState<Candidate | null>(null);

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const response = await fetch(
          `http://localhost:3000/api/candidate-profiles/${id}`
        );

        const data = await response.json();

        setCandidate(data.data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchCandidate();
  }, [id]);

  if (!candidate) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">
        {candidate.headline}
      </h1>

      <p className="mt-4">
        <strong>Location:</strong> {candidate.location}
      </p>

      <p>
        <strong>Phone:</strong> {candidate.phone}
      </p>

      <p>
        <strong>Bio:</strong> {candidate.bio}
      </p>

    {candidate.resumeUrl && (
        <a 
       href={candidate.resumeUrl} target="_blank"
      rel="noopener noreferrer">View Resume
    </a>
    )}
    </div>
  );
}