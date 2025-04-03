<template>
    <Navbar />
    <div class="find-fa-container">
        <h2>Find Financial Advisors</h2>
        <input
            type="text"
            v-model="searchQuery"
            placeholder="Search for Financial Advisors..."
            @input="searchFAs"
        />

        <h3>Search Results</h3>
        <ul>
            <li v-for="fa in searchResults" :key="fa.id">
                {{ fa.username }}
                <button @click="viewFA(fa)">View</button>
            </li>
        </ul>

        <div v-if="selectedFA">
            <h3>FA Details</h3>
            <p><strong>Username:</strong> {{ selectedFA.username }}</p>
            <p><strong>Email:</strong> {{ selectedFA.email }}</p>
            <p><strong>Company:</strong> {{ selectedFA.company }}</p>
        </div>

        <h3>Received Requests</h3>
        <ul>
            <li v-for="request in receivedRequests" :key="request.id">
                {{ request.username }}
                <button @click="acceptRequest(request)">Accept</button>
                <button @click="rejectRequest(request)">Reject</button>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();

const searchQuery = ref("");
const searchResults = ref([]);
const selectedFA = ref(null);
const receivedRequests = ref([]);
const currentClientId = "currentClientId"; // Replace with the logged-in client's ID

// Fetch FAs dynamically based on the search query
const searchFAs = async () => {
    if (searchQuery.value.trim() === "") {
        searchResults.value = []; // Clear results if search query is empty
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "FA"));
        const querySnapshot = await getDocs(q);

        // Filter FAs whose username starts with the search query
        searchResults.value = querySnapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((fa) =>
                fa.username.toLowerCase().startsWith(searchQuery.value.toLowerCase())
            );
    } catch (error) {
        console.error("Error fetching FAs:", error);
    }
};

// Fetch received requests for the current client
const fetchReceivedRequests = async () => {
    try {
        const receivedRequestsRef = collection(db, "users", currentClientId, "receivedRequests");
        const querySnapshot = await getDocs(receivedRequestsRef);

        receivedRequests.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching received requests:", error);
    }
};

// Accept a request from an FA
const acceptRequest = async (request) => {
    try {
        // Update client's document to save the FA
        const clientRef = doc(db, "users", currentClientId);
        await setDoc(clientRef, { fa: { id: request.id, username: request.username, email: request.email } }, { merge: true });

        // Add the client to the FA's clients subcollection
        const faClientRef = doc(db, "users", request.id, "clients", currentClientId);
        await setDoc(faClientRef, { id: currentClientId, username: "ClientUsername", email: "ClientEmail" }); // Replace with actual client details

        // Remove the request from the client's receivedRequests subcollection
        const receivedRequestRef = doc(db, "users", currentClientId, "receivedRequests", request.id);
        await deleteDoc(receivedRequestRef);

        alert(`Accepted request from ${request.username}`);
        receivedRequests.value = receivedRequests.value.filter((r) => r.id !== request.id);
    } catch (error) {
        console.error("Error accepting request:", error);
    }
};

// Reject a request from an FA
const rejectRequest = async (request) => {
    try {
        // Remove the request from the client's receivedRequests subcollection
        const receivedRequestRef = doc(db, "users", currentClientId, "receivedRequests", request.id);
        await deleteDoc(receivedRequestRef);

        // Remove the request from the FA's sentRequests subcollection
        const faRequestRef = doc(db, "users", request.id, "sentRequests", currentClientId);
        await deleteDoc(faRequestRef);

        alert(`Rejected request from ${request.username}`);
        receivedRequests.value = receivedRequests.value.filter((r) => r.id !== request.id);
    } catch (error) {
        console.error("Error rejecting request:", error);
    }
};

// View FA details
const viewFA = (fa) => {
    selectedFA.value = fa;
};

// Fetch received requests on page load
onMounted(fetchReceivedRequests);
</script>

<style scoped>
.find-fa-container {
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