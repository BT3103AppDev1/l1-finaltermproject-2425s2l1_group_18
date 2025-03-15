<template>
    <div>
        <Navbar />
        <div class="container">
            <h1>Expense Summary - {{ currentMonthYear }}</h1>

            <!-- Pie Chart for Spending Breakdown by Category -->
            <h2>Spending by Category</h2>
            <PieChart v-if="categoryData.length" :data="categoryData" :donut="true" />
            <p v-else>No data available for this month.</p>

            <!-- Table for Spending Breakdown -->
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total Spending ($)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(amount, category) in categoryData" :key="category">
                        <td>{{ category }}</td>
                        <td>${{ amount.toFixed(2) }}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Line Chart for Daily Spending -->
            <h2>Daily Spending Trend</h2>
            <LineChart v-if="dailyData.length" :data="dailyData" />
            <p v-else>No daily expenses recorded.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { PieChart, LineChart } from "vue-chartkick"; // Import components
import "chartkick/chart.js";
import Navbar from "../components/TheNavbar.vue";

// Firestore instance
const db = getFirestore();
const auth = getAuth();

// State variables
const currentMonthYear = ref("");
const categoryData = ref([]);
const dailyData = ref([]);

// Get current month and year
const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleString("default", { month: "long", year: "numeric" });
};

// Fetch Expenses
const fetchExpenses = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const now = new Date();
    const selectedMonth = now.getMonth() + 1; // JS months are 0-indexed
    const selectedYear = now.getFullYear();

    const userDocId = user.uid;
    const expensesRef = collection(db, "users", userDocId, "expenses");

    // Fetch all expenses and filter in JavaScript
    const querySnapshot = await getDocs(expensesRef);

    const categoryTotals = {};
    const dailyTotals = {};

    querySnapshot.forEach((doc) => {
        const expense = doc.data();
        const { category, cost, date } = expense;

        const expenseDate = new Date(date);
        const expenseMonth = expenseDate.getMonth() + 1;
        const expenseYear = expenseDate.getFullYear();
        const day = expenseDate.getDate();

        if (expenseMonth === selectedMonth && expenseYear === selectedYear) {
            // Aggregate category spending
            categoryTotals[category] = (categoryTotals[category] || 0) + cost;

            // Aggregate daily spending
            dailyTotals[day] = (dailyTotals[day] || 0) + cost;
        }
    });

    categoryData.value = Object.entries(categoryTotals).map(([key, value]) => [key, value]);
    dailyData.value = Object.entries(dailyTotals)
        .map(([day, amount]) => [parseInt(day), amount])
        .sort((a, b) => a[0] - b[0]); // Ensure chronological order
};

onMounted(() => {
    currentMonthYear.value = getCurrentMonthYear();
    fetchExpenses();
});
</script>

<style scoped>
.container {
    text-align: center;
    padding: 20px;
    background-color: bisque;
    min-height: 100vh;
}

/* Table Styling */
table {
    width: 100%;
    margin-top: 20px;
    border-collapse: collapse;
    background: white;
    border-radius: 10px;
    overflow: hidden;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background: #e0e0e0;
    font-weight: bold;
}

tr:nth-child(even) {
    background: #f2f2f2;
}
</style>
