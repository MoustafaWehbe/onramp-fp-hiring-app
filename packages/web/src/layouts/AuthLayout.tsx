import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Hireflow</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hiring workflows for thoughtful teams.
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
