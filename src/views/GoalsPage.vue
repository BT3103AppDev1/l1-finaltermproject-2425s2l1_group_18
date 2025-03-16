<template>
    <div>
        <Navbar />
        <div class="container">
            <h1>Spending Goals Overview</h1>
            <p>Customize your spending goals for this month.</p>

            <div v-if="loading">Loading...</div>
            <div v-else class="goal-container">
                <div v-for="(goal, category) in spendingGoals" :key="category" class="goal">
                    <div class="goal-header">
                        <h3>{{ category }}</h3>
                        <p>${{ spending[category] || 0 }} / ${{ goal }}</p>
                    </div>
                    <progress :value="spending[category] || 0" :max="goal"></progress>
                    <input v-model="spendingGoals[category]" type="number" min="0" />
                    <button @click="saveGoal(category)">Save</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, query, where, setDoc } from 'firebase/firestore';
import Navbar from '../components/TheNavbar.vue';

const auth = getAuth();
const db = getFirestore();

const userDocId = ref(null);
const spendingGoals = ref({});
const spending = ref({});  // Dynamically fetched from Firestore
const loading = ref(true);

const defaultGoals = {
    Food: 500,
    Transport: 200,
    Shopping: 400,
    Utilities: 150,
    Groceries: 300,
    Others: 100
};

// Get user document ID
const getUserDocId = async () => {
    const user = auth.currentUser;
    if (!user) return null;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    return null;
};

// Fetch spending from Firestore
const fetchSpending = async () => {
    if (!userDocId.value) return;

    const expensesRef = collection(db, "users", userDocId.value, "expenses");

    // Get current year and month
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Ensure 2-digit month

    // Define start and end date strings
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`; // Works since "31" is always the highest valid date

    // Firestore query to filter expenses within the current month
    const q = query(
        expensesRef,
        where("date", ">=", startOfMonth),
        where("date", "<=", endOfMonth)
    );

    const querySnapshot = await getDocs(q);

    // Reset spending amounts
    const categoryTotals = {
        Food: 0,
        Transport: 0,
        Shopping: 0,
        Utilities: 0,
        Groceries: 0,
        Others: 0
    };

    // Aggregate spending per category
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.category && data.cost) {
            categoryTotals[data.category] += data.cost;
        }
    });

    spending.value = categoryTotals;
};


// Fetch spending goals
const fetchSpendingGoals = async () => {
    const docId = await getUserDocId();
    if (!docId) return;

    userDocId.value = docId;
    const goalsRef = collection(db, "users", userDocId.value, "spendingGoals");
    const querySnapshot = await getDocs(goalsRef);

    if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
            spendingGoals.value[doc.id] = doc.data().goal;
        });
    } else {
        spendingGoals.value = { ...defaultGoals };

        for (const category in defaultGoals) {
            const goalRef = doc(db, "users", userDocId.value, "spendingGoals", category);
            await setDoc(goalRef, { goal: defaultGoals[category] });
        }
    }

    await fetchSpending();
    loading.value = false;
};

// Save or update a goal
const saveGoal = async (category) => {
    if (!userDocId.value) return;

    const goalRef = doc(db, "users", userDocId.value, "spendingGoals", category);
    await setDoc(goalRef, { goal: spendingGoals.value[category] }, { merge: true });
    alert(`Updated ${category} goal to $${spendingGoals.value[category]}`);
};

// Fetch data when the user logs in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await fetchSpendingGoals();
    } else {
        spendingGoals.value = {};
        spending.value = {};
        loading.value = false;
    }
});
</script>

<style scoped>
.container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: rgb(251, 248, 243);
    text-align: center;
}

.goal-container {
    width: 80%;
    max-width: 500px;
    margin-top: 20px;
}

.goal {
    margin-bottom: 20px;
}

.goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

progress {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    appearance: none;
}

progress::-webkit-progress-bar {
    background-color: #e0e0e0;
    border-radius: 5px;
}

progress::-webkit-progress-value {
    background-color: #76c7c0;
    border-radius: 5px;
}

input {
    width: 100px;
    padding: 5px;
    margin: 5px;
}

button {
    background-color: #76c7c0;
    color: white;
    border: none;
    padding: 5px 10px;
    cursor: pointer;
    margin-left: 5px;
}

button:hover {
    background-color: #5aa59a;
}
</style>
