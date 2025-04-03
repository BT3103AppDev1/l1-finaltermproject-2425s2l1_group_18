<template>
    <Navbar />
    <div class="find-client-container">
        <h2>Find Clients</h2>
        <input
            type="text"
            v-model="searchQuery"
            placeholder="Search for Clients..."
            @input="searchClients"
        />

        <h3>Search Results</h3>
        <ul>
            <li v-for="client in searchResults" :key="client.id">
                {{ client.username }}
                <button @click="viewClient(client)">View</button>
                <button @click="sendRequest(client)">Send Request</button>
            </li>
        </ul>

        <div v-if="selectedClient">
            <h3>Client Details</h3>
            <p><strong>Username:</strong> {{ selectedClient.username }}</p>
            <p><strong>Email:</strong> {{ selectedClient.email }}</p>
        </div>

        <h3>Sent Requests</h3>
        <ul>
            <li v-for="request in sentRequests" :key="request.id">
                {{ request.username }}
                <button @click="deleteRequest(request)">Delete</button>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const searchQuery = ref("");
const searchResults = ref([]);
const selectedClient = ref(null);
const sentRequests = ref([]);
const currentFAId = ref("");
const currentFAUsername = ref("");
const currentFAEmail = ref("");

// Fetch the current FA's details
const fetchCurrentFA = async () => {
    const user = auth.currentUser;
    if (user) {
        currentFAId.value = user.uid;

        try {
            const faRef = doc(db, "users", user.uid);
            const faDoc = await getDocs(faRef);

            if (faDoc.exists()) {
                const faData = faDoc.data();
                currentFAUsername.value = faData.username || "Unknown Username";
                currentFAEmail.value = faData.email || "Unknown Email";
            } else {
                console.error("FA document does not exist in Firestore.");
            }
        } catch (error) {
            console.error("Error fetching FA details:", error);
        }
    } else {
        console.error("No authenticated user found.");
    }
};

// Fetch clients dynamically based on the search query
const searchClients = async () => {
    if (searchQuery.value.trim() === "") {
        searchResults.value = []; // Clear results if search query is empty
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "User"));
        const querySnapshot = await getDocs(q);

        // Filter clients whose username starts with the search query
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

// Fetch sent requests for the current FA
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

// Send a request to a client
const sendRequest = async (client) => {
    try {
        // Add to FA's sentRequests subcollection
        const faRequestRef = doc(db, "users", currentFAId.value, "sentRequests", client.id);
        await setDoc(faRequestRef, {
            username: client.username,
            email: client.email,
        });

        // Add to client's receivedRequests subcollection
        const clientRequestRef = doc(db, "users", client.id, "receivedRequests", currentFAId.value);
        await setDoc(clientRequestRef, {
            username: currentFAUsername.value,
            email: currentFAEmail.value,
        });

        alert(`Request sent to ${client.username}`);
        sentRequests.value.push({ id: client.id, username: client.username, email: client.email });
    } catch (error) {
        console.error("Error sending request:", error);
    }
};

// Delete a sent request
const deleteRequest = async (request) => {
    try {
        // Remove from FA's sentRequests subcollection
        const faRequestRef = doc(db, "users", currentFAId.value, "sentRequests", request.id);
        await deleteDoc(faRequestRef);

        // Remove from client's receivedRequests subcollection
        const clientRequestRef = doc(db, "users", request.id, "receivedRequests", currentFAId.value);
        await deleteDoc(clientRequestRef);

        alert(`Request to ${request.username} deleted`);
        sentRequests.value = sentRequests.value.filter((r) => r.id !== request.id);
    } catch (error) {
        console.error("Error deleting request:", error);
    }
};

// View client details
const viewClient = (client) => {
    selectedClient.value = client;
};

// Fetch current FA details and sent requests on page load
onMounted(async () => {
    await fetchCurrentFA();
    await fetchSentRequests();
});
</script>

<style scoped>
.find-client-container {
    max-width: 800px;
    margin: auto;
    padding: 20px;
    text-align: center;
}

input {
    width: 100%;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

ul {
    list-style: none;
    padding: 0;
}

li {
    margin: 10px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

button {
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

button:hover {
    background-color: #ddd;
}
</style>