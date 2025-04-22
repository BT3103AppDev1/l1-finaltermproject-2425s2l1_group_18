import axios from "axios";

export async function scanReceipt(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post("http://localhost:5001/api/scan-receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return { error: "Failed to process receipt" };
  }
}


