<template>
    <Navbar />
    <div class="find-client-container">
      <div class="columns">
        <!-- Left: Search -->
        <div class="box search-box">
          <h3>Search for Clients</h3>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search for Clients..."
            @input="searchClients"
          />
  
          <h3>Results:</h3>
          <ul>
            <li v-for="client in searchResults" :key="client.id">
              {{ client.username }}
              <div class="button-group">
                <button @click="viewClient(client)">View</button>
                <button
                  :disabled="isRequestNotAllowed(client.id)"
                  @click="sendRequest(client)"
                >
                  {{ isRequestNotAllowed(client.id) ? "Request Not Allowed" : "Send Request" }}
                </button>
              </div>
            </li>
          </ul>
        </div>
  
        <div class="box requests-box">
          <h3>Sent Requests</h3>
          <ul>
            <li v-for="request in sentRequests" :key="request.id">
              {{ request.username }}
              <div class="button-group">
                <button @click="viewClient(request)">View</button>
                <button @click="deleteRequest(request)">Remove</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="selectedClient" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3>Client Details</h3>
          <p><strong>Username:</strong> {{ selectedClient.username }}</p>
          <p><strong>Email:</strong> {{ selectedClient.email }}</p>
          <p><strong>Savings Target:</strong> {{ selectedClient.savingTarget }}</p>
          <p><strong>Gender:</strong> {{ selectedClient.gender }}</p>
          <p><strong>Age:</strong> {{ selectedClient.age }}</p>
          <button @click="closeModal">Close</button>
        </div>
      </div>
    </div>
  </template>

<script setup>
import { ref, onMounted } from "vue";
import { getFirestore, collection, query, where, getDoc, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const searchQuery = ref("");
const searchResults = ref([]);
const selectedClient = ref(null);
const sentRequests = ref([]);
const clients = ref([]); 
const currentFAId = ref("");
const currentFAUsername = ref("");
const currentFAEmail = ref("");

const searchClients = async () => {
    if (searchQuery.value.trim() === "") {
        searchResults.value = []; 
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "User"));
        const querySnapshot = await getDocs(q);

        searchResults.value = querySnapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((client) =>
                client.username.toLowerCase().startsWith(searchQuery.value.toLowerCase())
            );
    } catch (error) {
        console.error("Error fetching clients:", error);
    }
};

const fetchSentRequests = async () => {
    try {
        const sentRequestsRef = collection(db, "users", currentFAId.value, "sentRequests");
        const querySnapshot = await getDocs(sentRequestsRef);

        sentRequests.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching sent requests:", error);
    }
};

const fetchClients = async () => {
    try {
        const clientsRef = collection(db, "users", currentFAId.value, "clients");
        const querySnapshot = await getDocs(clientsRef);

        clients.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching clients:", error);
    }
};

const fetchCurrentFA = async () => {
    const user = auth.currentUser; 
    if (!user) {
        console.error("No authenticated user found.");
        return;
    }

    currentFAId.value = user.uid; 
    console.log("Fetching FA details for user ID:", currentFAId.value);

    try {
        const faRef = doc(db, "users", user.uid); 
        const faDoc = await getDoc(faRef); 

        if (faDoc.exists()) {
            const faData = faDoc.data(); 
            console.log("FA document data:", faData);

            currentFAUsername.value = faData.username || "Unknown Username"; 
            currentFAEmail.value = faData.email || "Unknown Email"; 
        } else {
            console.error("FA document does not exist in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching FA details:", error);
    }
};

const isRequestNotAllowed = (clientId) => {
    return (
        sentRequests.value.some((request) => request.id === clientId) ||
        clients.value.some((client) => client.id === clientId)
    );
};

const viewClient = (client) => {
    selectedClient.value = client;
};

const closeModal = () => {
    selectedClient.value = null;
};

const sendRequest = async (client) => {
    try {
        if (!currentFAUsername.value || !currentFAEmail.value) {
            await fetchCurrentFA();
        }

        if (!currentFAUsername.value || !currentFAEmail.value) {
            console.error("FA details are still missing after fetching.");
            alert("Error: Unable to send request. FA details are missing.");
            return;
        }

        const batch = writeBatch(db);
        const faRequestRef = doc(db, "users", currentFAId.value, "sentRequests", client.id);
        const clientRequestRef = doc(db, "users", client.id, "receivedRequests", currentFAId.value);

        batch.set(faRequestRef, {
            id: client.id,
            username: client.username,
            email: client.email,
        });

        batch.set(clientRequestRef, {
            id: currentFAId.value,
            username: currentFAUsername.value,
            email: currentFAEmail.value,
        });

        await batch.commit(); 

        alert(`Request sent to ${client.username}`);
        sentRequests.value.push({ id: client.id, username: client.username, email: client.email });
    } catch (error) {
        console.error("Error sending request:", error);
    }
};

const deleteRequest = async (request) => {
    try {
        const faRequestRef = doc(db, "users", currentFAId.value, "sentRequests", request.id);
        await deleteDoc(faRequestRef);

        const clientRequestRef = doc(db, "users", request.id, "receivedRequests", currentFAId.value);
        await deleteDoc(clientRequestRef);

        alert(`Request to ${request.username} deleted`);
        sentRequests.value = sentRequests.value.filter((r) => r.id !== request.id);
    } catch (error) {
        console.error("Error deleting request:", error);
    }
};

onMounted(async () => {
    await fetchCurrentFA();
    await fetchSentRequests();
    await fetchClients();
});
</script>

<style scoped>
.find-client-container {
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

.search-box {
  flex: 0.8;
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

.requests-box {
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

button:nth-of-type(2),
button:disabled {
  background-color: #ffb4b4;
}

button:nth-of-type(3) {
  background-color: #bff8c0;
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
  
.modal h3 {
  text-align: center; 
}

.modal button {
    background-color: #b0d5fc;
    color: black;
    margin-top: 20px;
    padding: 5px 20px;
}
</style>
