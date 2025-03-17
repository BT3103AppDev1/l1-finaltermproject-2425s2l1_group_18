<template>
    <div class="container">
        <h1>Register as a Normal User</h1>
        <p><input type="text" placeholder="Username" v-model="username"></p>
        <p v-if="usernameError" class="error">{{ usernameError }}</p>
        <p><input type="text" placeholder="Email" v-model="email"></p>
        <p v-if="emailError" class="error">{{ emailError }}</p>
        <p><input type="password" placeholder="Password" v-model="password"></p>
        <p><input type="number" placeholder="Monthly Saving Target" v-model="savingTarget"></p>
        <p>
            <button @click="register">Register</button>
            <button class="back-btn" @click="goToLogin">Back to Login</button>
        </p>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { db } from '../main.js';
import { collection, addDoc, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

const email = ref('');
const password = ref('');
const username = ref('');
const savingTarget = ref('');
const usernameError = ref('');
const emailError = ref('');
const router = useRouter();

// Function to check if username is unique
const checkUsernameUnique = async () => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username.value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty; // Returns true if username is unique
};

const register = async () => {
    usernameError.value = "";
    emailError.value = "";

    if (!await checkUsernameUnique()) {
        usernameError.value = "Username already taken!";
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(getAuth(), email.value, password.value);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);

        await setDoc(userDocRef, {
            uid: user.uid,
            username: username.value,
            email: email.value,
            savingTarget: parseFloat(savingTarget.value),
        });
        alert("User registered successfully!");
        router.push('/home');  // Redirect to home after successful registration
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            emailError.value = "Email already registered!";
        } else if (error.code === "auth/invalid-email") {
            emailError.value = "Invalid email format!";
        } else if (error.code === "auth/weak-password") {
            emailError.value = "Password should be at least 6 characters!";
        } else {
            console.error(error.code, error.message);
        }
    }
};

const goToLogin = () => {
    router.push('/');
};
</script>

<style scoped>
.container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: rgb(251, 248, 243);
}

h2, h1, p {
    text-align: center;
}

input {
    padding: 10px;
    width: 250px;
    border: 1px solid #ccc;
    border-radius: 5px;
    margin: 5px 0;
}

button {
    padding: 10px 20px;
    background-color: grey;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin: 5px;
}

button:hover {
    background-color: #0056b3;
}

.back-btn {
    background-color: #dc3545;
}

.back-btn:hover {
    background-color: #c82333;
}

.error {
    color: red;
}
</style>
