import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Building2, Copy, Home, Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";

type Membership = { org_id: string; role: "org_manager" | "org_caregiver"; organizations: { id: string; name: string; invite_code: string } | null };
type SeniorLink = { id: string; org_id: string; senior_user_id: string; consent_status: string; organizations?: { name: string } | null };
type Latest = { user_id: string; created_at: string; overall_score: number | null; concerns: any };

const scoreLabel = (s?: number | null) => (s == null ? "—" : ["", "Low", "Dim", "Steady", "Bright", "Radiant"][Math.round(s)] ?? "—");

const Center = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [myLink, setMyLink] = useState<SeniorLink | null>(null);
  const [invites, setInvites] = useState<{ token: string; role: string; org_name: string }[]>([]);
  const [seniors, setSeniors] = useState<SeniorLink[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [latest, setLatest] = useState<Record<string, Latest>>({});
  const [caregivers, setCaregivers] = useState<{ user_id: string }[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; caregiver_user_id: string; senior_user_id: string }[]>([]);
  const [code, setCode] = useState("");
  const [orgForm, setOrgForm] = useState({ name: "", address: "", phone: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"senior" | "caregiver">("senior");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (e: any) => toast({ title: "Something went wrong", description: e?.message ?? String(e), variant: "destructive" });

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?next=/center"); return; }
    setUserId(user.id);

    const [{ data: mem }, { data: link }, { data: inv }] = await Promise.all([
      supabase.from("organization_members").select("org_id, role, organizations(id, name, invite_code)").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("organization_seniors").select("id, org_id, senior_user_id, consent_status, organizations(name)").eq("senior_user_id", user.id).maybeSingle(),
      supabase.rpc("my_pending_invites"),
    ]);
    setMembership(mem as any);
    setMyLink(link as any);
    setInvites((inv as any) ?? []);

    if (mem) {
      const orgId = (mem as any).org_id;
      const [{ data: srs }, { data: members }, { data: asg }] = await Promise.all([
        supabase.from("organization_seniors").select("id, org_id, senior_user_id, consent_status").eq("org_id", orgId),
        supabase.from("organization_members").select("user_id, role").eq("org_id", orgId),
        supabase.from("caregiver_assignments").select("id, caregiver_user_id, senior_user_id").eq("org_id", orgId),
      ]);
      let list = (srs ?? []) as SeniorLink[];
      if ((mem as any).role === "org_caregiver") {
        const mine = new Set((asg ?? []).filter((a) => a.caregiver_user_id === user.id).map((a) => a.senior_user_id));
        list = list.filter((s) => mine.has(s.senior_user_id));
      }
      setSeniors(list);
      setCaregivers((members ?? []).filter((m: any) => m.role === "org_caregiver"));
      setAssignments(asg ?? []);

      const ids = Array.from(new Set([...list.map((s) => s.senior_user_id), ...(members ?? []).map((m: any) => m.user_id)]));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        setNames(Object.fromEntries((profs ?? []).map((p) => [p.user_id, p.full_name || "Unnamed"])));
      }
      const approved = list.filter((s) => s.consent_status === "approved").map((s) => s.senior_user_id);
      if (approved.length) {
        const { data: cis } = await supabase.from("check_ins").select("user_id, created_at, overall_score, concerns")
          .in("user_id", approved).order("created_at", { ascending: false }).limit(500);
        const map: Record<string, Latest> = {};
        (cis ?? []).forEach((c: any) => { if (!map[c.user_id]) map[c.user_id] = c; });
        setLatest(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-accept invite links
  useEffect(() => {
    const token = params.get("invite");
    if (!token || loading) return;
    (async () => {
      const { data, error } = await supabase.rpc("accept_organization_invite", { _token: token });
      params.delete("invite"); setParams(params, { replace: true });
      if (error) return fail(error);
      toast({ title: "Invite accepted", description: data === "caregiver" ? "You are now caregiver staff." : "Please review the sharing request below." });
      load();
    })();
  }, [loading]);

  const run = async (fn: () => Promise<any>, msg: string) => {
    setBusy(true);
    try { const { error } = await fn(); if (error) throw error; toast({ title: msg }); await load(); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };

  const alerts = useMemo(() => {
    const now = Date.now();
    return seniors.flatMap((s) => {
      if (s.consent_status !== "approved") return [];
      const l = latest[s.senior_user_id];
      const reasons: string[] = [];
      if (!l || now - new Date(l.created_at).getTime() > 48 * 3600 * 1000) reasons.push("No check-in in 48 hours");
      if (l && l.overall_score != null && Math.round(l.overall_score) <= 2) reasons.push(`Wellbeing ${scoreLabel(l.overall_score)}`);
      if (l && Array.isArray(l.concerns) && l.concerns.length) reasons.push(`Concerns: ${l.concerns.slice(0, 2).join("; ")}`);
      return reasons.length ? [{ s, reasons }] : [];
    });
  }, [seniors, latest]);

  const isManager = membership?.role === "org_manager";
  const org = membership?.organizations;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/checkin")} className="gap-2"><Home className="w-4 h-4" />Back to check-in</Button>
          {org && <Badge variant="secondary">{isManager ? "Manager" : "Caregiver"} · {org.name}</Badge>}
        </div>

        {/* Pending invites for this person */}
        {invites.map((i) => (
          <Card key={i.token} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm"><strong>{i.org_name}</strong> invited you as {i.role === "caregiver" ? "caregiver staff" : "a resident"}.</p>
            <Button size="sm" disabled={busy} onClick={() => run(() => supabase.rpc("accept_organization_invite", { _token: i.token }) as any, "Invite accepted")}>Accept</Button>
          </Card>
        ))}

        {/* Senior side: consent */}
        {myLink && (
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">My care center: {myLink.organizations?.name}</h2></div>
            {myLink.consent_status === "approved" ? (
              <>
                <p className="text-sm text-muted-foreground">You are sharing your check-ins, wellbeing trends, medications and recordings with this center's manager and your assigned caregivers.</p>
                <Button variant="outline" disabled={busy} onClick={() => run(() => supabase.rpc("set_my_center_consent", { _approve: false }) as any, "Sharing stopped")}>Stop sharing</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">This center would like to see your check-ins, wellbeing trends, medications and listen to your recordings. Nothing is shared until you approve, and you can stop anytime.</p>
                <div className="flex gap-2">
                  <Button disabled={busy} onClick={() => run(() => supabase.rpc("set_my_center_consent", { _approve: true }) as any, "Sharing approved")}>Approve sharing</Button>
                  <Button variant="ghost" disabled={busy} onClick={() => run(() => supabase.from("organization_seniors").delete().eq("id", myLink.id) as any, "Left the center")}>Leave center</Button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Neither staff nor linked: choose */}
        {!membership && (
          <div className="grid md:grid-cols-2 gap-4">
            {!myLink && (
              <Card className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Join my care center</h2>
                <p className="text-sm text-muted-foreground">Enter the code your rehab or senior center gave you.</p>
                <Input placeholder="e.g. 7F3A9C21" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} />
                <Button disabled={busy || !code.trim()} onClick={() => run(() => supabase.rpc("join_organization_by_code", { _code: code }) as any, "Request sent")}>Join</Button>
              </Card>
            )}
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">I run a rehab / senior center</h2></div>
              <Input placeholder="Center name" value={orgForm.name} maxLength={200} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
              <Input placeholder="Address" value={orgForm.address} maxLength={300} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} />
              <Input placeholder="Phone" value={orgForm.phone} maxLength={40} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} />
              <Button disabled={busy || !orgForm.name.trim()} onClick={() => run(() => supabase.rpc("create_organization", { _name: orgForm.name, _address: orgForm.address, _phone: orgForm.phone }) as any, "Center created")}>Create center</Button>
            </Card>
          </div>
        )}

        {/* Staff dashboard */}
        {membership && (
          <>
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /><h2 className="text-lg font-semibold">Needs attention ({alerts.length})</h2></div>
              {alerts.length === 0 ? <p className="text-sm text-muted-foreground">Everyone looks okay right now.</p> : alerts.map(({ s, reasons }) => (
                <button key={s.id} onClick={() => navigate(`/center/senior/${s.senior_user_id}`)} className="w-full text-left p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                  <p className="font-medium">{names[s.senior_user_id] ?? "Resident"}</p>
                  <p className="text-sm text-muted-foreground">{reasons.join(" · ")}</p>
                </button>
              ))}
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Residents ({seniors.length})</h2></div>
              {seniors.length === 0 && <p className="text-sm text-muted-foreground">No residents yet.{isManager && " Share your center code or send invites below."}</p>}
              <div className="divide-y">
                {seniors.map((s) => {
                  const l = latest[s.senior_user_id];
                  const approved = s.consent_status === "approved";
                  const assigned = assignments.filter((a) => a.senior_user_id === s.senior_user_id);
                  return (
                    <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{names[s.senior_user_id] ?? "Resident"}</p>
                        <p className="text-xs text-muted-foreground">
                          {approved ? (l ? `Last check-in ${formatDistanceToNow(new Date(l.created_at), { addSuffix: true })} · ${scoreLabel(l.overall_score)}` : "No check-ins yet") : s.consent_status === "revoked" ? "Stopped sharing" : "Awaiting consent"}
                        </p>
                        {isManager && assigned.length > 0 && <p className="text-xs text-muted-foreground">Caregivers: {assigned.map((a) => names[a.caregiver_user_id] ?? "Caregiver").join(", ")}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {isManager && caregivers.length > 0 && (
                          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value="" onChange={(e) => {
                            const cg = e.target.value; if (!cg) return;
                            run(() => supabase.from("caregiver_assignments").insert({ org_id: s.org_id, caregiver_user_id: cg, senior_user_id: s.senior_user_id }) as any, "Caregiver assigned");
                          }}>
                            <option value="">Assign caregiver…</option>
                            {caregivers.filter((c) => !assigned.some((a) => a.caregiver_user_id === c.user_id)).map((c) => <option key={c.user_id} value={c.user_id}>{names[c.user_id] ?? "Caregiver"}</option>)}
                          </select>
                        )}
                        <Button size="sm" variant="outline" disabled={!approved} onClick={() => navigate(`/center/senior/${s.senior_user_id}`)}>View</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {isManager && org && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Invite</h2></div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">Center code for residents:</span>
                  <code className="px-2 py-1 rounded bg-muted font-mono">{org.invite_code}</code>
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(org.invite_code); toast({ title: "Code copied" }); }}><Copy className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input type="email" placeholder="Email address" className="max-w-xs" value={inviteEmail} maxLength={255} onChange={(e) => setInviteEmail(e.target.value)} />
                  <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                    <option value="senior">Resident</option>
                    <option value="caregiver">Caregiver</option>
                  </select>
                  <Button disabled={busy || !/^\S+@\S+\.\S+$/.test(inviteEmail)} onClick={async () => {
                    setBusy(true);
                    const { data, error } = await supabase.from("organization_invites")
                      .insert({ org_id: org.id, email: inviteEmail.trim().toLowerCase(), role: inviteRole, created_by: userId! }).select("token").single();
                    setBusy(false);
                    if (error) return fail(error);
                    setInviteLink(`${window.location.origin}/center?invite=${data.token}`);
                    setInviteEmail("");
                  }}>Create invite</Button>
                </div>
                {inviteLink && (
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">Send this link. It also appears automatically when they sign in with that Google email.</p>
                    <div className="flex items-center gap-2"><code className="px-2 py-1 rounded bg-muted text-xs break-all">{inviteLink}</code>
                      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: "Link copied" }); }}><Copy className="w-4 h-4" /></Button></div>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Center;
