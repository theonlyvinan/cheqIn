import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SentimentChart from "@/components/SentimentChart";
import { ArrowLeft, Headphones, Loader2, Pill } from "lucide-react";

const label = (s?: number | null) => (s == null ? "—" : ["", "Low", "Dim", "Steady", "Bright", "Radiant"][Math.round(s)] ?? "—");

const CenterSenior = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Resident");
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [meds, setMeds] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [audio, setAudio] = useState<Record<string, { url: string; text: string }>>({});
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth?next=/center"); return; }
      const [{ data: p }, { data: c }, { data: m }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", id!).maybeSingle(),
        supabase.from("check_ins").select("*").eq("user_id", id!).order("created_at", { ascending: false }).limit(60),
        supabase.from("medications").select("name, dosage, frequency").eq("user_id", id!).eq("active", true),
      ]);
      if (p?.full_name) setName(p.full_name);
      setCheckIns(c ?? []);
      setMeds(m ?? []);
      setLoading(false);
    })();
  }, [id]);

  const listen = async (checkInId: string) => {
    setGenerating(checkInId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-audio-summary", { body: { seniorUserId: id, checkInId } });
      if (error) throw error;
      if (!data?.audioContent) throw new Error("No audio received");
      setAudio((a) => ({ ...a, [checkInId]: { url: `data:audio/mpeg;base64,${data.audioContent}`, text: data.summaryText } }));
    } catch (e: any) {
      toast({ title: "Couldn't load recording", description: e?.message, variant: "destructive" });
    } finally { setGenerating(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const sessions = checkIns.map((c) => ({ timestamp: c.created_at, sentiment: { mood_rating: c.mood_rating, mental_health_score: c.mental_health_score, physical_health_score: c.physical_health_score, overall_score: c.overall_score } }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/center")} className="gap-2"><ArrowLeft className="w-4 h-4" />All residents</Button>
        <h1 className="text-2xl font-semibold">{name}</h1>

        {checkIns.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No check-ins to show. The resident may not have checked in yet or has stopped sharing.</Card>}
        {checkIns.length > 0 && <SentimentChart sessions={sessions} />}

        {meds.length > 0 && (
          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2"><Pill className="w-5 h-5 text-primary" /><h2 className="font-semibold">Medications</h2></div>
            {meds.map((m, i) => <p key={i} className="text-sm">{m.name}{m.dosage && ` · ${m.dosage}`}{m.frequency && ` · ${m.frequency}`}</p>)}
          </Card>
        )}

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Check-ins</h2>
          {checkIns.map((c) => (
            <div key={c.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{format(new Date(c.created_at), "EEE, MMM d · h:mm a")}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="secondary">Mind {label(c.mental_health_score)}</Badge>
                    <Badge variant="secondary">Body {label(c.physical_health_score)}</Badge>
                    <Badge variant={c.overall_score != null && c.overall_score <= 2 ? "destructive" : "secondary"}>Overall {label(c.overall_score)}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2" disabled={generating === c.id} onClick={() => listen(c.id)}>
                    {generating === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}Listen
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide" : "Transcript"}</Button>
                </div>
              </div>
              {Array.isArray(c.concerns) && c.concerns.length > 0 && <p className="text-sm text-destructive">Concerns: {c.concerns.join("; ")}</p>}
              {Array.isArray(c.highlights) && c.highlights.length > 0 && <p className="text-sm text-muted-foreground">Highlights: {c.highlights.join("; ")}</p>}
              {audio[c.id] && (<><audio controls autoPlay src={audio[c.id].url} className="w-full" /><p className="text-xs text-muted-foreground">{audio[c.id].text}</p></>)}
              {open === c.id && <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded max-h-80 overflow-auto">{c.transcript}</pre>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default CenterSenior;
