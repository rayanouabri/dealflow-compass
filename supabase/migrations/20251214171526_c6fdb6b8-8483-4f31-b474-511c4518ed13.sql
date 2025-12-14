-- Create table for analysis history
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_name TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  investment_thesis JSONB,
  pitch_deck JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read/write access (no auth required for demo)
CREATE POLICY "Allow public read access" 
ON public.analysis_history 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.analysis_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history(created_at DESC);