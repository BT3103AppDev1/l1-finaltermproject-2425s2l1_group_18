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
}

.give-advice-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
  font-family: 'Georgia', serif;
}

.advice-textarea {
  width: 100%;
  padding: 15px;
  margin-top: 20px;
  margin-bottom: 20px;
  border-radius: 10px;
  font-family: inherit;
}

.client-dropdown {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  font-family: inherit;
  margin-bottom: 20px;
}

.label-input:focus {
  outline: none; 
}

.submit-btn {
  padding: 8px 25px;
  background-color: #5f83ad;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 13px;
  cursor: pointer;
}

.submit-btn:disabled {
  background-color: grey;
  cursor: not-allowed;
}
</style>
