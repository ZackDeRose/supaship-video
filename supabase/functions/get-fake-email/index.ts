// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0-rc.12";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Expose-Headers": "Content-Length, X-JSON",
  "Access-Control-Allow-Headers":
    "apikey, X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
};

console.log("Hello from Functions!");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  console.log("not an options request");
  const request = await req.json();
  const { username } = request;
  console.log(request);
  const supabaseClient = createClient(
    // Supabase API URL - env var exported by default.
    Deno.env.get("SUPABASE_URL") ?? "",
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    // Create client with Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
  );
  const { data } = await supabaseClient
    .from("usernames")
    .select()
    .eq("username", username);
  if (!data || !data[0]) {
    console.log("no user by username");
    throw new Error(`no user found with username ${username}`);
  }
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.admin.getUserById(data[0].userid);
  console.log(error);
  if (!user) {
    console.log("no user by userid");
    throw new Error(`no fake email found`);
  }

  return new Response(JSON.stringify({ email: user.email }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Expose-Headers": "Content-Length, X-JSON",
      "Access-Control-Allow-Headers":
        "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
    },
    status: 200,
  });
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
