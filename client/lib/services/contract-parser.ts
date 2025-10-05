import { z } from 'zod'

export const ParsedContractSchema = z.object({
  // Show Details
  showTitle: z.string().optional(),
  showDate: z.string().optional(),
  showTime: z.string().optional(),
  doorTime: z.string().optional(),
  soundcheckTime: z.string().optional(),
  setupTime: z.string().optional(),

  // Venue Information
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueCity: z.string().optional(),
  venueState: z.string().optional(),
  venueZip: z.string().optional(),
  venueCapacity: z.number().optional(),

  // Financial Terms
  guarantee: z.string().optional(),
  backendDeal: z.string().optional(),
  ticketPrice: z.string().optional(),
  depositAmount: z.string().optional(),
  depositDate: z.string().optional(),
  finalPaymentDate: z.string().optional(),

  // Contacts
  promoterName: z.string().optional(),
  promoterEmail: z.string().optional(),
  promoterPhone: z.string().optional(),
  venueName: z.string().optional(),
  venueContactEmail: z.string().optional(),
  venueContactPhone: z.string().optional(),

  // Technical Requirements
  soundSystem: z.string().optional(),
  lightingRequirements: z.string().optional(),
  backlineProvided: z.string().optional(),

  // Additional Terms
  hospitality: z.string().optional(),
  parking: z.string().optional(),
  merchandising: z.string().optional(),
  recording: z.string().optional(),

  // Metadata
  confidence: z.number().min(0).max(1).optional(),
  contractType: z.string().optional(),
})

export type ParsedContract = z.infer<typeof ParsedContractSchema>

/**
 * Extract text from PDF buffer (placeholder - requires pdf-parse or similar)
 * @param buffer - PDF file buffer (currently unused, placeholder for future implementation)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // This is a placeholder. In production, you would use a library like pdf-parse
  // or call a service that can extract text from PDFs
  
  // For now, return empty string with a note
  console.warn('PDF text extraction not implemented. Install pdf-parse or use a service.')
  return ''
}

/**
 * Extract contract details from text using AI
 */
export async function parseContractText(text: string): Promise<ParsedContract> {
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    console.warn('Gemini API key not configured, returning empty result')
    return { confidence: 0 }
  }

  try {
    const prompt = `You are an expert at extracting information from performance contracts and venue agreements.
Extract all relevant information from the contract. Return ONLY a valid JSON object with these fields:

Show Details:
- showTitle: Name of the show/performance
- showDate: Date in YYYY-MM-DD format
- showTime: Performance start time
- doorTime: Door opening time
- soundcheckTime: Soundcheck time
- setupTime: Setup/load-in time

Venue Information:
- venueName: Venue name
- venueAddress: Street address
- venueCity: City
- venueState: State
- venueZip: Postal code
- venueCapacity: Capacity (number)

Financial Terms:
- guarantee: Guaranteed payment amount
- backendDeal: Backend/percentage deal terms
- ticketPrice: Ticket price or price range
- depositAmount: Deposit amount
- depositDate: When deposit is due
- finalPaymentDate: When final payment is due

Contacts:
- promoterName: Promoter name
- promoterEmail: Promoter email
- promoterPhone: Promoter phone
- venueContactName: Venue contact name
- venueContactEmail: Venue contact email
- venueContactPhone: Venue contact phone

Technical Requirements:
- soundSystem: Sound system details
- lightingRequirements: Lighting requirements
- backlineProvided: Backline/equipment provided

Additional Terms:
- hospitality: Hospitality provisions (food, drinks, etc)
- parking: Parking arrangements
- merchandising: Merch sales terms
- recording: Recording/streaming permissions

Metadata:
- confidence: Your confidence in extraction (0-1)
- contractType: Type of contract (performance agreement, rider, etc)

Only include fields found in the contract. Be thorough and accurate.

Contract text to analyze:
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
          temperature: 0.2,
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
    return ParsedContractSchema.parse(parsed)

  } catch (error) {
    console.error('Error parsing contract:', error)
    return { confidence: 0 }
  }
}

/**
 * Parse contract document from file
 */
export async function parseContractDocument(file: File): Promise<ParsedContract> {
  try {
    const fileType = file.type
    let text = ''

    if (fileType === 'application/pdf') {
      // Extract text from PDF
      const buffer = await file.arrayBuffer()
      text = await extractTextFromPDF(buffer)
    } else if (fileType === 'text/plain' || fileType.includes('text')) {
      // Plain text file
      text = await file.text()
    } else {
      throw new Error('Unsupported file type. Please upload PDF or text files.')
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the file')
    }

    // Parse the extracted text
    return await parseContractText(text)

  } catch (error) {
    console.error('Error parsing contract document:', error)
    return { 
      confidence: 0,
      contractType: 'parsing_error'
    }
  }
}

/**
 * Parse contract from URL (for stored files)
 */
export async function parseContractFromURL(url: string): Promise<ParsedContract> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const file = new File([blob], 'contract.pdf', { type: blob.type })
    
    return await parseContractDocument(file)
  } catch (error) {
    console.error('Error parsing contract from URL:', error)
    return { 
      confidence: 0,
      contractType: 'parsing_error'
    }
  }
}
