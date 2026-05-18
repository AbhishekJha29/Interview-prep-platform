const { GoogleGenAI } = require("@google/genai"); 
const { conceptExplainPrompt, questionAnswerPrompt } = require("../utils/prompt");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// --------------------
// Generate Interview Questions
// --------------------
const generateInterviewQuestions = async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
        console.error("AI Error: GEMINI_API_KEY is missing in environment variables.");
        return res.status(500).json({ message: "AI configuration error. Please contact admin." });
    }

    try {
        const { role, experience, topicsToFocus, numberOfQuestions } = req.body;

        // Validation: allow experience to be 0 or "0"
        if (!role || (experience === undefined || experience === "") || !topicsToFocus || !numberOfQuestions) {
            return res.status(400).json({ message: "Missing required fields: role, experience, topicsToFocus, and numberOfQuestions are mandatory." });
        }

        const promptText = questionAnswerPrompt(role, experience, topicsToFocus, numberOfQuestions);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite", // Using 1.5-flash for better availability
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            if (!response || !response.text) {
                throw new Error("Empty response from Gemini API");
            }

            let text = response.text;
            
            // Remove markdown blocks if they exist
            if (text.includes("```")) {
                text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
            }

            const data = JSON.parse(text);
            res.status(200).json(data);

        } catch (aiError) {
            console.error("Gemini API Error:", aiError);

            // Handle specific status codes if available in the error object
            const statusCode = aiError.status || aiError.statusCode || 500;
            const errorMessage = aiError.message || "Unknown AI Error";

            if (statusCode === 503 || errorMessage.includes("503") || errorMessage.includes("overloaded")) {
                return res.status(503).json({ 
                    message: "AI service is currently overloaded. Please try again in a few moments.",
                    error: "Service Unavailable"
                });
            }

            if (statusCode === 429 || errorMessage.includes("429") || errorMessage.includes("quota")) {
                return res.status(429).json({ 
                    message: "AI rate limit reached. Please try again later.",
                    error: "Too Many Requests"
                });
            }

            return res.status(500).json({ 
                message: "Failed to generate interview questions due to an AI error.",
                error: errorMessage
            });
        }

    } catch (error) {
        console.error("Generate Interview Questions Internal Error:", error);
        res.status(500).json({
            message: "An internal server error occurred while processing your request.",
            error: error.message
        });
    }
};

// --------------------
// Generate Concept Explanation
// --------------------
const generateConceptExplanation = async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ message: "AI configuration error." });
    }

    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ message: "Question is required" });
        }

        const promptText = conceptExplainPrompt(question);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            let text = response.text;
            if (text.includes("```")) {
                text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
            }

            const data = JSON.parse(text);
            res.status(200).json(data);

        } catch (aiError) {
            console.error("Gemini API Error (Explanation):", aiError);
            res.status(500).json({
                message: "Failed to generate concept explanation",
                error: aiError.message,
            });
        }

    } catch (error) {
        console.error("Generate Concept Explanation Internal Error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = {
    generateInterviewQuestions,
    generateConceptExplanation
};