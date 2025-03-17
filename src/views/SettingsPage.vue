<template>
    <div class = "settings-page">
        <Navbar />
        <div class="settings-container">
            <h2>Settings</h2>

            <div class="settings-options">
                <button @click='showEditUsername = true'>Edit Username</button>
                <button>Edit Age</button>
                <button>Edit Gender</button>
                <button>Edit Savings Target</button>
            </div>
        </div>

        <!--Username Edit Popup-->
        <div v-if="showEditUsername" class="modal-overlay">
            <div class="modal">
                <h3>Edit Username</h3>
                <input v-model="newUsername" placeholder="Enter new username" />
                <div class="modal-buttons">
                    <button @click="updateUsername">Save</button>
                    <button @click="showEditUsername = false">Cancel</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { getAuth, updateProfile } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { getFirestore, doc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore';
import Navbar from '../components/TheNavbar.vue';

const auth = getAuth();
const db = getFirestore();
const showEditUsername = ref(false);
const newUsername = ref('');
const router = useRouter();

// update username
const updateUsername = async() => {
    if (!newUsername.value.trim()) {
        alert('Username cannot be empty');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in.');

        //check if the username is already taken
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', newUsername.value));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            alert('This username is already taken. Please choose another one.');
            return;
        }

        //update auth profile
        await updateProfile(user, {displayName: newUsername.value });

        //update firestore
        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, { username: newUsername.value });

        alert('Username updated successfully!');
        showEditUsername.value = false;
    } catch (error) {
        console.error('Error updating username:', error);
        alert('An error occurred. Please try again.');
    }
};
</script>

<style scoped>
.settings-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
}

.settings-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgb(251, 248, 243);
    text-align: center;
    padding: 20px;
}

h2 {
    font-size: 24px;
    margin-bottom: 20px;
}

.setting-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 250px;
}

button {
    width: 100%;
    padding: 10px;
    border-radius: 20px;
    border: 1px solid black;
    background-color: #f8f1e8;
    font-size: 16px;
    cursor: pointer;
    transition: 0.3s;
    margin-bottom: 30px;
}

button:hover {
    background-color: #ded3c0; /* added slight colour change */
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal {
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    width: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.modal input {
    width: 100%;
    padding: 10px;
    margin: 10px 0;
    border: 1px solid #ccc;
    border-radius: 5px;
}

.modal-buttons {
    display: flex;
    justify-content: center;
    margin-top: 10px;
}

.modal-buttons button {
    padding: 10px 20px;
    border: 1px solid black;
    border-radius: 5px;
    cursor: pointer;
    transition: 0.3s;  
    margin: 0 10px;
}

.modal-buttons button:hover {
    background-color: #f8f1e8;
}
</style>