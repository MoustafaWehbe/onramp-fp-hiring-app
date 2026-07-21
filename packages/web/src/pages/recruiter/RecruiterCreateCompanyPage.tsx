import { useState } from "react";

export function RecruiterCreateCompanyPage() {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    try {
     const response = await fetch(
  "http://localhost:3000/api/companies",
  {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      website,
      description,
      logoUrl,
    }),
  }
);

      if (!response.ok) {
       const errorText = await response.text();
       alert(errorText);
       return;
    }
      alert("Company created!");
    } catch (error) {
  console.error(error);
  alert(String(error));
}
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="mb-6 text-3xl font-bold">
        Create Company
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          className="w-full rounded border p-2"
          placeholder="Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <textarea
          className="w-full rounded border p-2"
          placeholder="Description"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Logo URL"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />

        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Create Company
        </button>
      </form>
    </div>
  );
}