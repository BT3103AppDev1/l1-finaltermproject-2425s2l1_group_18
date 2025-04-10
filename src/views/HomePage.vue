<template>
  <div>
    <Navbar />
    <div class="container">
      <div v-if="userProfile.role === 'FA'"><h2>Client Analytics</h2></div>
      <div v-else><h2>Expense Analytics</h2></div>

      <div v-if="userProfile.role === 'FA'">
        <p>Total Clients: {{ totalClients }}</p>
        <div class="find-client-container">
        <h2>Find Clients</h2>
        <input
            type="text"
            v-model="searchQuery"
            placeholder="Search for Clients..."
            @input="searchClients"
        />

        <h3>Search Results</h3>
        <ul>
            <li v-for="client in searchResults" :key="client.id">
                {{ client.username }}
                <button @click="viewClient(client)">View</button>
            </li>
        </ul>

        <!-- Modal for viewing client details -->
        <div v-if="selectedClient" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <h3>Client Details</h3>
                <p><strong>Username:</strong> {{ selectedClient.username }}</p>
                <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                <p><strong>Savings Target:</strong> {{ selectedClient.savingsTarget }}</p>
                <p><strong>Gender:</strong> {{ selectedClient.gender }}</p>
                <p><strong>Age:</strong> {{ selectedClient.age }}</p>
                <button @click="closeModal">Close</button>
            </div>
        </div>

        </div>
        
    </div>
      
      <div v-else>
        <!-- Month Selector -->
        <label>Select Month:</label>
        <select v-model="selectedMonth" @change="updateCharts">
          <option v-for="month in availableMonths" :key="month" :value="month">
            {{ month }}
          </option>
        </select>
        
        <h1> Total budget: {{totalBudget }}</h1> <br>

        <!-- Pie Charts Container -->
        <div class="charts-container">
          <!-- Pie Chart: Total Spent vs. Total Budget -->
          <div class="chart">
            <h3>Budget Usage</h3>
            <pie-chart :data="budgetPieChartData" :download="true" :colors="['#ff0000','#008000']"/>
          </div>
          <!-- Pie Chart: Spending by Category -->
          <div class="chart">
            <h3>Spending by Category</h3>
            <pie-chart :data="pieChartData" :download="true" />
          </div>
        </div>

        <!-- Table: Budget Summary -->
        <h3>Budget Summary</h3>
        <table>
          <tbody>
            <tr>
              <th>Total Budget ($):</th>
              <td>${{ totalBudget.toFixed(2) }}</td>
            </tr>
            <tr>
              <th>Spent Amount ($):</th>
              <td>${{ totalExpenses.toFixed(2) }}</td>
            </tr>
            <tr>
              <th>Remaining Balance ($):</th>
              <td>${{ (totalBudget - totalExpenses).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
        <br>

        <!-- Table: Spending Breakdown -->
        <h3>Breakdown by Category</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(amount, category) in categoryTotals" :key="category">
              <td>{{ category }}</td>
              <td>${{ amount.toFixed(2) }}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>${{ totalExpenses.toFixed(2) }}</strong></td>
            </tr>
          </tbody>
        </table>
        <br>
        <!-- Line Chart: Spending Over Time -->
        <h3>Spending Over Time</h3>
        <line-chart :data="lineChartData" :download="true" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const expenses = ref([]);
const selectedMonth = ref(""); // Format: "MM/YYYY"
const availableMonths = ref([]); // List of available months for selection

const pieChartData = ref([]);
const lineChartData = ref([]);
const budgetPieChartData = ref([]);
const categoryTotals = ref({});

const userProfile = ref({});
const totalClients = ref(0);

// Get the current user document ID
const getUserDocId = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("uid", "==", user.uid));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    userProfile.value = userDoc.data();
    return userDoc.id;
  }
  return null;
};

// Fetch expenses for logged-in user
const fetchExpenses = async () => {
  const userDocId = await getUserDocId();
  if (!userDocId) return;

  const expensesRef = collection(db, "users", userDocId, "expenses");
  const querySnapshot = await getDocs(expensesRef);

  expenses.value = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  generateAvailableMonths();
  updateCharts();
};

//get total expenses
const totalExpenses = computed(() => {
  return Object.values(categoryTotals.value).reduce((sum, val) => sum + val, 0);
});

// Generate available months from expenses
const generateAvailableMonths = () => {
  const uniqueMonths = new Set();
  expenses.value.forEach(expense => {
    if (expense.date) {
      const date = new Date(expense.date);
      const month = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      uniqueMonths.add(month);
    }
  });

  availableMonths.value = Array.from(uniqueMonths).sort((a, b) => new Date(`01/${b}`) - new Date(`01/${a}`));
  if (availableMonths.value.length > 0) {
    selectedMonth.value = availableMonths.value[0]; // Default to latest month
  }
};

const totalBudget = ref(0);

const fetchTotalBudget = async () => {
  const userDocId = await getUserDocId();
  if (!userDocId) return;

  const goalsRef = collection(db, "users", userDocId, "spendingGoals");
  const querySnapshot = await getDocs(goalsRef);

  let sum = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.goal) {
      sum += data.goal;
    }
  });

  totalBudget.value = sum;
  updateBudgetPieChart();
};

// Update Pie Chart & Line Chart
const updateCharts = () => {
  if (!selectedMonth.value) return;

  // Filter expenses for the selected month
  const filteredExpenses = expenses.value.filter(expense => {
    const date = new Date(expense.date);
    const expenseMonth = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    return expenseMonth === selectedMonth.value;
  });

  // Aggregate spending by category (for Pie Chart & Table)
  const categoryData = {};
  filteredExpenses.forEach(expense => {
    if (!categoryData[expense.category]) {
      categoryData[expense.category] = 0;
    }
    categoryData[expense.category] += expense.cost;
  });

  pieChartData.value = Object.entries(categoryData);
  categoryTotals.value = categoryData;

  // Aggregate spending by day (for Line Chart)
  const dailyData = {};
  filteredExpenses.forEach(expense => {
    const day = new Date(expense.date).getDate();
    dailyData[day] = (dailyData[day] || 0) + expense.cost;
  });

  lineChartData.value = Object.entries(dailyData).map(([day, amount]) => [`${selectedMonth.value.split("/")[1]}-${selectedMonth.value.split("/")[0]}-${day}`, amount]).sort((a, b) => new Date(a[0]) - new Date(b[0]));

  updateBudgetPieChart();
};

//for the budget pie chart
const updateBudgetPieChart = () => {
  if (totalBudget.value === 0) return; // Avoid division by zero

  const spent = totalExpenses.value;
  const remaining = Math.max(totalBudget.value - spent, 0); // Ensure non-negative

  budgetPieChartData.value = [
    ["Spent", spent, "#f44336"], 
    ["Remaining Budget", remaining, "#4caf50"]
  ];
};

const getTotalClients = async () => {
  if (userProfile.value.role === "FA") {
    const user = auth.currentUser;
    const clientsRef = collection(db, "users", user.uid, "clients");
    const querySnapshot = await getDocs(clientsRef);
    return querySnapshot.size;
  }
  return 0;
};

const searchQuery = ref("");
const searchResults = ref([]);
const selectedClient = ref(null);
const clients = ref([]); // To store the list of clients associated with the FA
const currentFAId = ref("");
const currentFAUsername = ref("");
const currentFAEmail = ref("");


const searchClients = async () => {
    if (searchQuery.value.trim() === "") {
        searchResults.value = []; // Clear results if search query is empty
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "User"));
        const querySnapshot = await getDocs(q);

        // Filter clients whose username starts with the search query
        searchResults.value = querySnapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((client) =>
                client.username.toLowerCase().startsWith(searchQuery.value.toLowerCase())
            );
    } catch (error) {
        console.error("Error fetching clients:", error);
    }
};

// Fetch clients associated with the current FA
const fetchClients = async () => {
    try {
        const clientsRef = collection(db, "users", currentFAId.value, "clients");
        const querySnapshot = await getDocs(clientsRef);

        clients.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching clients:", error);
    }
};

// View client details in a modal
const viewClient = (client) => {
    selectedClient.value = client;
};

// Close the modal
const closeModal = () => {
    selectedClient.value = null;
};

onMounted(async () => {
  await fetchExpenses();
  await fetchTotalBudget();
  totalClients.value = await getTotalClients();
});
</script>

<style scoped>
/* Set background color */
body, html {
  background-color: rgb(251, 248, 243);
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  height: 100%;
}

/* Container styling */
.container {
  max-width: 800px;
  margin: auto;
  text-align: center;
  padding: 20px;
  background-color: rgb(251, 248, 243);
}
.find-client-container {
    max-width: 800px;
    margin: auto;
    padding: 20px;
    text-align: center;
}

/* Table styling */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  background: white;
  border-radius: 10px;
  overflow: hidden;
}

th, td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.total-row {
  background-color: #f0f0f0; /* Light grey */
  font-weight: bold;
}

th {
  background-color: #e0e0e0;
  font-weight: bold;
}
th {
  width: 50%; /* Adjust the width of the first column */
}

td {
  width: 50%; /* Adjust the width of the second column */
}
/* Dropdown styling */
select {
  margin-bottom: 15px;
  padding: 8px;
  font-size: 14px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

/* Chart section styling */
h3 {
  margin-top: 20px;
  color: #333;
}

/* Centering the dropdown */
label {
  font-weight: bold;
  margin-right: 10px;
}

/* Flexbox container for charts */
.charts-container {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
}

.chart {
  flex: 1;
  min-width: 300px;
  margin: 10px;
}
</style>