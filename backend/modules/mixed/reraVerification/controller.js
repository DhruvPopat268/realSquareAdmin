const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// POST /api/mixed/rera/verify
const verifyReraId = async (req, res) => {
  try {
    const { reraId } = req.body;

    if (!reraId || typeof reraId !== "string" || !reraId.trim()) {
      return res.status(400).json({ success: false, message: "reraId is required" });
    }

    const cleanId = reraId.trim();

const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash-lite", // no tools/grounding
});

    const prompt = `You are a Real Estate Regulatory Authority (RERA) ID validator and project lookup assistant for India.

=== INPUT DATA ===
User Input RERA ID: "${cleanId}"
==================

Step 1 - Structural validation:
Check if the ID follows a valid state RERA registration format (state code, district, authority, serial, date segments). Do NOT try to derive project name or developer name from the ID's structure itself — RERA IDs are purely structural codes and never encode names directly.

Step 2 - Project lookup:
Use web search to find the actual registered project associated with this exact RERA ID. Look for the project name, developer/promoter name, and locality. Only return values you found with reasonable confidence from search results. If nothing reliable is found, return null.

Provide your analysis in EXACTLY this JSON format, no markdown, no preamble, no extra text:

{
  "verified": true or false,
  "reason": "Short explanation of structural validity or defects",
  "project_details": {
    "project_name": "Project name if found via search, otherwise null",
    "developer_name": "Developer/Promoter name if found via search, otherwise null",
    "locality_or_city": "City/District/Locality from the ID or search, otherwise null",
    "state": "State name derived from the prefix/code (e.g., Gujarat, Maharashtra, Uttar Pradesh)",
    "confidence": "high | low | unknown"
  }
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ success: false, message: "Invalid response from AI service" });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.verified !== "boolean") {
      return res.status(502).json({ success: false, message: "Invalid response from AI service" });
    }

    // Optional: grounding sources, if you want to show "verified via" links
    const groundingChunks =
      result.response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = groundingChunks
      .map((c) => c.web?.uri)
      .filter(Boolean);

    return res.json({
      success: true,
      reraId: cleanId,
      verified: parsed.verified,
      reason: parsed.reason ?? "",
      projectDetails: {
        projectName: parsed.project_details?.project_name ?? null,
        developerName: parsed.project_details?.developer_name ?? null,
        localityOrCity: parsed.project_details?.locality_or_city ?? null,
        state: parsed.project_details?.state ?? null,
        confidence: parsed.project_details?.confidence ?? "unknown",
      },
      sources, // remove if you don't need this
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ success: false, message: "Could not parse AI response" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { verifyReraId };
