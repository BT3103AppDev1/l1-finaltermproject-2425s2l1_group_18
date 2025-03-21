<template>
    <div>
        <Navbar />
        <div class="container">
            <div class="header">
                <h2>All Expenses</h2>
                <img src="@/assets/finbonacci_logo.png" alt="Logo" class="logo-image" />
        </div>
            
            <div class="filter-buttons-container">
                <!-- Month & Year Filter -->
                    <select v-model="filterMonth" class="filter-button">
                        <option value="">All Months</option>
                        <option v-for="m in 12" :key="m" :value="m.toString().padStart(2, '0')">
                            {{ new Date(0, m - 1).toLocaleString('default', { month: 'long' }) }}
                        </option>
                    </select>

                    <select v-model="filterYear" class="filter-button">
                        <option value="">All Years</option>
                        <option v-for="year in availableYears" :key="year" :value="year">
                            {{ year }}
                        </option>
                    </select>

                <!-- Sort Dropdown -->
                <select v-model="sortBy" class="filter-button">
                    <option value="costAsc">Cost Asc</option>
                    <option value="costDesc">Cost Desc</option>
                    <option value="dateAsc">Date Asc</option>
                    <option value="dateDesc">Date Desc</option>
                    <option value="alphaAsc">Alphabetical Asc</option>
                    <option value="alphaDesc">Alphabetical Desc</option>
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                </select>
            </div>

            <!-- Expenses Table -->
            <table class="expenses-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Cost</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th class="actions-column">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="expense in sortedExpenses" :key="expense.id" :class="{'recurring': expense.type === 'Recurring', 'one-time': expense.type === 'One Time'}">
                        <td>{{ expense.title }}</td>
                        <td>${{ expense.cost.toFixed(2) }}</td>
                        <td>{{ expense.date }}</td>
                        <td>
                            <span :class="['category-badge', expense.category.toLowerCase().replace(/\s+/g, '-')]" >
                                {{ expense.category }}
                            </span>
                        </td>
                        <td>{{ expense.type }}</td>
                        <td>
                            <button class="view-edit-button" @click="editExpense(expense)">View & Edit</button>
                            <button class="delete-button" @click="deleteExpense(expense.id)">Remove</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Add Expense Button Container -->
            <div class="add-expense-container">
                <button class="add-expense-btn" @click="openAddExpenseModal">Add Expense</button>
            </div>
        </div>

        <!-- Add / Edit Expense Modal -->
        <div v-if="showAddExpenseModal" class="modal">
            <div class="modal-content">
                <h3>{{ isEditing ? 'Edit Expense' : 'New Expense' }}</h3>

                <input v-model="newExpense.title" placeholder="Title" />
                <input v-model.number="newExpense.cost" type="number" placeholder="Cost" />
                <input v-model="newExpense.date" type="date" />
                <select v-model="newExpense.category">
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Others">Others</option>
                </select>
                <select v-model="newExpense.type">
                    <option value="One Time">One Time</option>
                    <option value="Recurring">Recurring</option>
                </select>
                <input v-model="newExpense.merchant" placeholder="Merchant" />

                <div class="modal-button-group">
                    <button @click="isEditing ? updateExpense() : saveExpense()">
                        {{ isEditing ? 'Update Expense' : 'Save Expense' }}
                    </button>
                    <button @click="showAddExpenseModal = false" class="cancel-button">Cancel</button>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getFirestore, collection, query, where, getDocs, doc, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const expenses = ref([]);
const sortBy = ref("dateDesc");
const showAddExpenseModal = ref(false);
const isEditing = ref(false);
const editingExpenseId = ref(null);

const filterMonth = ref("");
const filterYear = ref("");

const newExpense = ref({
    title: "",
    cost: 0,
    date: "",
    category: "Food",
    type: "One Time",
    merchant: "",
});

const openAddExpenseModal = () => {
    newExpense.value = {
        title: "",
        cost: "",
        date: "",
        category: "Food",
        type: "One Time",
        merchant: "",
    };
    isEditing.value = false;
    showAddExpenseModal.value = true;
};

// Find the Correct User Document
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

// Fetch Expenses for Logged-in User
const fetchExpenses = async () => {
    const userDocId = await getUserDocId();
    if (!userDocId) return;

    const expensesRef = collection(db, "users", userDocId, "expenses");
    const querySnapshot = await getDocs(expensesRef);
    
    expenses.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Save New Expense
const saveExpense = async () => {
    const userDocId = await getUserDocId();
    if (!userDocId) return;

    const expensesRef = collection(db, "users", userDocId, "expenses");
    await addDoc(expensesRef, newExpense.value);

    showAddExpenseModal.value = false;
    fetchExpenses();
};

// Edit Expense - Load Data into Form
const editExpense = (expense) => {
    newExpense.value = { ...expense }; // Copies values properly
    isEditing.value = true;
    editingExpenseId.value = expense.id;
    showAddExpenseModal.value = true;
};

// Update Expense
const updateExpense = async () => {
    const userDocId = await getUserDocId();
    if (!userDocId || !editingExpenseId.value) return;

    const expenseRef = doc(db, "users", userDocId, "expenses", editingExpenseId.value);
    await updateDoc(expenseRef, newExpense.value);

    showAddExpenseModal.value = false;
    isEditing.value = false;
    editingExpenseId.value = null;
    fetchExpenses();
};

// Delete Expense
const deleteExpense = async (id) => {
    const userDocId = await getUserDocId();
    if (!userDocId) return;

    const expenseRef = doc(db, "users", userDocId, "expenses", id);
    await deleteDoc(expenseRef);
    fetchExpenses();
};

// Filter Expenses by MM/YYYY
const filteredExpenses = computed(() => {
    return expenses.value.filter(expense => {
        const expenseDate = new Date(expense.date);
        const monthMatches = !filterMonth.value || (expenseDate.getMonth() + 1).toString().padStart(2, "0") === filterMonth.value;
        const yearMatches = !filterYear.value || expenseDate.getFullYear().toString() === filterYear.value;
        return monthMatches && yearMatches;
    });
});

// Sort Expenses
const sortedExpenses = computed(() => {
    let sorted = [...filteredExpenses.value];
    switch (sortBy.value) {
        case "costAsc": return sorted.sort((a, b) => a.cost - b.cost);
        case "costDesc": return sorted.sort((a, b) => b.cost - a.cost);
        case "dateAsc": return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        case "dateDesc": return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        case "alphaAsc": return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case "alphaDesc": return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case "category": return sorted.sort((a, b) => a.category.localeCompare(b.category));
        case "type": return sorted.sort((a, b) => a.type.localeCompare(b.type));
        default: return sorted;
    }
});

// Get Available Years
const availableYears = computed(() => {
    return Array.from(new Set(expenses.value.map(exp => new Date(exp.date).getFullYear().toString()))).sort((a, b) => b - a);
});

onMounted(fetchExpenses);
</script>

<style scoped>
/* General page styling */
body, html {
    background-color: rgb(251, 248, 243);
    margin: 0;
    padding: 0;
    font-family: "Georgia", serif;
    height: 100%;
}

h2 {
    font-family: "Georgia", serif;
    font-weight: normal;
    text-align: center;
}
.view-edit-button, .delete-button {
    font-family: "Georgia", serif;
}

/* General container styling */
.container {
    width: 100%;
    height: 100vh;
    padding: 20px;
    box-sizing: border-box;
    background-color: rgb(251, 248, 243);
}

.header {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin-top: 30px;
    margin-bottom: 60px; /* Add margin to separate from the table */
}

.header h2 {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

.logo-image {
    position: absolute;
    right: 0;
    max-width: 170px; 
    height: auto;
    top: -63px; 
}

/* Table styling */
table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0 1px;
    background: black;
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid black;
}

th, td {
    padding: 9px;
    text-align: left;
    border-bottom: 1px solid black;
}

th {
    background: rgb(251, 248, 243);
    font-weight: bold;
}

/* Recurring Expenses Row Color */
tr.recurring {
    background-color: #ffebc3; /* Light Orange */
}

/* One-Time Expenses Row Color */
tr.one-time {
    background-color: #c3ffc3; /* Lime Green */
}

.category-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    color: black;
    text-align: center;
    min-width: 80px;
}

.category-badge.food { background-color: #ffd089; }       
.category-badge.transport { background-color: #9ad1ff; }  
.category-badge.shopping { background-color: #ffb9d0; }   
.category-badge.utilities { background-color: #d6beff; }  
.category-badge.groceries { background-color: #83da87; }  
.category-badge.others { background-color: #ffdd6e; }     

/* Button styling */
button {
    padding: 8px 14px;
    border: 0.4px black solid;
    border-radius: 35px;
    cursor: pointer;
    font-size: 12px;
}

button:hover {
    opacity: 0.8;
}

/* Edit and Remove Buttons */
button:nth-child(1) {
    background: #a8eaf8;
    color: black;
}

button:nth-child(2) {
    background: #f97f8a;
    color: black;
}

/* Centering the Add Expense Button */
.add-expense-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

/* Add Expense Button */
.add-expense-btn {
    background: #a8eaf8;
    color: white;
    padding: 10px 15px;
    font-size: 13px;
    border: 0.5px solid black;
    border-radius: 35px;
    cursor: pointer;
    font-family: "Georgia", serif;
}

.add-expense-btn:hover {
    background: #e2c5ff;
}

.filter-buttons-container {
    display: flex;
    justify-content: flex-start; 
    gap: 2px; 
    margin-bottom: 8px;  
    background-color: rgb(251, 248, 243);
}

.filter-button {
    padding: 3px 3px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 10px;
    background-color: rgb(251, 248, 243);
}

/* Dropdown styling */
select {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 14px;
    background: white;
}

.expenses-table .actions-column {
    padding-left: 50px; /* Adjust this value to move the column to the right */
}


/* Modal Styling */
.modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    width: 400px;
}

.modal-content input, .modal-content select {
    width: 100%;
    padding: 8px 12px;
    margin: 10px 0;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
}
.modal-content {
    text-align: center;
}

.modal-content button {
    padding: 6px 8px;
    font-size: 12px;
    border-radius: 25px;
    margin-top: 10px;
    margin-right: 8px;
}

.modal-button-group {
    display: flex;
    flex-direction: column;
    gap: 4px; /* space between Save and Cancel buttons */
    margin-top: 10px;
    align-items: center;
}

.modal-button-group button {
    padding: 6px 8px;
    font-size: 11px;
    border-radius: 25px;
    width: 30%;
    background-color: #e5e4e4;
}

.modal-button-group .cancel-button {
    background-color: #f8dcdc;
    color: black;
}


/* Dropdown alignment */
.sort-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}
</style>
