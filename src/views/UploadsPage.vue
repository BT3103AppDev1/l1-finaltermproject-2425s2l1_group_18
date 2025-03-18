<template>
  <div>
    <Navbar />
    <div class="upload-container">
      <h2>Upload Receipt</h2>

      <!-- Custom File Input -->
      <input type="file" accept="image/*" @change="handleFileUpload" id="file-input" class="custom-file-input"/>
      <label for="file-input" class="custom-file-label">
        Choose File
      </label>

      <!-- Display Selected File Name -->
      <input v-if="selectedFile" type="text" :value="selectedFile.name" class="file-name-input" readonly />

      <button v-if="selectedFile" @click="processReceipt" :disabled="isLoading">
        {{ isLoading ? "Scanning..." : "Scan Receipt" }}
      </button>

      <!-- Display Extracted Data -->
      <div v-if="scannedData">
        <h3>Scanned Details</h3>
        <p><strong>Merchant:</strong> {{ scannedData.merchant }}</p>
        <p><strong>Date:</strong> {{ scannedData.date }}</p>
        <p><strong>Total:</strong> {{ scannedData.total }}</p>

        <h4>Items:</h4>
        <ul>
          <li v-for="(item, index) in scannedData.items" :key="index">
            {{ item.quantity }} x {{ item.name }} - {{ item.price }}
          </li>
        </ul>
      </div>

      <!-- Display Error Message -->
      <div v-if="errorMessage" class="error-message">
        <p>{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Navbar from "../components/TheNavbar.vue";
import axios from "axios";

const selectedFile = ref(null);
const scannedData = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0];
  errorMessage.value = ""; // Clear any previous error messages
};

const processReceipt = async () => {
  if (!selectedFile.value) {
    alert("Please select a file first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const response = await axios.post("http://localhost:5001/api/scan-receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    scannedData.value = response.data;
    console.log("✅ Frontend Received Data:", response.data); // Debugging log
  } catch (error) {
    console.error("Error processing receipt:", error);
    errorMessage.value = "Failed to process the receipt. Please try again.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.upload-container {
  text-align: center;
  padding: 20px;
}

input[type="file"] {
  display: none;
}

.custom-file-label {
  display: inline-block;
  padding: 8px 14px;
  font-size: 14px;
  border: none;
  background-color: #5eb761;
  color: white;
  cursor: pointer;
  border-radius: 5px;
  font-family: "Georgia", serif;
  margin-bottom: 10px;
}

.custom-file-label:hover {
  background-color: #45a049;
}

.file-name-input {
  display: block;
  margin: 10px auto;
  padding: 8px 14px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 10%;
  font-family: "Georgia", serif;
  text-align: center;
}

button {
  margin-top: 10px;
  padding: 8px 14px;
  font-size: 14px;
  border: none;
  background-color: #5eb761;
  color: white;
  cursor: pointer;
  border-radius: 5px;
  font-family: "Georgia", serif;
}

button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

button:hover:enabled {
  background-color: #45a049;
}

.error-message {
  color: red;
  margin-top: 10px;
}
</style>