<template>
    <Navbar />
    <div class="find-fa-container">
      <div class="columns">
        <!-- Left: Search -->
        <div class="left-box">
          <h3>Search for Financial Advisors</h3>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search for Financial Advisors..."
            @input="searchFAs"
          />
  
          <h3>Results:</h3>
          <ul>
            <li v-for="fa in searchResults" :key="fa.id">
              {{ fa.username }}
              <button @click="viewFA(fa)">View</button>
            </li>
          </ul>
        </div>
  
        <!-- Right: Received Requests -->
        <div class="right-box">
      <h3>Received Requests</h3>
      <ul>
        <li v-for="request in receivedRequests" :key="request.id">
          {{ request.username }}
          <div class="button-group">
            <button @click="viewFA(request)">View</button>
            <button @click="acceptRequest(request)">Accept</button>
            <button @click="rejectRequest(request)">Remove</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
  
      <!-- Modal -->
      <div v-if="selectedFA" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3>FA Details</h3>
          <p><strong>Username:</strong> {{ selectedFA.username }}</p>
          <p><strong>Email:</strong> {{ selectedFA.email }}</p>
          <p><strong>Company:</strong> {{ selectedFA.company }}</p>
          <p><strong>About:</strong> {{ selectedFA.about }}</p>
          <p><strong>Representative Number:</strong> {{ selectedFA.representativeNumber }}</p>
          <p><strong>Total Clients:</strong> {{ selectedFA.totalClients }}</p>
          <div class="button-container">
            <button @click="closeModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
  import { getAuth } from "firebase/auth";
  import Navbar from "../components/TheNavbar.vue";
  
  const db = getFirestore();
  const auth = getAuth();
  
  const searchQuery = ref("");
  const searchResults = ref([]);
  const selectedFA = ref(null);
  const receivedRequests = ref([]);
  const currentClientId = ref("");
  const currentClientUsername = ref("");
  const currentClientEmail = ref("");
  const currentClientFA = ref(null);
  
  const searchFAs = async () => {
    if (searchQuery.value.trim() === "") {
      searchResults.value = [];
      return;
    }
  
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "FA"));
      const querySnapshot = await getDocs(q);
  
      searchResults.value = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter((fa) =>
        fa.username.toLowerCase().startsWith(searchQuery.value.toLowerCase())
      );
    } catch (error) {
      console.error("Error fetching FAs:", error);
    }
  };
  
  const fetchCurrentClient = async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    currentClientId.value = user.uid;
  
    try {
      const clientRef = doc(db, "users", user.uid);
      const clientDoc = await getDoc(clientRef);
  
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        currentClientUsername.value = clientData.username || "";
        currentClientEmail.value = clientData.email || "";
        currentClientFA.value = clientData.fa || null;
      }
    } catch (error) {
      console.error("Error fetching client:", error);
    }
  };
  
  const fetchReceivedRequests = async () => {
    if (!currentClientId.value) return;
  
    try {
      const receivedRequestsRef = collection(db, "users", currentClientId.value, "receivedRequests");
      const querySnapshot = await getDocs(receivedRequestsRef);
  
      receivedRequests.value = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching received requests:", error);
    }
  };
  
  const acceptRequest = async (request) => {
    try {
      if (!currentClientUsername.value || !currentClientEmail.value) {
        await fetchCurrentClient();
      }
  
      if (currentClientFA.value) {
        alert(`You already have an assigned FA: ${currentClientFA.value.username}.`);
        return;
      }
  
      const clientRef = doc(db, "users", currentClientId.value);
      await setDoc(clientRef, { fa: { id: request.id, username: request.username, email: request.email } }, { merge: true });
  
      const faClientRef = doc(db, "users", request.id, "clients", currentClientId.value);
      await setDoc(faClientRef, { id: currentClientId.value, username: currentClientUsername.value, email: currentClientEmail.value });
  
      const receivedRequestRef = doc(db, "users", currentClientId.value, "receivedRequests", request.id);
      await deleteDoc(receivedRequestRef);
  
      const faRequestRef = doc(db, "users", request.id, "sentRequests", currentClientId.value);
      await deleteDoc(faRequestRef);
  
      alert(`Accepted request from ${request.username}`);
      receivedRequests.value = receivedRequests.value.filter((r) => r.id !== request.id);
      currentClientFA.value = { id: request.id, username: request.username, email: request.email };
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };
  
  const rejectRequest = async (request) => {
    try {
      const receivedRequestRef = doc(db, "users", currentClientId.value, "receivedRequests", request.id);
      await deleteDoc(receivedRequestRef);
  
      const faRequestRef = doc(db, "users", request.id, "sentRequests", currentClientId.value);
      await deleteDoc(faRequestRef);
  
      alert(`Rejected request from ${request.username}`);
      receivedRequests.value = receivedRequests.value.filter((r) => r.id !== request.id);
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };
  
  const viewFA = async (fa) => {
    try {
      const clientsRef = collection(db, "users", fa.id, "clients");
      const querySnapshot = await getDocs(clientsRef);
  
      selectedFA.value = {
        ...fa,
        totalClients: querySnapshot.size,
      };
    } catch (error) {
      selectedFA.value = {
        ...fa,
        totalClients: 0,
      };
    }
  };
  
  const closeModal = () => {
    selectedFA.value = null;
  };
  
  onMounted(async () => {
    await fetchCurrentClient();
    await fetchReceivedRequests();
  });
  </script>
  
  <style scoped>
  .find-fa-container {
    max-width: 1200px;
    margin: auto;
    padding: 20px;
    font-family: "Georgia", serif;
  }
  
  .columns {
    display: flex;
    justify-content: space-between;
    gap: 30px;
    margin-top: 20px;
  }
  
  .columns {
    display: flex;
    justify-content: space-between;
   gap: 30px;
    margin-top: 20px;
  }

.left-box {
  flex: 2;
  max-width: 40%;
  background-color: rgb(251, 248, 243);
  padding: 20px;
  border: 1px solid grey;
  border-radius: 5px;
}

.right-box {
  flex: 3;
  max-width: 60%;
  background-color: rgb(251, 248, 243);
  padding: 20px;
  border: 1px solid grey;
  border-radius: 5px;
}

  
  input[type="text"] {
    width: 80%;
    padding: 8px;
    margin-bottom: 15px;
    border: 1px solid grey;
    border-radius: 12px;
    font-size: 14px;
    background-color: rgb(251, 248, 243);

  }
  
  h3 {
    margin-bottom: 20px;
    text-align: left;
    font-weight: bold;
    font-size: 20px;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  li {
    background-color: rgb(251, 248, 243);
    padding: 10px 15px;
    margin-bottom: 10px;
    border-radius: 8px;
    border: 1px solid rgb(166, 164, 164);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  button {
    padding: 5px 17px;
    border-radius: 20px;
    border: 0.5px solid grey;
    cursor: pointer;
    margin-left: 2px;
    font-size: 13px;
    font-family: "Georgia", serif;

  }
  
  button:hover {
    opacity: 0.85;
  }
  
  button:nth-of-type(1) {
    background-color: #b0d5fc;
  }
  
  button:nth-of-type(2) {
    background-color: #bff8c0;
  }
  
  button:nth-of-type(3) {
    background-color: #ffb4b4;
  }

  .button-group {
  display: flex;
  gap: 10px; /* Adjust gap between buttons */
}
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal {
    background: rgb(251, 248, 243);
    padding: 20px;
    border-radius: 10px;
    max-width: 350px;
    width: 100%;
    text-align: center;
  }
  
  .modal button {
    background-color: #b0d5fc;
    color: black;
    margin-top: 20px;
    padding: 5px 20px;
  }

  .modal h3 {
  text-align: center; 
  }

  .modal .button-container {
  display: flex;
  justify-content: center;
  }

  
  </style>
  
