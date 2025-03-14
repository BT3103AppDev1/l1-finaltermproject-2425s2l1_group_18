<template>
    <div>
        <Navbar />
        <div class="container">
            <h1>Uploads Page</h1>
            <p>This is the uploads section. Feature coming soon!</p>
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
    text-align: center;
}
</style>
