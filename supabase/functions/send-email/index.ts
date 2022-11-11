// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0-rc.12";

interface SendEmailParams {
  recipients: string[];
  subject: string;
  body: string;
}

const sendEmail = async ({
  recipients,
  subject = "Hello From Supaship",
  body,
}: SendEmailParams) => {
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        { to: recipients.map((email) => ({ email })), subject },
      ],
      from: {
        email: "notifications@supaship.io",
        name: "Supaship",
      },
      content: [{ type: "text/plain", value: body }],
    }),
  });
};

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Expose-Headers": "Content-Length, X-JSON",
  "Access-Control-Allow-Headers":
    "apikey, X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
};

const ADMIN_UID = "7dc06969-a28c-4be6-b111-b87be6c5afb9";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const body = await req.json();
  const { contents, subject } = body;
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const userJwt = req.headers.get("authorization")?.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseClient.auth.getUser(userJwt);
  if (user?.id !== ADMIN_UID) {
    throw new Error("Unauthorized");
  }
  const { data } = await supabaseClient.from("email_list").select("*");
  if (data) {
    await sendEmail({
      recipients: data.map(({ email }) => email),
      body: contents,
      subject,
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: corsHeaders,
  });
});
