<template>
    <div>
      <Navbar />
      <div class="container">
        <h2>Expense Analytics</h2>
  
        <!-- Month Selector -->
        <label>Select Month:</label>
        <select v-model="selectedMonth" @change="updateCharts">
          <option v-for="month in availableMonths" :key="month" :value="month">
            {{ month }}
          </option>
        </select>
        
        <h1> Total budget: {{totalBudget }}</h1> <br>

        <!-- Pie Chart: Total Spent vs. Total Budget -->
        <h3>Budget Usage</h3>
        <pie-chart :data="budgetPieChartData" :download="true" :colors="['#ff0000','#008000']"/>
        <br>
        <!-- Pie Chart: Spending by Category -->
        <h3>Spending by Category</h3>
        <pie-chart :data="pieChartData" :download="true" />
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
  
  // Get the current user document ID
  const getUserDocId = async () => {
    const user = auth.currentUser;
    if (!user) return null;
  
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);
  
    return !querySnapshot.empty ? querySnapshot.docs[0].id : null;
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
  
  
  onMounted(async () => {
  await fetchExpenses();
  await fetchTotalBudget();
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
    text-align: center;
  }

  .total-row {
  background-color: #f0f0f0; /* Light grey */
  font-weight: bold;
  }
  
  th {
    background-color: #e0e0e0;
    font-weight: bold;
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
  </style>
  