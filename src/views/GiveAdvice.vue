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
  
      <textarea
        v-model="adviceText"
        placeholder="Type your advice here..."
        rows="10"
        class="advice-textarea"
      ></textarea>
  
      <button @click="submitAdvice" class="submit-btn" :disabled="!selectedClientId || !adviceText">
        Submit Advice
      </button>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { getAuth } from 'firebase/auth';
  import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc
  } from 'firebase/firestore';
  import Navbar from '../components/TheNavbar.vue';
  
  const db = getFirestore();
  const auth = getAuth();
  
  const adviceText = ref('');
  const selectedClientId = ref('');
  const clients = ref([]);
  
  const fetchClients = async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const snapshot = await getDocs(clientsRef);
  
    clients.value = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  };
  
  const submitAdvice = async () => {
    if (!selectedClientId.value || !adviceText.value) return;
  
    const clientDocRef = doc(db, 'users', selectedClientId.value);
    await updateDoc(clientDocRef, {
      adviceAvailable: true,
      adviceDate: new Date().toLocaleDateString(),
      adviceText: adviceText.value
    });
  
    alert('Advice successfully submitted!');
    adviceText.value = '';
    selectedClientId.value = '';
  };
  
  onMounted(fetchClients);
  </script>
  
  <style scoped>
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
  
  .submit-btn {
    padding: 10px 20px;
    background-color: #4ca1ff;
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .submit-btn:disabled {
    background-color: grey;
    cursor: not-allowed;
  }
  </style>
  