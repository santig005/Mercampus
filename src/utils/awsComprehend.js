const { ComprehendClient, DetectToxicContentCommand } = require("@aws-sdk/client-comprehend");

const client = new ComprehendClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function detectInappropriateText(text) {
  if (!text) return { error: "No text provided" };

  const body = {
    TextSegments: [{ Text: text }],
    LanguageCode: "en",
  };

  try {
    const command = new DetectToxicContentCommand(body);
    const response = await client.send(command);
    console.log("Response:", response);

    if (!response?.ResultList?.length) {
      return { error: "No analysis results returned" };
    }else{
      return { response };
    }
  } catch (error) {
    console.error("Error detecting content:", error);
    return { error: "Failed to analyze content. Please try again later." };
  }
}

//module.exports = detectInappropriateText; // For testing jest purposes
export default detectInappropriateText;