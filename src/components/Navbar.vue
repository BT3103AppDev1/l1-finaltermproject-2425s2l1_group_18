<template>
    <nav class="navbar">
        <router-link to="/home">Home</router-link>
        <router-link to="/uploads">Uploads</router-link>
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
.navbar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px 20px;
    background-color: grey;
}

.navbar a {
    color: white;
    text-decoration: none;
    font-size: 16px;
    margin: 0 15px;
}

.navbar button {
    background-color: red;
    color: white;
    padding: 8px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.navbar button:hover {
    background-color: darkred;
}
</style>