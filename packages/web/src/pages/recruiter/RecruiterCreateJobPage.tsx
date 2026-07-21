import { useState } from "react";

export function RecruiterCreateJobPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:3000/api/jobs",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            location: location || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText);
        return;
      }

      alert("Job created!");
    } catch (error) {
      console.error(error);
      alert(String(error));
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="mb-6 text-3xl font-bold">
        Create Job
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          className="w-full rounded border p-2"
          placeholder="Job Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded border p-2"
          placeholder="Job Description"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Create Job
        </button>
      </form>
    </div>
  );
}