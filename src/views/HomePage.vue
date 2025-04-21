<template>
  <div>
    <Navbar />
    <div class="container">
      <div v-if="userProfile.role === 'FA'"><h2>Client Analytics</h2></div>
      <div v-else><h2>Expense Analytics</h2></div>

      <div v-if="userProfile.role === 'FA'">
        <p>Total Clients: {{ totalClients }}</p>
        <h2>My Clients</h2>
        <ul>
          <li v-for="client in clients" :key="client.id">
            {{ client.username }}
            <button @click="viewClient(client)">View</button>
          </li>
        </ul>
        <div class="find-client-container">
          <!-- Modal for viewing client details -->
          <div v-if="selectedClient" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
              <h3>Client Details</h3>
              <p><strong>Username:</strong> {{ selectedClient.username }}</p>
              <p><strong>Email:</strong> {{ selectedClient.email }}</p>
              <p><strong>Savings Target:</strong> {{ selectedClient.savingTarget }}</p>
              <p><strong>Gender:</strong> {{ selectedClient.gender }}</p>
              <p><strong>Age:</strong> {{ selectedClient.age }}</p>
              <p><strong>Meeting Target:</strong> {{ selectedClient.isMeetingTarget }}</p>
              <button @click="closeModal">Close</button>
            </div>
          </div>
        </div> <!-- Closing find-client-container -->
        <div class="charts-container">
          <!-- Pie Chart: Total Spent vs. Total Budget -->
          <div class="chart">
            <h3>Clients Meeting Target</h3>
            <pie-chart :data="clientTargetPieChartData" :download="true" :colors="['#008000', '#ff0000']"/>
          </div>
          <!-- Table: Clients Not Meeting Targets -->
          <div class="not-meeting-table">
            <h3>Clients Not Meeting Their Target</h3>
            <table v-if="clientsNotMeetingTarget.length">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="client in clientsNotMeetingTarget" :key="client.id">
                  <td>{{ client.username }}</td>
                  <td>{{ client.email }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else>No clients are currently below their targets 🎉</p>
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

        <p v-if="totalExpenses > totalBudget" style="color: red; font-weight: bold; margin-top: 10px;">
          ⚠️ You have exceeded your budget for this month!
        </p>
        
        <h1> Total budget: {{ totalBudget }}</h1> <br>

          <!-- Pie Chart: Total Spent vs. Total Budget -->
          <div class="chart">
            <h3>Budget Usage</h3>
            <pie-chart :data="budgetPieChartData" :download="true" :colors="['#ff0000','#008000']"/>
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

        <!-- Pie Chart: Spending by Category -->
        <div class="chart">
            <h3>Spending by Category</h3>
            <pie-chart :data="pieChartData" :download="true" />
          </div>

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
          </tbody>
        </table>

        <!-- Line Chart: Spending Over Days of the Month -->
        <div class="chart">
          <h3>Spending Over Days of the Month</h3>
          <line-chart :data="lineChartData" :download="true" />
        </div>
      </div> <!-- Closing v-else -->
    </div> <!-- Closing container -->
  </div> <!-- Closing root div -->
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const expenses = ref([]);
const selectedMonth = ref(""); // Format: "MM/YYYY"
const availableMonths = ref([]); // List of available months for selection
const clientTargetPieChartData = ref([]); // Data for spending targets pie chart

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
  const isMeetingTarget = spent <= totalBudget.value;
  updateDoc(doc(db, "users", userProfile.value.uid), {
    isMeetingTarget: isMeetingTarget,
  });

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

const selectedClient = ref(null);
const clients = ref([]); // To store the list of clients associated with the FA

const clientsNotMeetingTarget = computed(() => {
  return clients.value.filter(client => !client.isMeetingTarget);
});

const fetchClients = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user found.");
    return;
  }

  try {
    const clientsRef = collection(db, "users", user.uid, "clients");
    const querySnapshot = await getDocs(clientsRef);

    const fetchedClients = [];

    for (const docSnap of querySnapshot.docs) {
      const clientMeta = docSnap.data();
      const clientId = docSnap.id;

      const clientDocRef = doc(db, "users", clientId);
      const clientDoc = await getDoc(clientDocRef);

      if (clientDoc.exists()) {
        const fullClientData = clientDoc.data();
        fetchedClients.push({
          id: clientId,
          username: fullClientData.username,
          email: fullClientData.email,
          isMeetingTarget: fullClientData.isMeetingTarget,
          ...fullClientData
        });
      }
    }

    clients.value = fetchedClients;
  } catch (error) {
    console.error("Error fetching clients:", error);
  }

  updateClientTargetPieChartData();
};



// View client details in a modal by polling Firestore
const viewClient = async (client) => {
  try {
    const clientDocRef = doc(db, "users", client.id); // Reference to the client's user document
    const clientDoc = await getDoc(clientDocRef); // Fetch the document from Firestore

    if (clientDoc.exists()) {
      selectedClient.value = { id: client.id, ...clientDoc.data() }; // Update selectedClient with the latest data
    } else {
      console.error("Client document does not exist.");
    }
  } catch (error) {
    console.error("Error fetching client document:", error);
  }
};

// Close the modal
const closeModal = () => {
    selectedClient.value = null;
};

const updateClientTargetPieChartData = async () => {
  let meetingTargets = 0;
  const totalClients = clients.value.length;

  for (const client of clients.value) {
    try {
      // Fetch the latest client document from Firestore
      const clientDocRef = doc(db, "users", client.id);
      const clientDoc = await getDoc(clientDocRef);

      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        if (clientData.isMeetingTarget) {
          meetingTargets++;
        }
      } else {
        console.warn(`Client document does not exist for ID: ${client.id}`);
      }
    } catch (error) {
      console.error(`Error polling client document for ID: ${client.id}`, error);
    }
  }

  const notMeeting = totalClients - meetingTargets;

  // Update the pie chart data
  clientTargetPieChartData.value = [
    ["Meeting", meetingTargets, "#f44336"], // Green for meeting targets
    ["Not Meeting", notMeeting, "#4caf50"], // Red for not meeting targets
  ];
};

onMounted(async () => {
  await fetchExpenses();
  await fetchTotalBudget();
  totalClients.value = await getTotalClients();
  await fetchClients();
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
ul {
  list-style-type: none;
  padding: 0;
  margin: 1rem 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
  transition: background-color 0.3s ease;
}

li:hover {
  background-color: #eef2f7;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #0056b3;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* semi-transparent dark background */
  backdrop-filter: blur(4px); /* subtle blur for glassmorphism */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.3s ease-out;
}

.modal h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.4rem;
  color: #333;
}

.modal p {
  margin: 0.5rem 0;
  font-size: 1rem;
  color: #555;
}

.modal button {
  margin-top: 1.5rem;
  padding: 10px 18px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.modal button:hover {
  background-color: #c82333;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


</style>