import { createClient } from '@supabase/supabase-js';

// *** REPLACE WITH YOUR ACTUAL VALUES ***
const SUPABASE_URL = 'https://twzycmqwmqelwgnjiqmb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3enljbXF3bXFlbHdnbmppcW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjk2MzcsImV4cCI6MjA3Nzc0NTYzN30.LxaCQgOVPSSwWqJZghHnJFmA6mTvn6GstxzcTMmMgEo';
// ***************************************

async function runTest() {
    console.log("Attempting to create Supabase client...");

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // This is the line that failed in your browser test.
        // If the client creation was successful, the Auth object will exist.
        const { data, error } = await supabase.auth.getUser();

        console.log("--- TEST RESULTS ---");
        if (error) {
            console.error("❌ AUTH ERROR: The client object was created, but the API call failed.");
            console.error("   Details:", error.message);
        } else {
            console.log("✅ SUCCESS! The client initialized and the Auth API call succeeded.");
            console.log("   User Data:", data);
        }

    } catch (e) {
        // This catches the 'AuthClient' error if the client object is null
        console.error("🛑 CRITICAL FAILURE: Client Initialization Failed.");
        console.error("   Error:", e.message);
        console.log("   (This result strongly indicates an issue with your SUPABASE_URL or SUPABASE_KEY)");
    }
}

runTest();