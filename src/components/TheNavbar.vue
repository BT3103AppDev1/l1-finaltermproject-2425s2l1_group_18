<template>
    <div class="navbar-container" v-if="userRole">
        <nav :class="['navbar', { 'fa-navbar': userRole === 'FA' }]">
            <router-link to="/home">Home</router-link>

            <template v-if="userRole === 'User'">
                <span class="separator">|</span>
                <router-link to="/uploads">Uploads</router-link>
                <span class="separator">|</span>
                <router-link to="/expenses">Expenses</router-link>
                <span class="separator">|</span>
                <router-link to="/goals">Goals</router-link>
                <span class="separator">|</span>
                <router-link to="/fa-info">FA Info</router-link>
                <span class="separator">|</span>
                <router-link to="/find-fa">Find FA</router-link>
            </template>

            <template v-if="userRole === 'FA'">
                <span class="separator">|</span>
                <router-link to="/find-client">Find Client</router-link>
                <span class="separator">|</span>
                <router-link to="/give-advice">Give Advice</router-link>
            </template>

            <span class="separator">|</span>
            <button @click="handleSignOut">Sign Out</button>

            <!-- Settings Icon -->
            <div class="settings-icon">
                <router-link to="/settings">
                    <img src="../assets/settings-icon.png" alt="Settings Icon" />
                </router-link>
            </div>

            <div class="profile-icon">
                <router-link to="/profile">
                    <img src="../assets/profile-icon.png" alt="Profile Icon" />
                </router-link>
            </div>
        </nav>
    </div>
</template>

<script setup>
import { getAuth, signOut } from 'firebase/auth';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const router = useRouter();
const userRole = ref(null);

const fetchUserRole = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
            userRole.value = userDoc.data().role;
        }
    }
};

onMounted(fetchUserRole);

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

.navbar-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80%;
    margin: 30px auto;
}

.navbar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 75%;
    padding: 10px 10px;
    background-color: rgb(251, 248, 243);
    border-radius: 18px;
    border: 1.4px solid black;
    margin: 0 auto;
}

.fa-navbar {
    width: 40%;
    justify-content: center;
    gap: 20px;
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

.settings-icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
}

.settings-icon img {
    width: 30px;
    height: 30px;
    object-fit: contain;
    cursor: pointer;
    margin-left: 10px;
}

.profile-icon {
    position: absolute;
    right: 50px;
    top: 50%;
    transform: translateY(-50%);
}

.profile-icon img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    cursor: pointer;
    margin-left: 10px;
}
</style>