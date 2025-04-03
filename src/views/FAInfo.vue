<template>
    <Navbar />
    <div class="fa-info-container">
        <h2>My Financial Advisor</h2>
        <div v-if="currentClientFA">
            <p><strong>Username:</strong> {{ currentClientFA.username }}</p>
            <p><strong>Email:</strong> {{ currentClientFA.email }}</p>
            <p><strong>Company:</strong> {{ currentClientFA.company }}</p>
            <p><strong>About:</strong> {{ currentClientFA.about }}</p>
            <p><strong>Representative Number:</strong> {{ currentClientFA.representativeNumber }}</p>
            <p><strong>Total Clients:</strong> {{ currentClientFA.totalClients }}</p>
            <button @click="removeFA" class="remove-btn">Remove Financial Advisor</button>
        </div>
        <div v-else>
            <h3>Oops! No Financial Advisor Now.</h3>
            <p>Add one to get started!</p>
            <button @click="goToFindFA" class="find-fa-btn">Find Financial Advisor</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();
const router = useRouter();

const currentClientFA = ref(null);
const currentClientId = ref("");

const fetchCurrentFA = async () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user found.");
        return;
    }

    currentClientId.value = user.uid;

    try {
        // Fetch the current client's document
        const clientRef = doc(db, "users", user.uid);
        const clientDoc = await getDoc(clientRef);

        if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            const faId = clientData.fa?.id; // Get the FA's UID from the client's document

            if (faId) {
                // Fetch the FA's main document using the FA's UID
                const faRef = doc(db, "users", faId);
                const faDoc = await getDoc(faRef);

                if (faDoc.exists()) {
                    const faData = faDoc.data();

                    // Combine FA data with the total clients count
                    const clientsRef = collection(db, "users", faId, "clients");
                    const querySnapshot = await getDocs(clientsRef);
                    const totalClients = querySnapshot.size;

                    currentClientFA.value = {
                        ...faData,
                        totalClients,
                    };
                } else {
                    console.error("FA document does not exist in Firestore.");
                }
            } else {
                currentClientFA.value = null; // No FA assigned
            }
        } else {
            console.error("Client document does not exist in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching current FA:", error);
    }
};

const removeFA = async () => {
    if (!currentClientFA.value) {
        alert("No Financial Advisor to remove.");
        return;
    }

    try {
        // Remove FA from the client's document
        const clientRef = doc(db, "users", currentClientId.value);
        await updateDoc(clientRef, { fa: null });

        // Remove the client from the FA's clients subcollection
        const faClientRef = doc(db, "users", currentClientFA.value.uid, "clients", currentClientId.value);
        await deleteDoc(faClientRef);

        alert(`Removed Financial Advisor: ${currentClientFA.value.username}`);
        currentClientFA.value = null;
    } catch (error) {
        console.error("Error removing Financial Advisor:", error);
        alert("An error occurred while removing the Financial Advisor. Please try again.");
    }
};

const goToFindFA = () => {
    router.push("/find-fa");
};

onMounted(fetchCurrentFA);
</script>

<style scoped>
.fa-info-container {
    max-width: 800px;
    margin: auto;
    padding: 20px;
    text-align: center;
}

p {
    font-size: 16px;
    margin: 10px 0;
}

button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 20px;
}

.remove-btn {
    background-color: #dc3545;
    color: white;
}

.remove-btn:hover {
    background-color: #c82333;
}

.find-fa-btn {
    background-color: #007bff;
    color: white;
}

.find-fa-btn:hover {
    background-color: #0056b3;
}
</style>