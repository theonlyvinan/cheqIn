import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "invalid" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } }
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.valid !== false) {
          setEmail(json?.email ?? null);
          setState("valid");
        } else {
          setState("invalid");
        }
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>
            {state === "loading" && "Checking your link..."}
            {state === "valid" && `Unsubscribe ${email ?? "this address"} from Cheq-In summary emails?`}
            {state === "invalid" && "This unsubscribe link is invalid or has already been used."}
            {state === "done" && "You have been unsubscribed. You will no longer receive these emails."}
            {state === "error" && "Something went wrong. Please try again later."}
          </CardDescription>
        </CardHeader>
        {state === "valid" && (
          <CardContent>
            <Button onClick={confirm} disabled={submitting} className="w-full">
              {submitting ? "Unsubscribing..." : "Confirm unsubscribe"}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Unsubscribe;
