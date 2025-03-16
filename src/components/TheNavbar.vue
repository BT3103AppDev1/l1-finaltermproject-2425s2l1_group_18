<template>
    <nav class="navbar">
        <router-link to="/home">Home</router-link>
        <span class="separator">|</span>
        <router-link to="/uploads">Uploads</router-link>
        <span class="separator">|</span>
        <router-link to="/expenses">Expenses</router-link>
        <span class="separator">|</span>
        <router-link to="/goals">Goals</router-link>
        <span class="separator">|</span>
        <button @click="handleSignOut">Sign Out</button>
    </nav>
</template>

<script setup>
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();

const handleSignOut = () => {
    signOut(getAuth()).then(() => {
        router.push('/');
    });
};
</script>

<style scoped>
body, html {
    background-color: rgb(251, 248, 243);
    margin: 0;
    padding: 0;
}

.navbar {
    width : 60%;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px 10px;
    background-color: rgb(251, 248, 243);
    border-radius: 18px;
    border : 1.4px solid black;
    margin : 0 auto;
    margin-top: 40px;
}

.navbar a {
    color: black;
    text-decoration: none;
    font-size: 16px;
    margin: 0 15px;
    background-color: rgb(251, 248, 243);
}

.separator {
    margin: 0 10px;
    color: black;
}

.navbar button {
    background-color: rgb(251, 248, 243);
    font-family: "Georgia", serif;
    color: rgb(255, 76, 76);
    font-weight: bold;
    padding: 2px 5px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.navbar button:hover {
    background-color: rgb(228, 228, 228);
}
</style>