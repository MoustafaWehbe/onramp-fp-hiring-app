import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Hireflow helps thoughtful teams and candidates meet clearly.</p>
        <div className="flex gap-4">
          <Link className="hover:text-foreground" to="/jobs">
            Jobs
          </Link>
          <Link className="hover:text-foreground" to="/applications">
            Applications
          </Link>
          <Link className="hover:text-foreground" to="/profile">
            Profile
          </Link>
        </div>
      </div>
    </footer>
  );
}
