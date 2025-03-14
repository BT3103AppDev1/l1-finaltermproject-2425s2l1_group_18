<template>
    <div>
        <Navbar />
        <div class="container">
            <h2>All Expenses</h2>

            <!-- Sort Dropdown -->
            <select v-model="sortBy" @change="sortExpenses">
                <option value="costAsc">Cost Asc</option>
                <option value="costDesc">Cost Desc</option>
                <option value="dateAsc">Date Asc</option>
                <option value="dateDesc">Date Desc</option>
                <option value="alphaAsc">Alphabetical Asc</option>
                <option value="alphaDesc">Alphabetical Desc</option>
                <option value="category">Category</option>
            </select>

            <!-- Expenses Table -->
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Cost</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="expense in sortedExpenses" :key="expense.id">
                        <td>{{ expense.title }}</td>
                        <td>${{ expense.cost.toFixed(2) }}</td>
                        <td>{{ expense.date }}</td>
                        <td>{{ expense.category }}</td>
                        <td>{{ expense.type }}</td>
                        <td>
                            <button @click="editExpense(expense)">View & Edit</button>
                            <button @click="deleteExpense(expense.id)">Remove</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <button @click="showAddExpenseModal = true">Add Expense</button>
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

                <button @click="isEditing ? updateExpense() : saveExpense()">
                    {{ isEditing ? 'Update Expense' : 'Save Expense' }}
                </button>
                <button @click="showAddExpenseModal = false">Cancel</button>
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

const newExpense = ref({
    title: "",
    cost: 0,
    date: "",
    category: "Food",
    type: "One Time",
    merchant: "",
});

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
    isEditing.value = true;
    editingExpenseId.value = expense.id;
    newExpense.value = { ...expense };
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

// Sort Expenses
const sortedExpenses = computed(() => {
    let sorted = [...expenses.value];
    switch (sortBy.value) {
        case "costAsc": return sorted.sort((a, b) => a.cost - b.cost);
        case "costDesc": return sorted.sort((a, b) => b.cost - a.cost);
        case "dateAsc": return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        case "dateDesc": return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        case "alphaAsc": return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case "alphaDesc": return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case "category": return sorted.sort((a, b) => a.category.localeCompare(b.category));
        default: return sorted;
    }
});

onMounted(fetchExpenses);
</script>

<style scoped>
/* General page styling */
body, html {
    background-color: bisque;
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    height: 100%;
}

/* General container styling */
.container {
    width: 100%;
    height: 100vh;
    padding: 20px;
    box-sizing: border-box;
    background-color: bisque;
}

/* Table styling */
table {
    width: 100%;
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

/* Button styling */
button {
    padding: 8px 14px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
}

button:hover {
    opacity: 0.8;
}

/* Edit and Remove Buttons */
button:nth-child(1) {
    background: #2a9d8f;
    color: white;
}

button:nth-child(2) {
    background: #e63946;
    color: white;
}

/* Add Expense Button */
.add-expense-btn {
    display: block;
    margin: 20px auto;
    background: #264653;
    color: white;
    padding: 10px 20px;
    font-size: 16px;
}

/* Dropdown styling */
select {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 14px;
    background: white;
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
    padding: 8px;
    margin: 10px 0;
    border: 1px solid #ccc;
    border-radius: 5px;
}

/* Dropdown alignment */
.sort-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}
</style>
