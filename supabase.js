import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.0/+esm';


export const supabase = createClient(
  'https://twzycmqwmqelwgnjiqmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3enljbXF3bXFlbHdnbmppcW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjk2MzcsImV4cCI6MjA3Nzc0NTYzN30.LxaCQgOVPSSwWqJZghHnJFmA6mTvn6GstxzcTMmMgEo'
);
