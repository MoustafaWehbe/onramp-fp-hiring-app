import { CalendarDays, CheckCircle2, ExternalLink, Unplug } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  useCalendarConnection,
  useDisconnectCalendar,
} from "../../features/calendar/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";

const calendarErrors: Record<string, string> = {
  not_configured:
    "Google Calendar is not configured for this environment yet.",
  access_denied: "Google Calendar connection was cancelled.",
  invalid_state: "The calendar connection expired. Please try again.",
  missing_code: "Google did not return an authorization code. Please try again.",
  provider_error:
    "Google Calendar could not be connected. Check the account and try again.",
};

export function RecruiterSettingsPage() {
  const [searchParams] = useSearchParams();
  const connectionQuery = useCalendarConnection();
  const disconnect = useDisconnectCalendar();
  const callbackConnected = searchParams.get("calendar") === "connected";
  const errorCode = searchParams.get("calendar_error");

  function disconnectCalendar() {
    disconnect.mutate(undefined, {
      onSuccess: () => toast.success("Google Calendar disconnected."),
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't disconnect calendar.")),
    });
  }

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Recruiter settings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Calendar connections
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Connect the Google account that should own interview events. This is
          a separate Calendar consent from signing in to HireFlow.
        </p>

        {callbackConnected && (
          <p
            className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Google Calendar connected successfully.
          </p>
        )}
        {errorCode && (
          <p
            className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            {calendarErrors[errorCode] ?? calendarErrors.provider_error}
          </p>
        )}

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-primary/10 p-2 text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription className="mt-1">
                  Creates a 60-minute event, invites the candidate, and adds a
                  Google Meet conference whenever you schedule an interview.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {connectionQuery.isLoading ? (
              <div className="space-y-3" aria-label="Loading calendar connection">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-44" />
              </div>
            ) : connectionQuery.isError || !connectionQuery.data ? (
              <div>
                <p className="text-sm text-destructive" role="alert">
                  Couldn't load the calendar connection.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void connectionQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : connectionQuery.data.connected ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Connected
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {connectionQuery.data.googleEmail}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disconnectCalendar}
                  disabled={disconnect.isPending}
                >
                  <Unplug className="mr-2 h-4 w-4" aria-hidden="true" />
                  {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">
                  Not connected. Interview dates still save normally, but no
                  Google event or Meet link will be created.
                </p>
                {connectionQuery.data.configured ? (
                  <a
                    href="/api/recruiter/calendar/connect"
                    className={`${buttonVariants()} mt-4 gap-2`}
                  >
                    Connect Google Calendar
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    An administrator must configure Google OAuth credentials and
                    the calendar token-encryption key before calendars can be connected.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
