<template>
  <nav v-if="isHomePage">
    <button @click="handleSignOut" v-if="isLoggedIn"> Sign Out </button>
  </nav>
  <router-view />
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter, useRoute } from 'vue-router';

const isLoggedIn = ref(false);
const router = useRouter();
const route = useRoute();
let auth;

onMounted(() => {
  auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user;
  });
});

const handleSignOut = () => {
  signOut(auth).then(() => {
    router.push('/');
  });
};
</script>

<style scoped>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background-color: bisque;
}
nav {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
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
</style>
