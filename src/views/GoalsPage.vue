<template>
    <div>
        <Navbar />
        <div class="content"> 
            <h1>Spending Goals Overview</h1>
            <p>Customize your spending goals for this month.</p>
            <div v-if="loading" class="loading-message">Loading...</div>
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
                        {{ getStatusMessage(spending[category], goal,category) }}
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
const spending = ref({});  
const loading = ref(true);

const defaultGoals = {
    Food: 500,
    Transport: 200,
    Shopping: 400,
    Utilities: 150,
    Groceries: 300,
    Others: 100
};

const totalBudget = computed(() => {
    return Object.values(spendingGoals.value).reduce((sum, goal) => sum + goal, 0);
});

const getStatusMessage = (spent, goal, category) => {
  const percentage = spent / goal;

  const tips = {
    Food: {
      overspent: "You've overspent on food! Try eating at home more.",
      "near-limit": "You're close to your food budget. Cook more to save!",
      meeting: "Great job managing your food spending!",
    },
    Transport: {
      overspent: "You've overspent on transport! Try carpooling or cycling.",
      "near-limit": "Almost at your transport limit. Consider fewer trips.",
      meeting: "Efficient transport usage. Keep it up!",
    },
    Utilities: {
      overspent: "You've overspent on utilities! Reduce AC or light usage.",
      "near-limit": "You're close to your utilities budget. Be mindful of energy use.",
      meeting: "You're saving well on utilities!",
    },
    Shopping: {
      overspent: "Overspent on shopping! Hold off on impulse buys.",
      "near-limit": "Almost at your shopping limit. Prioritize essentials.",
      meeting: "Smart shopping this month!",
    },
    Groceries: {
      overspent: "Grocery spending high! Make a list and stick to it.",
      "near-limit": "You're close to your grocery budget. Shop wisely.",
      meeting: "You're managing groceries well.",
    },
    Others: {
      overspent: "Spending too much on miscellaneous items!",
      "near-limit": "Close to the 'Others' budget. Evaluate your needs.",
      meeting: "Miscellaneous spending under control.",
    },
    default: {
      overspent: "You've overspent this month.",
      "near-limit": "You're close to your budget limit.",
      meeting: "You're on track!",
    }
  };

  const msgSet = tips[category] || tips.default;

  if (spent > goal) return msgSet.overspent;
  if (percentage >= 0.9) return msgSet["near-limit"];
  return msgSet.meeting;
};


const getStatusClass = (spent, goal) => {
    if (spent > goal) return "exceeded";
    if (spent >= goal * 0.9) return "near-limit";
    return "meeting";
};

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

const fetchSpending = async () => {
    if (!userDocId.value) return;

    const expensesRef = collection(db, "users", userDocId.value, "expenses");

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0"); 

    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`; 

    const q = query(
        expensesRef,
        where("date", ">=", startOfMonth),
        where("date", "<=", endOfMonth)
    );

    const querySnapshot = await getDocs(q);

    const categoryTotals = {
        Food: 0,
        Transport: 0,
        Shopping: 0,
        Utilities: 0,
        Groceries: 0,
        Others: 0
    };

    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.category && data.cost) {
            categoryTotals[data.category] += data.cost;
        }
    });

    spending.value = categoryTotals;
};

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

const saveGoal = async (category) => {
    if (!userDocId.value) return;

    const goalRef = doc(db, "users", userDocId.value, "spendingGoals", category);
    await setDoc(goalRef, { goal: spendingGoals.value[category] }, { merge: true });
    alert(`Updated ${category} goal to $${spendingGoals.value[category]}`);
};

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
.content {
    margin-top: 80px; 
    display: flex;
    flex-direction: column;
    justify-content: center; 
    align-items: center; 
    min-height: calc(100vh - 80px);
    background-color: rgb(251, 248, 243);
    text-align: center;
    font-family: 'Georgia', serif;
    font-size: 16px;
    color: #333;
    line-height: 1.5;
    padding: 20px;
    text-shadow: none;
    text-align: left;
    text-indent: 0;
    text-overflow: clip;
    text-underline-position: auto;
}

.total-budget {
    background-color: #f8f9fa;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 20px;
    border: 2px solid #ccc;
    text-shadow: none;
    text-align: left;
    text-indent: 0;
    text-overflow: clip;
    text-underline-position: auto;
}

h1, p {
    text-align: center;
    width: 100%;
    margin: 0;
    margin-top: 0px;
    margin-bottom: 10px;
    font-family: 'Georgia', serif;
    color: #333; 
}

.goal-container {
    display: flex;
    flex-direction: column;
    align-items: center; 
    width: 80%;
    max-width: 500px;
    margin-top: 20px;
    padding: 20px;
    background-color: rgb(251, 248, 243);
    border-radius: 10px;
    font-family: 'Georgia', serif;
    font-size: 16px;
    color: #333;
    line-height: 1.5;
    font-weight: 400;
}

.goal {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    transition: all 0.3s ease;
    font-family: 'Georgia', serif;
    font-size: 16px;
    color: #333;
    line-height: 1.5;
    font-weight: 400;
    
}

.goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%; 
    margin-bottom: 10px;
    font-family: 'Georgia', serif;
    font-size: 16px;
    color: #333;
    line-height: 1.5;
    font-weight: 400;
    text-align: left;
    text-indent: 0;
    text-overflow: clip;
    text-underline-position: auto;
    text-shadow: none;
}

progress {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    appearance: none;
    background-color: #ddd; 
    margin-bottom: 10px;
    font-family: 'Georgia', serif;
    font-size: 16px;
    color: #333;
    line-height: 1.5;
    font-weight: 400;
    text-align: left;
    text-indent: 0;
    text-overflow: clip;
    text-underline-position: auto;
    text-shadow: none;
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
    transition: background-color 0.3s ease;
    color: white;
    font-weight: bold;
    font-family: 'Georgia', serif;
    font-size: 12px;
    padding: 7px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    text-align: center;
    margin: 0 auto;
    text-decoration: none;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
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