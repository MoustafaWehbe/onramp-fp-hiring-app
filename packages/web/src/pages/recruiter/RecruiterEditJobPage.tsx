import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function RecruiterEditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    async function fetchJob() {
      const response = await fetch(
        `http://localhost:3000/api/jobs/${id}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      setTitle(data.data.title);
      setDescription(data.data.description);
      setLocation(data.data.location ?? "");
    }

    fetchJob();
  }, [id]);

  async function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    await fetch(
      `http://localhost:3000/api/jobs/${id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          location,
        }),
      },
    );

    navigate("/recruiter/jobs");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl space-y-4 p-8"
    >
      <input
        value={title}
        onChange={(e) =>
          setTitle(e.target.value)
        }
        className="w-full rounded border p-2"
      />

      <textarea
        value={description}
        onChange={(e) =>
          setDescription(e.target.value)
        }
        className="w-full rounded border p-2"
      />

      <input
        value={location}
        onChange={(e) =>
          setLocation(e.target.value)
        }
        className="w-full rounded border p-2"
      />

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Save Changes
      </button>
    </form>
  );
}