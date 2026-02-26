
-- Create storage bucket for KYC verification files (face snapshots + ID documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-files', 'kyc-files', false);

-- Users can upload their own KYC files (organized by user ID folder)
CREATE POLICY "Users can upload own KYC files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own KYC files
CREATE POLICY "Users can view own KYC files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-files'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Admins can view all KYC files for review
CREATE POLICY "Admins can manage KYC files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'kyc-files'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
