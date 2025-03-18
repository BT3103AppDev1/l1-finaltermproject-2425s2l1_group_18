<template>
    <div class = "settings-page">
        <Navbar />
        <div class="settings-container">
            <h2>Settings</h2>

            <div class="settings-options">
                <button @click="showChangePassword = true">Change Password</button>
                <button @click="showEditUsername = true">Edit Username</button>
                <button @click="showEditAge = true">Edit Age</button>
                <button @click="showEditGender = true">Edit Gender</button>
                <button @click="showEditSavingsTarget = true">Edit Savings Target</button>
            </div>
        </div>

        <!-- Password Edit Popup -->
        <div v-if="showChangePassword" class="modal-overlay">
            <div class="modal">
                <h3>Edit Password</h3>
                <input v-model="newPassword" type="password" placeholder="Enter new password" />
                <div class="modal-buttons">
                    <button @click="changePassword">Save</button>
                    <button @click="showChangePassword = false">Cancel</button>
                </div>
            </div>
        </div>

        <!--Username Edit Popup-->
        <div v-if="showEditUsername" class="modal-overlay">
            <div class="modal">
                <h3>Edit Username</h3>
                <p>Current Username: <strong>{{ currentUsername }}</strong></p>
                <input v-model="newUsername" placeholder="Enter new username" />
                <div class="modal-buttons">
                    <button @click="updateUsername">Save</button>
                    <button @click="showEditUsername = false">Cancel</button>
                </div>
            </div>
        </div>

        <!--Age Edit Popup-->
        <div v-if="showEditAge" class="modal-overlay">
            <div class="modal">
                <h3>Edit Age</h3>
                <p>Current Age: <strong>{{ currentAge }}</strong></p>
                <input type="number" v-model="newAge" placeholder="Enter your age" />
                <div class="modal-buttons">
                    <button @click="updateAge">Save</button>
                    <button @click="showEditAge = false">Cancel</button>
                </div>
            </div>
        </div>

        <!-- Gender Edit Popup -->
        <div v-if="showEditGender" class="modal-overlay">
            <div class="modal">
                <h3>Edit Gender</h3>
                <p>Current Gender: <strong>{{ currentGender }}</strong></p>
                <select v-model="newGender">
                    <option value="" disabled>Select your gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
                <div class="modal-buttons">
                    <button @click="updateGender">Save</button>
                    <button @click="showEditGender = false">Cancel</button>
                </div>
            </div>
        </div>

        <!--savingTarget Edit Popup-->
        <div v-if="showEditSavingsTarget" class="modal-overlay">
            <div class="modal">
                <h3>Edit Savings Target</h3>
                <p>Current Savings Target: <strong>{{ currentSavingsTarget }}</strong></p>
                <input v-model="newSavingsTarget" placeholder="Enter new savings target" />
                <div class="modal-buttons">
                    <button @click="updateSavingsTarget">Save</button>
                    <button @click="showEditSavingsTarget = false">Cancel</button>
                </div>
            </div>
        </div>


    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth, updateProfile, updateEmail, updatePassword, sendEmailVerification, reload } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { getFirestore, doc, updateDoc, query, where, getDocs, collection, getDoc } from 'firebase/firestore';
import Navbar from '../components/TheNavbar.vue';

const auth = getAuth();
const db = getFirestore();
const showChangePassword = ref(false);
const showEditUsername = ref(false);
const showEditAge = ref(false);
const showEditGender = ref(false);
const showEditSavingsTarget = ref(false);

// Reactive variables for user data
const currentUsername = ref('');
const currentAge = ref('');
const currentGender = ref('');
const currentSavingsTarget = ref('');

const newPassword = ref('');
const newUsername = ref('');
const newAge = ref('');
const newGender = ref('');
const newSavingsTarget = ref('');
const router = useRouter();

// Fetch user data on page load
onMounted(async () => {
    try {
        console.log('Fetching user data...');
        const user = auth.currentUser;
        if (!user) {
            console.error('No user signed in.');
            return;
        }

        console.log('User signed in:', user.uid);

        const userDoc = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userDoc);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            console.log('User data fetched:', userData);

            currentUsername.value = userData.username || '';
            currentAge.value = userData.age || '';
            currentGender.value = userData.gender || '';
            currentSavingsTarget.value = userData.savingTarget || '';
        } else {
            console.error('User document does not exist.');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
});

//change password
const changePassword = async () => {
    if (!newPassword.value.trim() || newPassword.value.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in.');

        // Check if the user's email is verified
        if (!user.emailVerified) {
            // Send a verification email
            await sendEmailVerification(user);
            alert('A verification email has been sent to your email address. Please verify it before changing your password.');

            // Poll for email verification
            const interval = setInterval(async () => {
                await reload(user); // Reload the user's authentication state
                if (user.emailVerified) {
                    clearInterval(interval); // Stop polling
                    alert('Your email has been verified! You can now change your password.');
                }
            }, 3000); // Check every 3 seconds

            return; // Stop further execution until the email is verified
        }

        // Update the password
        await updatePassword(user, newPassword.value);

        alert('Password updated successfully!');
        showChangePassword.value = false;
    } catch (error) {
        console.error('Error updating password:', error);

        if (error.code === 'auth/requires-recent-login') {
            alert('You need to log in again to change your password.');
        } else {
            alert('An error occurred. Please try again.');
        }
    }
};

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

const updateAge = async () => {
    if (!newAge.value || isNaN(newAge.value) || newAge.value <= 0) {
        alert('Please enter a valid age');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in.');

        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, { age: parseInt(newAge.value) });

        alert('Age updated successfully!');
        showEditAge.value = false;
    } catch (error) {
        console.error('Error updating age:', error);
        alert('An error occurred. Please try again.');
    }
};

const updateGender = async () => {
    if (!newGender.value.trim()) {
        alert('Please select a gender');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in.');

        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, { gender: newGender.value });

        alert('Gender updated successfully!');
        showEditGender.value = false;
    } catch (error) {
        console.error('Error updating gender:', error);
        alert('An error occurred. Please try again.');
    }
};

// update username
const updateSavingsTarget = async() => {
    if (!newSavingsTarget.value || isNaN(newSavingsTarget.value) || newSavingsTarget.value <= 0) {
    alert('Please enter a valid savings target');
    return;
}

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in.');

        //update firestore
        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, { savingTarget: newSavingsTarget.value });

        alert('Savings Target updated successfully!');
        showEditSavingsTarget.value = false;
    } catch (error) {
        console.error('Error updating savings target:', error);
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