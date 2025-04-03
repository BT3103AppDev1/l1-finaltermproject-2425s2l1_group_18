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
                <!-- Disable the "Send Request" button if the client is in sentRequests or clients -->
                <button
                    :disabled="isRequestNotAllowed(client.id)"
                    @click="sendRequest(client)"
                >
                    {{ isRequestNotAllowed(client.id) ? "Request Not Allowed" : "Send Request" }}
                </button>
            </li>
        </ul>

        <!-- Modal for viewing client details -->
        <div v-if="selectedClient" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <h3>Client Details</h3>
                <p><strong>Username:</strong> {{ selectedClient.username }}</p>
                <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                <p><strong>Savings Target:</strong> {{ selectedClient.savingsTarget }}</p>
                <p><strong>Gender:</strong> {{ selectedClient.gender }}</p>
                <p><strong>Age:</strong> {{ selectedClient.age }}</p>
                <button @click="closeModal">Close</button>
            </div>
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
import { getFirestore, collection, query, where, getDoc, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const searchQuery = ref("");
const searchResults = ref([]);
const selectedClient = ref(null);
const sentRequests = ref([]);
const clients = ref([]); // To store the list of clients associated with the FA
const currentFAId = ref("");
const currentFAUsername = ref("");
const currentFAEmail = ref("");

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

// Fetch clients associated with the current FA
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

// Fetch the current FA's details correctly
const fetchCurrentFA = async () => {
    const user = auth.currentUser; // Get the currently authenticated user
    if (!user) {
        console.error("No authenticated user found.");
        return;
    }

    currentFAId.value = user.uid; // Set the FA's ID from the authenticated user
    console.log("Fetching FA details for user ID:", currentFAId.value);

    try {
        // Reference the FA's document in the Firestore "users" collection
        const faRef = doc(db, "users", user.uid); // Use the UID as the document ID
        const faDoc = await getDoc(faRef); // Fetch the FA's document

        if (faDoc.exists()) {
            const faData = faDoc.data(); // Get the FA's data
            console.log("FA document data:", faData);

            currentFAUsername.value = faData.username || "Unknown Username"; // Set the FA's username
            currentFAEmail.value = faData.email || "Unknown Email"; // Set the FA's email
        } else {
            console.error("FA document does not exist in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching FA details:", error);
    }
};

// Check if a request is not allowed (client is in sentRequests or clients)
const isRequestNotAllowed = (clientId) => {
    return (
        sentRequests.value.some((request) => request.id === clientId) ||
        clients.value.some((client) => client.id === clientId)
    );
};

// View client details in a modal
const viewClient = (client) => {
    selectedClient.value = client;
};

// Close the modal
const closeModal = () => {
    selectedClient.value = null;
};

const sendRequest = async (client) => {
    try {
        // Ensure FA details are fetched before sending the request
        if (!currentFAUsername.value || !currentFAEmail.value) {
            await fetchCurrentFA();
        }

        if (!currentFAUsername.value || !currentFAEmail.value) {
            console.error("FA details are still missing after fetching.");
            alert("Error: Unable to send request. FA details are missing.");
            return;
        }

        // Use Firestore batch update
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

        await batch.commit(); // Commit all changes in a single operation

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

// Fetch current FA details, sent requests, and clients on page load
onMounted(async () => {
    await fetchCurrentFA();
    await fetchSentRequests();
    await fetchClients();
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
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    text-align: left;
    max-width: 400px;
    width: 100%;
}

.modal button {
    margin-top: 20px;
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.modal button:hover {
    background-color: #0056b3;
}
</style>