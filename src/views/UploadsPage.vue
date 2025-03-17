<template>
  <div>
    <Navbar />
    <div class="upload-container">
      <h2>Upload Receipt</h2>

      <!-- Image Upload -->
      <input type="file" accept="image/*" @change="handleFileUpload" class="custom-file-input"/>
      <button v-if="selectedFile" @click="processReceipt">Scan Receipt</button>

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
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Navbar from "../components/TheNavbar.vue";
import axios from "axios";

const selectedFile = ref(null);
const scannedData = ref(null);

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0];
};

const processReceipt = async () => {
  if (!selectedFile.value) {
    alert("Please select a file first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  try {
    const response = await axios.post("http://localhost:5001/api/scan-receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    scannedData.value = response.data;
    console.log("✅ Frontend Received Data:", response.data); // Debugging log
  } catch (error) {
    console.error("Error processing receipt:", error);
  }
};
</script>

<style scoped>
.upload-container {
  text-align: center;
  padding: 20px;
}

input[type="file"] {
  margin-bottom: 10px;
}

.custom-file-input {
  font-family: "Georgia", serif;
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

button:hover {
  background-color: #45a049;
}
</style>
