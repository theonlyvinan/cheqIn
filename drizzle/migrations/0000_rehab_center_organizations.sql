CREATE TYPE public.org_role AS ENUM ('org_manager', 'org_caregiver');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE public.organization_seniors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  senior_user_id uuid NOT NULL UNIQUE,
  consent_status text NOT NULL DEFAULT 'pending',
  consented_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.caregiver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  caregiver_user_id uuid NOT NULL,
  senior_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caregiver_user_id, senior_user_id)
);

CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL,
  senior_user_id uuid NOT NULL,
  action text NOT NULL,
  check_in_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, DELETE ON public.organization_seniors TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.caregiver_assignments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.organization_invites TO authenticated;
GRANT SELECT, INSERT ON public.access_log TO authenticated;
GRANT ALL ON public.organizations, public.organization_members, public.organization_seniors,
  public.caregiver_assignments, public.organization_invites, public.access_log TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_seniors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user AND org_id = _org)
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user AND org_id = _org AND role = 'org_manager')
$$;

CREATE OR REPLACE FUNCTION public.can_view_senior(_viewer uuid, _senior uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_seniors os
    WHERE os.senior_user_id = _senior AND os.consent_status = 'approved'
      AND (
        public.is_org_manager(_viewer, os.org_id)
        OR EXISTS (SELECT 1 FROM public.caregiver_assignments ca
                   WHERE ca.org_id = os.org_id AND ca.caregiver_user_id = _viewer AND ca.senior_user_id = _senior)
      )
  )
$$;

-- Profile names visible to fellow staff and to managers of linked seniors (including pending)
CREATE OR REPLACE FUNCTION public.can_view_org_profile(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_senior(_viewer, _target)
    OR EXISTS (SELECT 1 FROM public.organization_seniors os
               WHERE os.senior_user_id = _target AND public.is_org_manager(_viewer, os.org_id))
    OR EXISTS (SELECT 1 FROM public.organization_members a
               JOIN public.organization_members b ON a.org_id = b.org_id
               WHERE a.user_id = _viewer AND b.user_id = _target)
$$;

-- Policies
CREATE POLICY "Members and linked seniors view org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id)
         OR EXISTS (SELECT 1 FROM public.organization_seniors os WHERE os.org_id = id AND os.senior_user_id = auth.uid()));
CREATE POLICY "Managers update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_manager(auth.uid(), id)) WITH CHECK (public.is_org_manager(auth.uid(), id));

CREATE POLICY "Members view members" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Managers remove caregivers" ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_manager(auth.uid(), org_id) AND role = 'org_caregiver');

CREATE POLICY "Senior or staff view links" ON public.organization_seniors FOR SELECT TO authenticated
  USING (senior_user_id = auth.uid() OR public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Senior or manager remove link" ON public.organization_seniors FOR DELETE TO authenticated
  USING (senior_user_id = auth.uid() OR public.is_org_manager(auth.uid(), org_id));

CREATE POLICY "Members view assignments" ON public.caregiver_assignments FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Managers add assignments" ON public.caregiver_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_manager(auth.uid(), org_id)
    AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = caregiver_assignments.org_id AND m.user_id = caregiver_user_id)
    AND EXISTS (SELECT 1 FROM public.organization_seniors s WHERE s.org_id = caregiver_assignments.org_id AND s.senior_user_id = caregiver_assignments.senior_user_id));
CREATE POLICY "Managers remove assignments" ON public.caregiver_assignments FOR DELETE TO authenticated
  USING (public.is_org_manager(auth.uid(), org_id));

CREATE POLICY "Managers view invites" ON public.organization_invites FOR SELECT TO authenticated
  USING (public.is_org_manager(auth.uid(), org_id));
CREATE POLICY "Managers create invites" ON public.organization_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_org_manager(auth.uid(), org_id) AND created_by = auth.uid() AND role IN ('senior','caregiver'));
CREATE POLICY "Managers delete invites" ON public.organization_invites FOR DELETE TO authenticated
  USING (public.is_org_manager(auth.uid(), org_id));

CREATE POLICY "Viewers log own access" ON public.access_log FOR INSERT TO authenticated
  WITH CHECK (viewer_user_id = auth.uid() AND public.can_view_senior(auth.uid(), senior_user_id));
CREATE POLICY "Senior or viewer sees access log" ON public.access_log FOR SELECT TO authenticated
  USING (viewer_user_id = auth.uid() OR senior_user_id = auth.uid());

-- Read-only staff access to senior data (consent required)
CREATE POLICY "Center staff view consenting senior check-ins" ON public.check_ins FOR SELECT TO authenticated
  USING (public.can_view_senior(auth.uid(), user_id));
CREATE POLICY "Center staff view org profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.can_view_org_profile(auth.uid(), user_id));
CREATE POLICY "Center staff view consenting senior medications" ON public.medications FOR SELECT TO authenticated
  USING (public.can_view_senior(auth.uid(), user_id));
CREATE POLICY "Center staff view consenting senior medication logs" ON public.medication_logs FOR SELECT TO authenticated
  USING (public.can_view_senior(auth.uid(), user_id));

-- RPCs
CREATE OR REPLACE FUNCTION public.create_organization(_name text, _address text, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(trim(_name), '') = '' OR length(_name) > 200 THEN RAISE EXCEPTION 'Center name is required'; END IF;
  INSERT INTO public.organizations (name, address, phone, created_by)
  VALUES (trim(_name), nullif(trim(_address), ''), nullif(trim(_phone), ''), auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.organization_members (org_id, user_id, role) VALUES (_id, auth.uid(), 'org_manager');
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.join_organization_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO _org FROM public.organizations WHERE invite_code = upper(trim(_code));
  IF _org IS NULL THEN RAISE EXCEPTION 'Invalid center code'; END IF;
  INSERT INTO public.organization_seniors (org_id, senior_user_id, consent_status)
  VALUES (_org, auth.uid(), 'pending')
  ON CONFLICT (senior_user_id) DO UPDATE SET org_id = EXCLUDED.org_id, consent_status = 'pending', consented_at = NULL;
  RETURN _org;
END $$;

CREATE OR REPLACE FUNCTION public.accept_organization_invite(_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.organization_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.organization_invites WHERE token = _token AND status = 'pending' AND expires_at > now();
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invite is invalid or expired'; END IF;
  IF lower(_inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'This invite was sent to a different email address';
  END IF;
  IF _inv.role = 'caregiver' THEN
    INSERT INTO public.organization_members (org_id, user_id, role) VALUES (_inv.org_id, auth.uid(), 'org_caregiver')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO public.organization_seniors (org_id, senior_user_id, consent_status)
    VALUES (_inv.org_id, auth.uid(), 'pending')
    ON CONFLICT (senior_user_id) DO UPDATE SET org_id = EXCLUDED.org_id, consent_status = 'pending', consented_at = NULL;
  END IF;
  UPDATE public.organization_invites SET status = 'accepted' WHERE id = _inv.id;
  RETURN _inv.role;
END $$;

CREATE OR REPLACE FUNCTION public.set_my_center_consent(_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.organization_seniors
  SET consent_status = CASE WHEN _approve THEN 'approved' ELSE 'revoked' END,
      consented_at = CASE WHEN _approve THEN now() ELSE NULL END
  WHERE senior_user_id = auth.uid();
END $$;

-- Invites visible to the invitee (by email) so the app can show pending invites
CREATE OR REPLACE FUNCTION public.my_pending_invites()
RETURNS TABLE (token text, role text, org_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.token, i.role, o.name FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.status = 'pending' AND i.expires_at > now()
    AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

REVOKE EXECUTE ON FUNCTION public.create_organization(text,text,text), public.join_organization_by_code(text),
  public.accept_organization_invite(text), public.set_my_center_consent(boolean), public.my_pending_invites() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_organization(text,text,text), public.join_organization_by_code(text),
  public.accept_organization_invite(text), public.set_my_center_consent(boolean), public.my_pending_invites() TO authenticated;

CREATE INDEX ON public.organization_members (user_id);
CREATE INDEX ON public.caregiver_assignments (senior_user_id);
CREATE INDEX ON public.access_log (senior_user_id);