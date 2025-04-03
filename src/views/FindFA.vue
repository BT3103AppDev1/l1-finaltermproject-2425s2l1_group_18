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

        <!-- Modal for viewing FA details -->
        <div v-if="selectedFA" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <h3>FA Details</h3>
                <p><strong>Username:</strong> {{ selectedFA.username }}</p>
                <p><strong>Email:</strong> {{ selectedFA.email }}</p>
                <p><strong>Company:</strong> {{ selectedFA.company }}</p>
                <p><strong>About:</strong> {{ selectedFA.about }}</p>
                <p><strong>Representative Number:</strong> {{ selectedFA.representativeNumber }}</p>
                <p><strong>Total Clients:</strong> {{ selectedFA.totalClients }}</p>
                <button @click="closeModal">Close</button>
            </div>
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
import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const searchQuery = ref("");
const searchResults = ref([]);
const selectedFA = ref(null); // To store the selected FA for viewing
const receivedRequests = ref([]);
const currentClientId = ref(""); // Will be dynamically set
const currentClientUsername = ref(""); // Will be dynamically set
const currentClientEmail = ref(""); // Will be dynamically set
const currentClientFA = ref(null); // To store the currently assigned FA, if any

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

// Fetch the current client's details
const fetchCurrentClient = async () => {
    const user = auth.currentUser; // Get the currently authenticated user
    if (!user) {
        console.error("No authenticated user found.");
        return;
    }

    currentClientId.value = user.uid;
    console.log("Fetching client details for user ID:", currentClientId.value);

    try {
        const clientRef = doc(db, "users", user.uid);
        const clientDoc = await getDoc(clientRef);

        if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            console.log("Client data fetched:", clientData);

            currentClientUsername.value = clientData.username || "";
            currentClientEmail.value = clientData.email || "";
            currentClientFA.value = clientData.fa || null; // Store the assigned FA, if any
        } else {
            console.error("Client document does not exist in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching client details:", error);
    }
};

// Fetch received requests for the current client
const fetchReceivedRequests = async () => {
    if (!currentClientId.value) {
        console.error("Client ID is not set. Cannot fetch received requests.");
        return;
    }

    try {
        console.log("Fetching received requests for client ID:", currentClientId.value);

        const receivedRequestsRef = collection(db, "users", currentClientId.value, "receivedRequests");
        const querySnapshot = await getDocs(receivedRequestsRef);

        receivedRequests.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        console.log("Received requests:", receivedRequests.value);
    } catch (error) {
        console.error("Error fetching received requests:", error);
    }
};

// Accept a request from an FA
const acceptRequest = async (request) => {
    try {
        // Ensure client details are fetched before proceeding
        if (!currentClientUsername.value || !currentClientEmail.value) {
            console.log("Fetching client details before accepting request...");
            await fetchCurrentClient();
        }

        // Check if the client already has an assigned FA
        if (currentClientFA.value) {
            alert(`You already have an assigned FA: ${currentClientFA.value.username}. You cannot accept another request.`);
            return;
        }

        console.log("Accepting request from:", request.username);

        // Update client's document to save the FA
        const clientRef = doc(db, "users", currentClientId.value);
        await setDoc(clientRef, { fa: { id: request.id, username: request.username, email: request.email } }, { merge: true });

        // Add the client to the FA's clients subcollection
        const faClientRef = doc(db, "users", request.id, "clients", currentClientId.value);
        await setDoc(faClientRef, { id: currentClientId.value, username: currentClientUsername.value, email: currentClientEmail.value });

        // Remove the request from the client's receivedRequests subcollection
        const receivedRequestRef = doc(db, "users", currentClientId.value, "receivedRequests", request.id);
        await deleteDoc(receivedRequestRef);

        // Remove the request from the FA's sentRequests subcollection
        const faRequestRef = doc(db, "users", request.id, "sentRequests", currentClientId.value);
        await deleteDoc(faRequestRef);

        alert(`Accepted request from ${request.username}`);
        receivedRequests.value = receivedRequests.value.filter((r) => r.id !== request.id);

        // Update the currentClientFA value
        currentClientFA.value = { id: request.id, username: request.username, email: request.email };
    } catch (error) {
        console.error("Error accepting request:", error);
        alert("An error occurred while accepting the request. Please try again.");
    }
};

// Reject a request from an FA
const rejectRequest = async (request) => {
    try {
        // Remove the request from the client's receivedRequests subcollection
        const receivedRequestRef = doc(db, "users", currentClientId.value, "receivedRequests", request.id);
        await deleteDoc(receivedRequestRef);

        // Remove the request from the FA's sentRequests subcollection
        const faRequestRef = doc(db, "users", request.id, "sentRequests", currentClientId.value);
        await deleteDoc(faRequestRef);

        alert(`Rejected request from ${request.username}`);
        receivedRequests.value = receivedRequests.value.filter((r) => r.id !== request.id);
    } catch (error) {
        console.error("Error rejecting request:", error);
    }
};

// View FA details in a modal
const viewFA = async (fa) => {
    try {
        // Fetch the clients subcollection for the selected FA
        const clientsRef = collection(db, "users", fa.id, "clients");
        const querySnapshot = await getDocs(clientsRef);

        // Calculate the total number of clients
        const totalClients = querySnapshot.size;

        // Set the selected FA with the totalClients count
        selectedFA.value = {
            ...fa,
            totalClients,
        };
    } catch (error) {
        console.error("Error fetching FA clients:", error);
        selectedFA.value = {
            ...fa,
            totalClients: 0, // Default to 0 if there's an error
        };
    }
};

// Close the modal
const closeModal = () => {
    selectedFA.value = null;
};

// Fetch current client details and received requests on page load
onMounted(async () => {
    await fetchCurrentClient();
    await fetchReceivedRequests();
});
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