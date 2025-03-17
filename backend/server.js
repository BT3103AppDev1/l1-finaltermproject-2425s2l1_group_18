import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import vision from "@google-cloud/vision";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

app.use(cors());
app.use(express.json());

app.post("/api/scan-receipt", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // don't remove logged statements, can see terminal how it scans the receipt
    // send the image to Google Cloud Vision!
    const [result] = await client.textDetection(req.file.buffer);
    const detections = result.textAnnotations;

    if (!detections.length) {
      return res.json({ error: "No text found" });
    }

    const extractedText = detections[0].description;
    console.log("Raw OCR Text:", extractedText); // Debugging

    // processes OCR result to extract structured data
    const structuredData = extractReceiptData(extractedText);

    res.json(structuredData);
  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// Function to extract structured receipt data
function extractReceiptData(text) {
  const lines = text.split("\n");

  let merchant = lines[0] || "Unknown Merchant";
  let date = "Unknown Date";
  let items = [];
  let total = "Unknown Total";

  const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/;
  const priceRegex = /^\$?(\d+\.\d{2})$/;
  const itemRegex = /^(\d+x|\d+ x)\s+([^$]+)$/; // Matches "1x Burger", "2 x Soft Drink"
  const itemWithPriceRegex = /^(\d+x|\d+ x)\s+(.+?)\s+\$?(\d+\.\d{2})$/; // Matches "1 x Pie $7.00"

  let detectedPrices = [];
  let detectedItems = [];
  let lastAmount = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    console.log(`🔹 Processing line: ${line}`);

    // Ignore irrelevant lines (headers, locations, phone numbers, timestamps, dashes)
    if (
      line.toLowerCase().includes("thank you") ||
      line.toLowerCase().includes("visit") ||
      line.toLowerCase().includes("phone") ||
      line.match(/\d{1,2}:\d{2} (AM|PM)/) || // Skip timestamps
      line === "-" // Ignore separators
    ) {
      console.log(`❌ Skipping line: ${line}`);
      continue;
    }

    // Extract date
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      date = dateMatch[0];
      console.log(`✅ Extracted Date: ${date}`);
      continue;
    }

    // Check if the line is a price
    if (priceRegex.test(line)) {
      detectedPrices.push(`$${line.match(priceRegex)[1]}`);
      console.log(`✅ Found Price: $${line.match(priceRegex)[1]}`);
      lastAmount = `$${line.match(priceRegex)[1]}`; // Last detected price
      continue;
    }

    // Match items with **both name & price on same line** (like "1 x Pie $7.00")
    const itemWithPriceMatch = line.match(itemWithPriceRegex);
    if (itemWithPriceMatch) {
      let quantity = parseInt(itemWithPriceMatch[1]);
      let itemName = itemWithPriceMatch[2].trim();
      let price = `$${itemWithPriceMatch[3]}`;

      detectedItems.push({ quantity, name: itemName, price });
      console.log(`✅ Detected Item (Same Line Price): ${quantity}x ${itemName} - ${price}`);
      continue;
    }

    // Match items that have valid quantities (e.g., "1x Burger", "2 x Soft Drink")
    const itemMatch = line.match(itemRegex);
    if (itemMatch) {
      let quantity = parseInt(itemMatch[1]);
      let itemName = itemMatch[2].trim();

      detectedItems.push({ quantity, name: itemName, price: null });
      console.log(`✅ Detected Item: ${quantity}x ${itemName}`);
    }
  }

  // to assign prices to items in order (skipping total)
  let priceIndex = 0;
  for (let i = 0; i < detectedItems.length; i++) {
    if (!detectedItems[i].price) {
      if (priceIndex < detectedPrices.length - 1) {
        detectedItems[i].price = detectedPrices[priceIndex]; // Match price in order
        priceIndex++;
      } else {
        detectedItems[i].price = "Unknown Price"; // If missing price
      }
    }
  }

  // to ensure that the last detected price is stored as total (not as an item price)
  if (detectedPrices.length > 0) {
    total = detectedPrices.pop(); // Last price is set as the total
  }

  return { merchant, date, items: detectedItems, total };
}

app.listen(5001, () => console.log("✅ Backend running on http://localhost:5001"));