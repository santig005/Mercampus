import { ComprehendClient, DetectToxicContentCommand } from "@aws-sdk/client-comprehend";

// Initialize AWS Comprehend client
const client = new ComprehendClient({
  region: "us-east-1", // Change to your AWS region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to detect inappropriate text
export const detectInappropriateText = async (text) => {
  if (!text) return { error: "No text provided" };

  const body = {
    TextSegments: [{ Text: text }], // Supports up to 25 texts
    LanguageCode: "en", // Corrected property name
  };

  try {
    const command = new DetectToxicContentCommand(body);
    const response = await client.send(command);

    if (!response.ResultList || response.ResultList.length === 0) {
      return { error: "No analysis results returned" };
    }

    return { response };

  } catch (error) {
    console.error("Error detecting content:", error);
    return { error: "Failed to analyze content" };
  }
};

export default detectInappropriateText;