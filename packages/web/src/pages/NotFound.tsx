import { Link } from "react-router-dom";
import { buttonVariants } from "../components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl">Page not found</p>
      <Link to="/jobs" className={buttonVariants({ variant: "outline" })}>
        Go to jobs
      </Link>
    </div>
  );
}
