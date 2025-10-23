-- Drop the broken policy that uses the wrong column
DROP POLICY IF EXISTS "profiles_select_own_or_for_role_check" ON public.profiles;

-- Create a correct policy that uses user_id instead of id
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);