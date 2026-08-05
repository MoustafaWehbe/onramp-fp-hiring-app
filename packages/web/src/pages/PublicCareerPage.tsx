import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
}

export function PublicCareerPage() {
  const { companyId } = useParams();

  const [data, setData] = useState<{
    company: Company;
    jobs: Job[];
  } | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPage() {
      try {
        const response = await fetch(
          `/api/public/companies/${companyId}/careers`,
        );

        if (!response.ok) {
          throw new Error("Company not found");
        }

        const result = await response.json();
        setData(result.data);
      } catch {
        setError("Company not found");
      }
    }

    void loadPage();
  }, [companyId]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      

     <h1
  style={{
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
  }}
>
  {data.company.name}
</h1>

<p
  style={{
    color: "#666",
    fontSize: "1.1rem",
    marginBottom: "2rem",
  }}
>
  {data.company.description}
</p>


    <h2 style={{
    fontSize: "1.75rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    }}>Open Positions</h2>

{data.jobs.length === 0 ? (
  <div
    style={{
      padding: "2rem",
      textAlign: "center",
      border: "1px solid #ddd",
      borderRadius: "8px",
      backgroundColor: "#fafafa",
    }}
  >
    <h3>No open positions available right now.</h3>
    <p>Please check again later.</p>
  </div>
) : ( data.jobs.map((job) => (
        <div
          key={job.id}
          style={{
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "1.5rem",
  marginBottom: "1.5rem",
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
}}>
          <h3 style={{
    fontSize: "1.4rem",
    marginBottom: "0.5rem",
  }}>{job.title}</h3>

<p style={{
    color: "#555",
    marginBottom: "1rem",}}>📍 {job.location}</p>

          <p>{job.description}</p>

          <Link
  to={`/jobs/${job.id}`}
  style={{
    display: "inline-block",
    padding: "10px 18px",
    backgroundColor: "#2563eb",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    marginTop: "1rem",
    fontWeight: "600",
  }}>Apply Now</Link>

        </div>
     ) ))}
    </div>
  );
}