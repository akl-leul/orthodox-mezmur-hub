import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuizNotificationRequest {
  email: string;
  name: string;
  quizTitle: string;
  score: number;
  passingScore: number;
  totalQuestions: number;
  correctAnswers: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, quizTitle, score, passingScore, totalQuestions, correctAnswers }: QuizNotificationRequest = await req.json();

    const passed = score >= passingScore;
    const status = passed ? "Passed" : "Not Passed";
    const emoji = passed ? "🎉" : "📚";

    const emailResponse = await resend.emails.send({
      from: "Quiz System <onboarding@resend.dev>",
      to: [email],
      subject: `${emoji} Quiz Results: ${quizTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 3px solid ${passed ? "#10b981" : "#ef4444"}; padding-bottom: 10px;">
            Quiz Results
          </h1>
          
          <p style="font-size: 16px; color: #666;">Hi ${name},</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">${quizTitle}</h2>
            
            <div style="display: flex; justify-content: space-between; margin: 15px 0;">
              <div>
                <p style="color: #666; margin: 5px 0;">Your Score:</p>
                <p style="font-size: 24px; font-weight: bold; color: ${passed ? "#10b981" : "#ef4444"}; margin: 5px 0;">
                  ${score}%
                </p>
              </div>
              
              <div>
                <p style="color: #666; margin: 5px 0;">Status:</p>
                <p style="font-size: 20px; font-weight: bold; color: ${passed ? "#10b981" : "#ef4444"}; margin: 5px 0;">
                  ${status}
                </p>
              </div>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;" />
            
            <p style="color: #666; margin: 5px 0;">
              Correct Answers: <strong>${correctAnswers}/${totalQuestions}</strong>
            </p>
            <p style="color: #666; margin: 5px 0;">
              Passing Score: <strong>${passingScore}%</strong>
            </p>
          </div>
          
          ${passed 
            ? `<p style="color: #10b981; font-size: 16px;">
                Congratulations! You've successfully passed this quiz! 🎉
              </p>` 
            : `<p style="color: #ef4444; font-size: 16px;">
                Keep learning! You can retake the quiz to improve your score. 📚
              </p>`
          }
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #999; font-size: 12px;">
              This is an automated email from your quiz system. Please do not reply.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Quiz notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending quiz notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
