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
    console.log('=== crawl-website-data Edge Function called ===')
    
    const { websiteUrl } = await req.json()
    console.log('Received websiteUrl:', websiteUrl)

    if (!websiteUrl) {
      console.error('No websiteUrl provided')
      return new Response(
        JSON.stringify({ error: 'websiteUrl is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')
    console.log('Claude API key present:', !!claudeApiKey)
    
    if (!claudeApiKey) {
      console.error('CLAUDE_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ error: 'Claude API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const prompt = `Visit this website: ${websiteUrl}

Extract the following company information and return ONLY a JSON object with these exact fields:
{
  "name": "Company name",
  "industry": "Industry or business category",
  "websiteUrl": "${websiteUrl}",
  "quoteAttribution": "Full name and title for quotes (e.g., 'John Smith, CEO')",
  "about": "Detailed company description, mission, and background",
  "services": "Comma-separated list of all services or products offered",
  "address": "Full physical address",
  "phone": "Phone number with country code",
  "email": "Contact email address"
}

Important:
- Return ONLY valid JSON, no markdown or code fences
- If a field cannot be found, use an empty string ""
- For services, list ALL services/products as comma-separated values
- For quoteAttribution, find the CEO, founder, or main spokesperson name and title
- Be thorough and extract as much detail as possible`

    console.log('Calling Claude API...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
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
      return new Response(
        JSON.stringify({ error: `Claude API error: ${response.status}`, details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const claudeData = await response.json()
    console.log('Claude API response received')

    const extractedText = claudeData.content?.[0]?.text || ''
    console.log('Extracted text length:', extractedText.length)
    console.log('First 200 chars:', extractedText.substring(0, 200))

    let companyData
    try {
      const codeBlockPattern = /```(?:json)?\s*/g
      const cleanedText = extractedText.replace(codeBlockPattern, '').trim()
      companyData = JSON.parse(cleanedText)
      console.log('Successfully parsed company data:', Object.keys(companyData))
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError)
      console.error('Raw text:', extractedText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data', details: extractedText.substring(0, 500) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const finalData = {
      name: companyData.name || '',
      industry: companyData.industry || '',
      websiteUrl: websiteUrl,
      quoteAttribution: companyData.quoteAttribution || '',
      about: companyData.about || '',
      services: companyData.services || '',
      address: companyData.address || '',
      phone: companyData.phone || '',
      email: companyData.email || ''
    }

    console.log('=== Returning final data ===')
    return new Response(
      JSON.stringify(finalData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})