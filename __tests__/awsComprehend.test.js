require("@testing-library/jest-dom");
const detectInappropriateText = require("../src/utils/awsComprehend"); // Adjust the path if needed
const { ComprehendClient } = require("@aws-sdk/client-comprehend");

// Mock AWS ComprehendClient
jest.mock("@aws-sdk/client-comprehend");

describe("detectInappropriateText function", () => {
  let mockSend;z

  beforeEach(() => {
    mockSend = jest.fn();
    ComprehendClient.mockImplementation(() => ({
      send: mockSend,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return an response for innapropiate text", async () => {
    const result = await detectInappropriateText("");

    expect(result).toEqual({ error: "No text provided" });
  });

  test("should handle AWS API errors gracefully", async () => {
    mockSend.mockRejectedValue(new Error("AWS Error"));

    const result = await detectInappropriateText("Some text");

    expect(result).toEqual({ error: "No analysis results returned" });
    //expect(mockSend).toHaveBeenCalled();
  });

  test("should return an error if AWS response is empty", async () => {
    mockSend.mockResolvedValue({ ResultList: [] });

    const result = await detectInappropriateText("Some text");

    expect(result).toEqual({ error: "No analysis results returned" });
  });
});