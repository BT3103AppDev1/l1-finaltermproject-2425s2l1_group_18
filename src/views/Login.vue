<template>
    <div class="container">
        <img src="../assets/finbonacci_logo.png" alt="Finbonacci Logo" width="200">
        <h2>Login</h2>
        <h3>Take control of your financial future with us – smart tracking, powerful insights, and expert advice, all in one place!</h3>
        <p><input type="text" placeholder="Email or Username" v-model="loginInput"></p>
        <p><input type="password" placeholder="Password" v-model="password"></p>
        <p v-if="errMsg" class="error">{{ errMsg }}</p>
        <p><button @click="login">Sign In</button></p>
        <p><button class="register-btn" @click="goToRegister">Register</button></p>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { db } from '../main.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

const loginInput = ref('');
const password = ref('');
const errMsg = ref('');
const router = useRouter();

const login = async () => {
    let email = loginInput.value;

    if (!email.includes("@")) {
        // If input is not an email, assume it's a username and retrieve the associated email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", loginInput.value));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            errMsg.value = "Username not found";
            return;
        }

        email = querySnapshot.docs[0].data().email;
    }

    signInWithEmailAndPassword(getAuth(), email, password.value)
        .then(() => {
            console.log("Logged In");
            router.push('/home');
        })
        .catch((error) => {

            switch (error.code) {
                case "auth/invalid-email":
                    errMsg.value = "Invalid Email";
                    break;
                case "auth/user-not-found":
                    errMsg.value = "No Account With That Email/Username Found";
                    break;
                case "auth/wrong-password":
                    errMsg.value = "Wrong Password";
                    break;
            }
        });
};

const goToRegister = () => {
    router.push('/register');
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
}

button:hover {
    background-color: #0056b3;
}

.error {
    color: red;
}
</style>
