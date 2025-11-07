import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AchievementNotificationRequest {
  email: string;
  name: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon: string;
  points: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, achievementTitle, achievementDescription, achievementIcon, points }: AchievementNotificationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Achievement System <onboarding@resend.dev>",
      to: [email],
      subject: `${achievementIcon} New Achievement Unlocked!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0;">
            <div style="font-size: 72px; margin-bottom: 10px;">${achievementIcon}</div>
            <h1 style="color: white; margin: 0;">Achievement Unlocked!</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #666;">Congratulations, ${name}!</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0; font-size: 24px;">${achievementTitle}</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">${achievementDescription}</p>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #667eea; font-size: 18px; font-weight: bold; margin: 0;">
                  +${points} Points Earned! 🎯
                </p>
              </div>
            </div>
            
            <p style="color: #10b981; font-size: 16px; text-align: center;">
              Keep up the great work! 🚀
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              This is an automated email from your learning platform.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Achievement notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending achievement notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
