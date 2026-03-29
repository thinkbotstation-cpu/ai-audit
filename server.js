const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/audit', async (req, res) => {
  const { industry, teamSize, painPoints, freeText } = req.body;

  if (!industry || !teamSize || !painPoints?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `You are an expert AI business consultant. A business has completed an audit questionnaire. Generate a concise, practical, and impressive AI automation report for them.

Business details:
- Industry: ${industry}
- Team size: ${teamSize}
- Biggest time drains: ${painPoints.join(', ')}
- Additional context: ${freeText || 'None provided'}

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "headline": "A punchy 1-line summary of their biggest opportunity (max 12 words)",
  "timeSaved": "Estimated hours saved per week (e.g. '8–12 hours')",
  "recommendations": [
    {
      "title": "Short title (3-5 words)",
      "description": "2 sentences. What it does and why it matters for this specific business.",
      "impact": "High" or "Medium",
      "effort": "Low" or "Medium",
      "quickWin": true or false
    }
  ],
  "topQuickWin": "Name the single highest-ROI action they can take this week (1 sentence)"
}

Generate exactly 3 recommendations. Be specific to their industry and pain points. Make it feel like a real consultant wrote it.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ error: 'AI service error' });
    }

    let text = data.content[0].text.trim();
    // Strip markdown code fences if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(text);
    res.json(result);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.listen(PORT, () => console.log(`AI Audit running on port ${PORT}`));
