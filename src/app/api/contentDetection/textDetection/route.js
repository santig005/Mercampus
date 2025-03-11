import detectInappropriateText from "@/utils/awsComprehend";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();

    if (!body || !body.text || body.text.trim() === "") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Call AWS Comprehend to analyze the text
    const analysisResult = await detectInappropriateText(body.text);

    if (!analysisResult) {
      return NextResponse.json({ error: "Failed to analyze content" }, { status: 500 });
    }

    const result = analysisResult.response.ResultList[0];

    if ((result?.Labels ?? []).some(label => label.Score > 0.35) || result.Toxicity>0.35){
      return NextResponse.json(
        { data: { Sentiment: "NEGATIVE" } }
      );
    }

    return NextResponse.json(
      { data: result }
    );

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 500 });
  }
}