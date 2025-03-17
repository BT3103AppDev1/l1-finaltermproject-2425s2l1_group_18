<template>
    <div>
        <Navbar />
        <div class="content"> <!-- Changed from "container" to "content" to match CSS -->
            <h1>Spending Goals Overview</h1>
            <p>Customize your spending goals for this month.</p>

            <!-- Loading State -->
            <div v-if="loading" class="loading-message">Loading...</div>

            <!-- Goals Display -->
            <div v-else class="goal-container">

                <div class="total-budget">Total Budget: ${{ totalBudget }}</div>

                <div v-for="(goal, category) in spendingGoals" :key="category" class="goal">
                    <div class="goal-header">
                        <h3>{{ category }}</h3>
                        <p>${{ spending[category] || 0 }} / ${{ goal }}</p>
                    </div>
                    <progress
                    :value="spending[category] || 0"
                    :max="goal"
                    :class="getStatusClass(spending[category], goal)"
                    ></progress>
                    <div class="goal-controls">
                        <input v-model.number="spendingGoals[category]" type="number" min="0" placeholder="Set goal" />
                        <button @click="saveGoal(category)">Save</button>
                    </div>
                    <div :class="getStatusClass(spending[category], goal)" class="goal-status">
                        {{ getStatusMessage(spending[category], goal) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
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

//Calculate Total budget
const totalBudget = computed(() => {
    return Object.values(spendingGoals.value).reduce((sum, goal) => sum + goal, 0);
});

const getStatusMessage = (spent, goal) => {
    if (spent > goal) return "Exceeded Limit! Watch your budget in other areas.";
    if (spent >= goal * 0.9) return "Near Limit! Watch your spendings.";
    return "Meeting Expectation! Well done.";
};

const getStatusClass = (spent, goal) => {
    if (spent > goal) return "exceeded";
    if (spent >= goal * 0.9) return "near-limit";
    return "meeting";
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
/* Ensure navbar does not overlap content */
.content {
    margin-top: 80px; /* Adjust based on your navbar height */
    display: flex;
    flex-direction: column;
    justify-content: center; /* Center content vertically */
    align-items: center; /* Center content horizontally */
    min-height: calc(100vh - 80px); /* Prevents overflow */
    background-color: rgb(251, 248, 243);
    text-align: center;
}
.total-budget {
    background-color: #f8f9fa;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 20px;
    border: 2px solid #ccc;
}

/* Center h1 and p */
h1, p {
    text-align: center;
    width: 100%;
    margin: 0; /* Remove default margins to ensure proper centering */
}

/* Goal container styling */
.goal-container {
    display: flex;
    flex-direction: column;
    align-items: center; /* Center goal items horizontally */
    width: 80%;
    max-width: 500px;
    margin-top: 20px;
}

.goal {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center; /* Center goal contents horizontally */
    width: 100%;
}

.goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%; /* Ensure goal header spans the full width */
}

progress {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    appearance: none;
    background-color: #ddd; /* Fallback background */
}

progress.meeting::-webkit-progress-value {
    background-color: green;
}
progress.near-limit::-webkit-progress-value {
    background-color: orange;
}
progress.exceeded::-webkit-progress-value {
    background-color: red;
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

.meeting {
    color: green;
}

.near-limit {
    color: orange;
}

.exceeded {
    color: red;
}
</style>