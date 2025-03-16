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
  
        <!-- Pie Chart: Spending by Category -->
        <h3>Spending by Category</h3>
        <pie-chart :data="pieChartData" :download="true" />
  
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
  };
  
  onMounted(fetchExpenses);
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
  