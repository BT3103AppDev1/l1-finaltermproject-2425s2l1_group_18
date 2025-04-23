<template>
  <div class="profile-page">
      <Navbar />

      <div class="profile-container">
          <h1>My Profile</h1>

          <div class="profile-info">
              <p><strong>Username:</strong> {{ userProfile.username }}</p>
              <p><strong>Email:</strong> {{ userProfile.email }}</p>
              <p><strong>Age:</strong> {{ userProfile.age }}</p>
              <p><strong>Gender:</strong> {{ userProfile.gender }}</p>
              
              <div v-if="userProfile.role === 'FA'">
                  <p><strong>Representative Number:</strong> {{ userProfile.regNumber }}</p>
                  <p><strong>About:</strong> {{ userProfile.about }}</p>
                  <p><strong>Company:</strong> {{ userProfile.company }}</p>
              </div>
              <div v-else>
                  <p><strong>Saving Target:</strong> ${{ userProfile.savingTarget }}</p>
              </div>
          </div>

          <button @click="goToSettings" class="settings-btn">Edit Profile</button>
      </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../main.js';
import { useRouter } from 'vue-router';
import Navbar from '../components/TheNavbar.vue';

const router = useRouter();
const userProfile = ref({
  username: '',
  email: '',
  gender: '',
  age: '',
  savingTarget: 0,
  role: '',
  representativeNumber: '',
  about: '',
  company: ''
});

const fetchUserProfile = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
          userProfile.value = userDocSnap.data();
      } else {
          console.error("User profile not found.");
      }
  }
};

onMounted(fetchUserProfile);

const goToSettings = () => {
  router.push('/settings');
};
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  justify-content: center;
  text-align: center;
  background-color: rgb(251, 248, 243);
  
}

.profile-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgb(251, 248, 243);
  text-align: center;
  padding: 20px;
  width: 90%;
  max-width: 800px;
  min-width: 400px;
}

h1 {
  text-align: center;
}

.profile-info {
  background: rgb(251, 248, 243);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: left;
}

.profile-info p {
  font-size: 16px;
  margin: 25px 0;
  line-height: 1.5;
  color: #333;
  font-family: 'Georgia', serif;
  font-weight: 400;
  text-align: left;
  margin-left: auto;
  margin-right: auto;
}

.settings-btn {
  margin-top: 20px;
  padding: 7px 15px;
  background-color: grey;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}

.settings-btn:hover {
  background-color: #707070;
  transition: background-color 0.3s ease;
  color: white;
  font-weight: bold;
  font-family: 'Georgia', serif;
  font-size: 12px;
  padding: 7px 15px;
  border: none;
}

.button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 20px;
  margin: 4px 2px;
  cursor: pointer;
}

.button:hover {
  background-color: #45a049;
  transition: background-color 0.3s ease;
  color: white;
  font-weight: bold;
  font-family: 'Georgia', serif;
  font-size: 12px;
  padding: 7px 15px;
  border: none;
}
</style>