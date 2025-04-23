<template>
    <Navbar />
    <div class="find-fa-container">
      <div class="columns">
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
      <div v-if="selectedFA" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3>FA Details</h3>
          <p><strong>Username:</strong> {{ selectedFA.username }}</p>
          <p><strong>Email:</strong> {{ selectedFA.email }}</p>
          <p><strong>Company:</strong> {{ selectedFA.company }}</p>
          <p><strong>About:</strong> {{ selectedFA.about }}</p>
          <p><strong>Representative Number:</strong> {{ selectedFA.regNumber }}</p>
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
    justify-content: center;
    align-items: center;
    text-align: center;
    background-color: rgb(251, 248, 243);
  }
  
  .columns {
    display: flex;
    justify-content: space-between;
    gap: 30px;
    margin-top: 20px;
    flex-wrap: wrap;
    align-items: flex-start;
    width: 100%;
    text-align: center;
    font-family: "Georgia", serif;
    background-color: rgb(251, 248, 243);
  }
  
  .columns {
    display: flex;
    justify-content: space-between;
   gap: 30px;
    margin-top: 20px;
  }

.box {
  background-color: rgb(251, 248, 243);
  padding: 20px;
  border: 1px solid #000;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 1;
  min-width: 300px;
  margin-bottom: 20px;
  font-family: "Georgia", serif;
  font-size: 16px;
  color: #333;
  font-weight: 400;
  text-align: left;
}

.left-box {
  flex: 0.8;
  margin-right: 20px;
  background-color: rgb(251, 248, 243);
  padding: 20px;
  border: 1px solid #000;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: "Georgia", serif;
  font-size: 16px;
  color: #333;}

.right-box {
  flex: 1.2;
  margin-right: 20px;
  background-color: rgb(251, 248, 243);
  padding: 20px;
  border: 1px solid #000;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: "Georgia", serif;
  font-size: 16px;
  color: #333;
}

  
input[type="text"] {
  width: 80%;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid grey;
  border-radius: 12px;
  font-size: 14px;
  background-color: rgb(251, 248, 243);
  font-family: "Georgia", serif;
  color: #333;  
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
    transition: box-shadow 0.3s ease;
  }
  
  li:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: box-shadow 0.3s ease;
    transform: translateY(-2px);
  }

  .button-group {
    display: flex;
    gap: 10px;
  }

  button {
    padding: 5px 17px;
    border-radius: 20px;
    border: 0.5px solid grey;
    cursor: pointer;
    font-size: 12px;
    font-family: "Georgia", serif;
    color: white;
    transition: background-color 0.3s ease, color 0.3s ease;
    font-weight: bold;
    background-color: grey;
    color: black;
    font-family: "Georgia", serif;
    font-size: 14px;
  }
  
  button:hover {
    opacity: 0.85;
    transition: background-color 0.3s ease, color 0.3s ease;
    font-weight: bold;
    font-family: "Georgia", serif;
    background-color: #a0c4ff;
    color: white;
    font-size: 14px;
    padding: 5px 17px;
    border-radius: 20px;
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
  gap: 10px; 
  }
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
  
