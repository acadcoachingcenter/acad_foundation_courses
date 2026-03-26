// Notice we use 'import' instead of 'require' because we set type: module
import { verifyToken } from '@clerk/clerk-sdk-node';

export default async function handler(req, res) {
  // 1. Set CORS Headers
  // This allows your frontend to communicate with this backend function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 2. Handle Pre-flight Requests (Required for CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 4. Retrieve the Secret API Key from Environment Variables
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.error('Error: GROQ_API_KEY environment variable is missing.');
    return res.status(500).json({ error: 'Server configuration error. API key missing.' });
  }

  // 5. System Prompt for ACAD
  const SYSTEM_PROMPT = `
You are a helpful and friendly AI assistant for ACAD Online Tuition Center in Chennai. 
Your goal is to assist students and parents with inquiries about the tuition center.

Key information you should know:
- Courses: Maths, Science for Classes 6-12.
- Special Programs: NEET/JEE Foundation (Classes 8-10), Board Exam Prep (CBSE/State).
- Fees: Range from Rs 12,000 to Rs 22,000 depending on the class.
- Schedules: Flexible batches available (Weekday evenings 4-8 PM, Weekends 9 AM-6 PM).
- Features: Concept-based learning, 100+ core concepts covered, experienced faculty.
- Scholarships: Available for meritorious students.
- Contact: +91 98765 43210.

Instructions:
- Be concise and encouraging.
- If you don't know the answer, suggest contacting the center directly.
- Always maintain a professional and academic tone.
`;

  try {
    // 6. Extract user message history from the request body
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array is required.' });
    }

    // 7. Call the Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast and efficient model
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages // Pass the conversation history from frontend
        ],
        temperature: 0.7,
        max_tokens: 500, // Limit response length
      }),
    });

    const data = await groqResponse.json();

    // 8. Handle Groq API Errors
    if (!groqResponse.ok) {
      console.error('Groq API Error:', data);
      return res.status(groqResponse.status).json({ 
        error: data.error?.message || 'Failed to fetch response from AI.' 
      });
    }

    // 9. Send the AI's reply back to the frontend
    const aiReply = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    
    return res.status(200).json({ content: aiReply });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
