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

const auth = getAuth();
onMounted(() => {
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

<style>
body {
  margin: 0;
  font-family: "Georgia", serif;
  background-color: rgb(251, 248, 243);
}
</style>

<style scoped>
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
