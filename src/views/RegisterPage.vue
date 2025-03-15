<template>
    <div class="container">
        <h1>Register as a Normal User</h1>
        <p><input type="text" placeholder="Username" v-model="username"></p>
        <p v-if="usernameError" class="error">{{ usernameError }}</p>
        <p><input type="text" placeholder="Email" v-model="email"></p>
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
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const email = ref('');
const password = ref('');
const username = ref('');
const savingTarget = ref('');
const usernameError = ref('');
const router = useRouter();

const checkUsernameUnique = async () => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username.value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
};

const register = async () => {
    if (!await checkUsernameUnique()) {
        usernameError.value = "Username already taken!";
        return;
    }

    createUserWithEmailAndPassword(getAuth(), email.value, password.value)
        .then(async (userCredential) => {
            const user = userCredential.user;
            await addDoc(collection(db, "users"), {
                uid: user.uid,
                username: username.value,
                email: email.value,
                savingTarget: parseFloat(savingTarget.value),
            });
            router.push('/home');
        })
        .catch((error) => {
            console.error(error.code, error.message);
        });
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
    background-color: bisque;
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