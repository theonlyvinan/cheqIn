-- 1. Recreate table policies scoped to the authenticated role -------------

-- check_ins
DROP POLICY IF EXISTS "Users can view own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Family can view senior check-ins" ON public.check_ins;

CREATE POLICY "Users can view own check-ins"
  ON public.check_ins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins"
  ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family can view senior check-ins"
  ON public.check_ins FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_user_id = auth.uid()
      AND fm.senior_user_id = check_ins.user_id
  ));

-- medications
DROP POLICY IF EXISTS "Users can manage own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can view own medications" ON public.medications;

CREATE POLICY "Users can manage own medications"
  ON public.medications FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- medication_logs
DROP POLICY IF EXISTS "Users can view own medication logs" ON public.medication_logs;
DROP POLICY IF EXISTS "Users can insert own medication logs" ON public.medication_logs;

CREATE POLICY "Users can view own medication logs"
  ON public.medication_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medication logs"
  ON public.medication_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- family_members
DROP POLICY IF EXISTS "Seniors can manage their family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;

CREATE POLICY "Seniors can manage their family members"
  ON public.family_members FOR ALL TO authenticated
  USING (auth.uid() = senior_user_id)
  WITH CHECK (auth.uid() = senior_user_id);

CREATE POLICY "Users can view family members"
  ON public.family_members FOR SELECT TO authenticated
  USING (auth.uid() = senior_user_id OR auth.uid() = family_user_id);

-- report_settings (explicit WITH CHECK)
DROP POLICY IF EXISTS "Family members can manage own report settings" ON public.report_settings;

CREATE POLICY "Family members can manage own report settings"
  ON public.report_settings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = report_settings.family_member_id
      AND fm.family_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = report_settings.family_member_id
      AND fm.family_user_id = auth.uid()
  ));

-- 2. Lock down the internal trigger helper --------------------------------
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3. Storage: audio-summaries (private, owner + linked family) ------------
DROP POLICY IF EXISTS "Users can read own audio summaries" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own audio summaries" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio summaries" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio summaries" ON storage.objects;
DROP POLICY IF EXISTS "Family can read senior audio summaries" ON storage.objects;

CREATE POLICY "Users can read own audio summaries"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio-summaries'
         AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Family can read senior audio summaries"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio-summaries' AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_user_id = auth.uid()
      AND (fm.senior_user_id)::text = (storage.foldername(storage.objects.name))[1]
  ));

CREATE POLICY "Users can upload own audio summaries"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-summaries'
              AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own audio summaries"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audio-summaries'
         AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'audio-summaries'
              AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own audio summaries"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio-summaries'
         AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Storage: avatars — remove world-readable/listable access -------------
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Family can read senior avatar" ON storage.objects;

CREATE POLICY "Users can read their own avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars'
         AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Family can read senior avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_user_id = auth.uid()
      AND (fm.senior_user_id)::text = (storage.foldername(storage.objects.name))[1]
  ));

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
              AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars'
         AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars'
              AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars'
         AND (auth.uid())::text = (storage.foldername(name))[1]);
