<template>
  <div>
    <Navbar />
    <div class="upload-container">
      <h2>Upload Receipt</h2>

      <input type="file" accept="image/*" @change="handleFileUpload" id="file-input" class="custom-file-input"/>
      <label for="file-input" class="custom-file-label">
        Choose File
      </label>
      <input v-if="selectedFile" type="text" :value="selectedFile.name" class="file-name-input" readonly />

      <button v-if="selectedFile" @click="processReceipt" :disabled="isLoading">
        {{ isLoading ? "Scanning..." : "Scan Receipt" }}
      </button>

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
  errorMessage.value = ""; 
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
    console.log("✅ Frontend Received Data:", response.data); 
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
  max-width: 600px;
  margin: 40px auto;
  font-family: "Georgia", serif;
  font-size: 16px;
  color: #333;
  line-height: 1.5;
  font-weight: 400;
  transition: all 0.3s ease;
  background-color: rgb(251, 248, 243);
  border-radius: 10px;
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
  transition: background-color 0.3s ease;
  text-align: center;
  margin: 0 auto;
  font-weight: bold;
  text-decoration: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  width: 20%;
  margin-top: 10px;
}

.custom-file-label:hover {
  background-color: #45a049;
  transition: background-color 0.3s ease;
  color: white;
  font-weight: bold;
  font-family: "Georgia", serif;
  font-size: 14px;
  padding: 8px 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  margin: 0 auto;
  text-decoration: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  width: 20%;
  margin-top: 10px;
  margin-bottom: 10px;
}

.file-name-input {
  display: block;
  padding: 8px 14px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 20%;
  font-family: "Georgia", serif;
  text-align: center;
  background-color: #f9f9f9;
  color: #333;
  transition: border-color 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-top: 10px;
  margin-bottom: 10px;
  font-weight: bold;
  text-decoration: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  justify-content: center;
  margin: 0 auto;
  margin-top: 15px;
  margin-bottom: 15px;
}

button {
  margin: 0 auto;
  margin-top: 10px;
  margin-bottom: 10px;
  padding: 8px 14px;
  font-size: 14px;
  border: none;
  background-color: #5eb761;
  color: white;
  cursor: pointer;
  border-radius: 5px;
  font-family: "Georgia", serif;
  font-weight: bold;
  text-decoration: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  width: 20%;
  transition: background-color 0.3s ease;
  text-align: center;
}

button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

button:hover:enabled {
  background-color: #45a049;
  transition: background-color 0.3s ease;
  color: white;
  font-weight: bold;
  font-family: "Georgia", serif;
  font-size: 14px;
  padding: 8px 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  margin: 0 auto;
  text-decoration: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  width: 20%;
  margin-top: 10px;
  margin-bottom: 10px;
}

.error-message {
  color: red;
  margin-top: 10px;
  font-size: 14px;
  font-family: "Georgia", serif;
  font-weight: bold;
  text-align: center;
  margin: 0 auto;
  padding: 10px;
  border: 1px solid red;
  border-radius: 5px;
  background-color: #ffe6e6;
  width: 80%;
  max-width: 400px;
  margin: 20px auto;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
</style>