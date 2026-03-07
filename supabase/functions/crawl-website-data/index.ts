import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { websiteUrl } = await req.json()

    console.log('Received websiteUrl:', websiteUrl)

    if (!websiteUrl) {
      throw new Error('Website URL is required')
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    
    console.log('CLAUDE_API_KEY exists:', !!CLAUDE_API_KEY)
    
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured in Edge Function secrets')
    }

    const prompt = `Analyze the website at ${websiteUrl} and extract the following company information in JSON format:
{
  "name": "company name",
  "industry": "primary industry or sector",
  "about": "brief description of the company (2-3 sentences)",
  "services": "comma-separated list of main services or products",
  "address": "physical address if available",
  "phone": "contact phone number if available",
  "email": "contact email if available"
}

If any information is not available or cannot be determined, use an empty string for that field.
Return ONLY the JSON object, no additional text.`

    console.log('Calling Claude API...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    console.log('Claude API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', errorText)
      throw new Error(`Claude API error: ${errorText}`)
    }

    const data = await response.json()
    console.log('Claude API response received')
    
    const text = data.content?.[0]?.text || '{}'
    
    // Extract JSON from response (remove markdown code blocks if present)
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    
    const companyData = JSON.parse(jsonText.trim())

    console.log('Successfully extracted company data')

    return new Response(
      JSON.stringify(companyData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in crawl-website-data function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})