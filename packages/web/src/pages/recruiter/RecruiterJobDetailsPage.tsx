import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function RecruiterJobDetailsPage() {
  const { id } = useParams();
  type Job = {
  id: string;
  title: string;
  description: string;
  location?: string;
  status: string;
};

const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    async function fetchJob() {
      const response = await fetch(
        `http://localhost:3000/api/jobs/${id}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      setJob(data.data);
    }

    fetchJob();
  }, [id]);

  if (!job) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">
        {job.title}
      </h1>

      <p className="mt-4">
        {job.description}
      </p>

      <p className="mt-4">
        Location: {job.location}
      </p>

      <p className="mt-4">
        Status: {job.status}
      </p>
    </div>
  );
}