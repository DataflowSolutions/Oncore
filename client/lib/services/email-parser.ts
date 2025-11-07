import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema for parsed show details
export const ParsedShowDetailsSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  fee: z.string().optional(),
  guarantee: z.string().optional(),
  capacity: z.number().optional(),
  doorTime: z.string().optional(),
  showTime: z.string().optional(),
  setupTime: z.string().optional(),
  soundcheckTime: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const ParsedVenueDetailsSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  capacity: z.number().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const ParsedContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export type ParsedShowDetails = z.infer<typeof ParsedShowDetailsSchema>
export type ParsedVenueDetails = z.infer<typeof ParsedVenueDetailsSchema>
export type ParsedContact = z.infer<typeof ParsedContactSchema>

/**
 * Extract show details from email text using AI
 */
export async function extractShowDetails(text: string): Promise<ParsedShowDetails> {
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    logger.warn('Gemini API key not configured, returning empty result')
    return { confidence: 0 }
  }

  try {
    const prompt = `You are an expert at extracting show and event details from emails and documents. 
Extract structured information about shows, performances, or events. Return ONLY a valid JSON object with the following fields:
- title: Show or event name
- date: Date in YYYY-MM-DD format
- time: Time of the event
- venue: Venue name
- address: Street address
- city: City name
- state: State or province
- zip: Postal code
- fee: Performance fee or payment amount
- guarantee: Guaranteed payment
- capacity: Venue capacity (number)
- doorTime: Door opening time
- showTime: Show start time
- setupTime: Setup/load-in time
- soundcheckTime: Soundcheck time
- confidence: Your confidence in the extraction (0-1)

Only include fields you find in the text. Be conservative with confidence scores.

Text to analyze:
${text}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      return { confidence: 0 }
    }

    const parsed = JSON.parse(content)
    return ParsedShowDetailsSchema.parse(parsed)

  } catch (error) {
    logger.error('Error extracting show details', error)
    return { confidence: 0 }
  }
}

/**
 * Extract venue details from email text using AI
 */
export async function extractVenueDetails(text: string): Promise<ParsedVenueDetails> {
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    logger.warn('Gemini API key not configured, returning empty result')
    return { confidence: 0 }
  }

  try {
    const prompt = `You are an expert at extracting venue information from emails and documents.
Extract structured venue information. Return ONLY a valid JSON object with these fields:
- name: Venue name
- address: Street address
- city: City name
- state: State or province
- zip: Postal code
- country: Country name
- capacity: Venue capacity (number)
- phone: Phone number
- email: Email address
- website: Website URL
- confidence: Your confidence in the extraction (0-1)

Only include fields you find in the text.

Text to analyze:
${text}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      return { confidence: 0 }
    }

    const parsed = JSON.parse(content)
    return ParsedVenueDetailsSchema.parse(parsed)

  } catch (error) {
    logger.error('Error extracting venue details', error)
    return { confidence: 0 }
  }
}

/**
 * Extract contact information from email text using AI
 */
export async function extractContactDetails(text: string): Promise<ParsedContact[]> {
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    logger.warn('Gemini API key not configured, returning empty result')
    return []
  }

  try {
    const prompt = `You are an expert at extracting contact information from emails and documents.
Extract all contacts mentioned. Return ONLY a valid JSON object with a "contacts" array containing objects with these fields:
- name: Person's name
- email: Email address
- phone: Phone number
- role: Their role or title
- company: Company or organization name
- confidence: Your confidence in the extraction (0-1)

Return format: {"contacts": [...]}
Only include contacts you find in the text.

Text to analyze:
${text}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      return []
    }

    const parsed = JSON.parse(content)
    const contacts = parsed.contacts || []
    
    return contacts.map((c: unknown) => ParsedContactSchema.parse(c))

  } catch (error) {
    logger.error('Error extracting contact details', error)
    return []
  }
}

/**
 * Parse forwarded email and extract all relevant information
 */
export async function parseForwardedEmail(emailContent: string) {
  const [showDetails, venueDetails, contacts] = await Promise.all([
    extractShowDetails(emailContent),
    extractVenueDetails(emailContent),
    extractContactDetails(emailContent),
  ])

  return {
    showDetails,
    venueDetails,
    contacts,
    rawContent: emailContent,
    parsedAt: new Date().toISOString(),
  }
}
