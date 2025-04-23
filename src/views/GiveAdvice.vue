<template>
  <Navbar />
  <div class="give-advice-container">
    <h2>Give Financial Advice</h2>

    <select v-model="selectedClientId" class="client-dropdown">
      <option disabled value="">Select a client</option>
      <option v-for="client in clients" :key="client.uid" :value="client.uid">
        {{ client.username }}
      </option>
    </select>

    <input
      v-model="adviceLabel"
      placeholder="Label for this advice (e.g., Investment Strategy)"
      class="label-input"
    />

    <textarea
      v-model="adviceText"
      placeholder="Type your advice here..."
      rows="10"
      class="advice-textarea"
    ></textarea>

    <button
      @click="submitAdvice"
      class="submit-btn"
      :disabled="!selectedClientId || !adviceText.trim() || loadingSubmit"
    >
      <span v-if="loadingSubmit">Submitting...</span>
      <span v-else>Submit Advice</span>
    </button>

    <p v-if="submitMessage" :class="['feedback-message', submitError ? 'error' : 'success']">
      {{ submitMessage }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import { addDoc, getFirestore, collection, getDocs } from 'firebase/firestore';
import Navbar from '../components/TheNavbar.vue';

const db = getFirestore();
const auth = getAuth();

const adviceText = ref('');
const selectedClientId = ref('');
const clients = ref([]);
const adviceLabel = ref('');

const loadingClients = ref(false);
const loadingSubmit = ref(false);
const submitMessage = ref('');
const submitError = ref(false);

const fetchClients = async () => {
  loadingClients.value = true;
  try {
    const user = auth.currentUser;
    if (!user) return;

    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const snapshot = await getDocs(clientsRef);

    clients.value = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching clients:', error);
    submitMessage.value = 'Failed to load clients. Please refresh.';
    submitError.value = true;
  } finally {
    loadingClients.value = false;
  }
};

const clearForm = () => {
  adviceText.value = '';
  selectedClientId.value = '';
  adviceLabel.value = '';
};

const submitAdvice = async () => {
  if (!selectedClientId.value || !adviceText.value.trim()) return;

  loadingSubmit.value = true;
  submitMessage.value = '';
  submitError.value = false;

  try {
    const adviceRef = collection(db, 'users', selectedClientId.value, 'advice');

    await addDoc(adviceRef, {
      label: adviceLabel.value || 'General Advice',
      content: adviceText.value.trim(),
      timestamp: new Date(),
    });

    submitMessage.value = '✔️ Advice successfully submitted!';
    submitError.value = false;
    clearForm();
  } catch (error) {
    console.error('Error submitting advice:', error);
    submitMessage.value = '❌ Failed to submit advice. Please try again.';
    submitError.value = true;
  } finally {
    loadingSubmit.value = false;
  }
};

onMounted(fetchClients);
</script>

<style scoped>
textarea:focus, input:focus {
  outline: 0.7px solid #5f83ad; 
  border-radius: 4px; 
}

select:focus {
  outline: 0.7px solid #5f83ad; 
  border-radius: 4px; 
  max-width: 600px;
  margin: 0 auto;
  padding: 10px;
  font-family: inherit;
  font-size: 16px;
  color: #333;
}

.give-advice-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
  font-family: 'Georgia', serif;
  background-color: rgb(251, 248, 243);
  border-radius: 10px;
  font-size: 16px;
  color: #333;
  line-height: 1.5;
  font-weight: 400;
}

.advice-textarea {
  width: 100%;
  padding: 15px;
  margin-top: 20px;
  margin-bottom: 20px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 16px;
  color: #333;
  border: 1px solid #ccc;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

textarea:focus, input:focus {
  outline: none;
  border-color: #5f83ad; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(95, 131, 173, 0.5); /* Add a subtle glow */
}

.client-dropdown {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  font-family: inherit;
  margin-bottom: 20px;
  font-size: 16px;
  color: #333;
  border: 1px solid #ccc;
}

.client-dropdown:focus {
  outline: none;
  border-color: #5f83ad;
  box-shadow: 0 0 5px rgba(95, 131, 173, 0.5);
}

.input-label {
  font-size: 16px;
  margin-bottom: 10px;
  color: #333;
  width: 100%;
  text-align: left;
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: #333;
  line-height: 1.5;
  font-weight: 400;
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 5px;
  font-weight: bold;
}

.submit-btn {
  padding: 8px 25px;
  background-color: #5f83ad;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-family: 'Georgia', serif;
  font-size: 16px;
  line-height: 1.5;
}

.submit-btn:disabled {
  background-color: grey;
  cursor: not-allowed;
}

.submit-btn:hover {
  background-color: #4a6d91; /* Darker shade on hover */
  transform: scale(1.05); /* Slightly enlarge on hover */
}
</style>
