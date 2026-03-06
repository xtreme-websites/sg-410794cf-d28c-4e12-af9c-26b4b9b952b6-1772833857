import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl } = await req.json();
    console.log('Widget verification request for:', websiteUrl);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = `Visit the website ${websiteUrl} and check if it contains an embedded trust widget with the identifier "pr-trust-widget" in the HTML source code.

Return ONLY valid JSON:
{
  "found": true or false,
  "method": "direct_scrape" or "blocked",
  "message": "Verification message for the user"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let verificationData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationData = JSON.parse(jsonMatch[0]);
      } else {
        verificationData = {
          found: false,
          method: 'blocked',
          message: 'Unable to verify. Please manually confirm widget placement.'
        };
      }
    } catch (e) {
      verificationData = {
        found: false,
        method: 'blocked',
        message: 'Verification blocked. You can manually mark as placed.'
      };
    }

    return new Response(JSON.stringify(verificationData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in verify-widget-placement:', error);
    return new Response(
      JSON.stringify({ 
        found: false, 
        method: 'blocked',
        message: 'Verification blocked. You can manually mark as placed.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});