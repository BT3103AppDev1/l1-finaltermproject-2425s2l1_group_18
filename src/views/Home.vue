<template>
    <div>
        <Navbar />
        <div class="container">
            <img src="../assets/finbonacci_logo.png" alt="Finbonacci Logo" width="200">
        </div>
    </div>
</template>

<script setup>
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';

const router = useRouter();
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
</style>
