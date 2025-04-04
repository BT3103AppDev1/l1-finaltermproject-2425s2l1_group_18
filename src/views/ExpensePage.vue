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
                        <th>Merchant</th>
                        <th>Cost</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th class="actions-column">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="expense in sortedExpenses"
                        :key="expense.id"
                        :class="{ recurring: expense.type === 'Recurring', 'one-time': expense.type === 'One Time' }"
                    >
                        <td>{{ expense.title }}</td>
                        <td>{{ expense.merchant }}</td>
                        <td>${{ expense.cost.toFixed(2) }}</td>
                        <td>{{ expense.date }}</td>
                        <td>
                            <span
                                :class="['category-badge', expense.category.toLowerCase().replace(/\s+/g, '-')]"
                            >
                                {{ expense.category }}
                            </span>
                        </td>
                        <td>{{ expense.type }}</td>
                        <td>
                            <button class="view-edit-button" @click="editExpense(expense)">View & Edit</button>
                            <button
                                class="delete-button"
                                @click="openDeleteModal(expense.id, expense.isRecurring)"
                            >
                                Remove
                            </button>
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
            <div class="modal-content smaller-modal">
                <h3 class="modal-title">{{ isEditing ? 'Edit Expense' : 'New Expense' }}</h3>

                <label for="title">Title</label>
                <input id="title" v-model="newExpense.title" placeholder="Title" />

                <label for="merchant">Merchant</label>
                <input id="merchant" v-model="newExpense.merchant" placeholder="Merchant" />

                <label for="cost">Cost</label>
                <input id="cost" v-model.number="newExpense.cost" type="number" placeholder="Cost" />

                <label for="date">Date</label>
                <input id="date" v-model="newExpense.date" type="date" />

                <label for="category">Category</label>
                <select id="category" v-model="newExpense.category">
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Others">Others</option>
                </select>

                <label for="type">Type</label>
                <select id="type" v-model="newExpense.type">
                    <option value="One Time">One Time</option>
                    <option value="Recurring">Recurring</option>
                </select>

                <!-- Recurrence Options -->
                <div v-if="newExpense.type === 'Recurring'">
                    <label for="recurrenceFrequency">Recurrence Frequency</label>
                    <select id="recurrenceFrequency" v-model="newExpense.recurrenceFrequency">
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>

                    <label for="recurrenceEndDate">Recurrence End Date</label>
                    <input id="recurrenceEndDate" v-model="newExpense.recurrenceEndDate" type="date" placeholder="Recurrence End Date" />
                </div>

                <div class="modal-button-group">
                    <button @click="isEditing ? updateExpense() : saveExpense()">
                        {{ isEditing ? 'Update Expense' : 'Save Expense' }}
                    </button>
                    <button @click="showAddExpenseModal = false" class="cancel-button">Cancel</button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="modal-overlay">
            <div class="modal smaller-modal">
                <h3 class="modal-title">Are you sure you want to delete?</h3>
                <div class="button-group">
                    <!-- If the expense is recurring, show all three buttons -->
                    <div v-if="deleteExpenseDetails.isRecurring">
                        <button @click="handleDelete('all')">Delete All</button>
                        <button @click="handleDelete('this')">Delete This Only</button>
                        <button @click="showDeleteModal = false" class="cancel-button">Cancel</button>
                    </div>
                    <!-- If the expense is one-time, show only Delete and Cancel buttons -->
                    <div v-else>
                        <button @click="handleDelete('this')">Delete</button>
                        <button @click="showDeleteModal = false" class="cancel-button">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "../components/TheNavbar.vue";

const db = getFirestore();
const auth = getAuth();

const expenses = ref([]);
const sortBy = ref("dateDesc");
const showAddExpenseModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const editingExpenseId = ref(null);
const deleteExpenseDetails = ref({ id: null, isRecurring: false });

const filterMonth = ref("");
const filterYear = ref("");

const newExpense = ref({
    title: "",
    cost: 0,
    date: "",
    category: "Food",
    type: "One Time",
    recurrenceFrequency: "",
    recurrenceEndDate: "",
});

const openAddExpenseModal = () => {
    newExpense.value = {
        title: "",
        cost: "",
        date: "",
        category: "Food",
        type: "One Time",
        recurrenceFrequency: "",
        recurrenceEndDate: "",
    };
    isEditing.value = false;
    showAddExpenseModal.value = true;
};

const openDeleteModal = (id, isRecurring) => {
    deleteExpenseDetails.value = { id, isRecurring };
    showDeleteModal.value = true;
};

const handleDelete = async (action) => {
    const { id, isRecurring } = deleteExpenseDetails.value;
    const userDocId = await getUserDocId();
    if (!userDocId) return;

    if (isRecurring) {
        if (action === "all") {
            try {
                const expensesRef = collection(db, "users", userDocId, "expenses");
                const q = query(expensesRef, where("title", "==", expenses.value.find((e) => e.id === id).title));
                const querySnapshot = await getDocs(q);

                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                alert("All occurrences of the recurring expense have been deleted.");
            } catch (error) {
                console.error("Error deleting all occurrences of recurring expense:", error);
                alert("Failed to delete all occurrences. Please try again.");
            }
        } else if (action === "this") {
            try {
                const expenseRef = doc(db, "users", userDocId, "expenses", id);
                await deleteDoc(expenseRef);

                alert("The specific occurrence has been deleted.");
            } catch (error) {
                console.error("Error deleting specific occurrence of recurring expense:", error);
                alert("Failed to delete the specific occurrence. Please try again.");
            }
        }
    } else {
        try {
            const expenseRef = doc(db, "users", userDocId, "expenses", id);
            await deleteDoc(expenseRef);

            alert("The one-time expense has been deleted.");
        } catch (error) {
            console.error("Error deleting one-time expense:", error);
            alert("Failed to delete the expense. Please try again.");
        }
    }

    showDeleteModal.value = false;
    fetchExpenses();
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

    expenses.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Save New Expense
const saveExpense = async () => {
    const userDocId = await getUserDocId();
    if (!userDocId) {
        alert("Failed to retrieve user document ID.");
        return;
    }

    const expensesRef = collection(db, "users", userDocId, "expenses");

    if (newExpense.value.type === "Recurring" && newExpense.value.recurrenceFrequency && newExpense.value.recurrenceEndDate) {
        const startDate = new Date(newExpense.value.date);
        const endDate = new Date(newExpense.value.recurrenceEndDate);

        if (isNaN(startDate) || isNaN(endDate)) {
            alert("Invalid start or end date. Please check your input.");
            return;
        }

        const occurrences = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            occurrences.push({
                ...newExpense.value,
                date: currentDate.toISOString().split("T")[0],
                isRecurring: true,
            });

            if (newExpense.value.recurrenceFrequency === "weekly") {
                currentDate.setDate(currentDate.getDate() + 7);
            } else if (newExpense.value.recurrenceFrequency === "monthly") {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else if (newExpense.value.recurrenceFrequency === "yearly") {
                currentDate.setFullYear(currentDate.getFullYear() + 1);
            }
        }

        try {
            const batch = writeBatch(db);
            occurrences.forEach((occurrence) => {
                const docRef = doc(expensesRef);
                batch.set(docRef, occurrence);
            });
            await batch.commit();

            alert("Recurring expenses added successfully!");
        } catch (error) {
            console.error("Error adding recurring expenses:", error);
            alert("Failed to add recurring expenses. Please try again.");
        }
    } else {
        try {
            await addDoc(expensesRef, newExpense.value);
            alert("Expense added successfully!");
        } catch (error) {
            console.error("Error adding expense:", error);
            alert("Failed to add expense. Please try again.");
        }
    }

    showAddExpenseModal.value = false;
    fetchExpenses();
};

// Edit Expense
const editExpense = (expense) => {
    newExpense.value = { ...expense };
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
const deleteExpense = async (id, isRecurring = false) => {
    const userDocId = await getUserDocId();
    if (!userDocId) return;

    if (isRecurring) {
        // Show a confirmation dialog for recurring expenses
        const deleteOption = confirm("Do you want to delete all occurrences of this recurring expense? Click 'OK' for all, 'Cancel' for just this one.");
        if (deleteOption) {
            // Delete all occurrences of the recurring expense
            try {
                const expensesRef = collection(db, "users", userDocId, "expenses");
                const q = query(expensesRef, where("title", "==", expenses.value.find((e) => e.id === id).title));
                const querySnapshot = await getDocs(q);

                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                alert("All occurrences of the recurring expense have been deleted.");
            } catch (error) {
                console.error("Error deleting all occurrences of recurring expense:", error);
                alert("Failed to delete all occurrences. Please try again.");
            }
        } else {
            // Delete only the specific occurrence
            try {
                const expenseRef = doc(db, "users", userDocId, "expenses", id);
                await deleteDoc(expenseRef);

                alert("The specific occurrence has been deleted.");
            } catch (error) {
                console.error("Error deleting specific occurrence of recurring expense:", error);
                alert("Failed to delete the specific occurrence. Please try again.");
            }
        }
    } else {
        // Delete one-time expense directly
        try {
            const expenseRef = doc(db, "users", userDocId, "expenses", id);
            await deleteDoc(expenseRef);

            alert("The one-time expense has been deleted.");
        } catch (error) {
            console.error("Error deleting one-time expense:", error);
            alert("Failed to delete the expense. Please try again.");
        }
    }

    fetchExpenses(); // Refresh the expenses list
};

// Filter Expenses by MM/YYYY
const filteredExpenses = computed(() => {
    return expenses.value.filter((expense) => {
        const expenseDate = new Date(expense.date);
        const monthMatches =
            !filterMonth.value || (expenseDate.getMonth() + 1).toString().padStart(2, "0") === filterMonth.value;
        const yearMatches = !filterYear.value || expenseDate.getFullYear().toString() === filterYear.value;
        return monthMatches && yearMatches;
    });
});

// Sort Expenses
const sortedExpenses = computed(() => {
    let sorted = [...filteredExpenses.value];
    switch (sortBy.value) {
        case "costAsc":
            return sorted.sort((a, b) => a.cost - b.cost);
        case "costDesc":
            return sorted.sort((a, b) => b.cost - a.cost);
        case "dateAsc":
            return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        case "dateDesc":
            return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        case "alphaAsc":
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case "alphaDesc":
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case "category":
            return sorted.sort((a, b) => a.category.localeCompare(b.category));
        case "type":
            return sorted.sort((a, b) => a.type.localeCompare(b.type));
        default:
            return sorted;
    }
});

// Get Available Years
const availableYears = computed(() => {
    return Array.from(new Set(expenses.value.map((exp) => new Date(exp.date).getFullYear().toString()))).sort(
        (a, b) => b - a
    );
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
    padding: 15px; /* Reduced padding */
    border-radius: 8px; /* Slightly smaller border radius */
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    width: 300px; /* Reduced width */
    max-height: 80vh; /* Ensure it fits within the viewport */
    overflow-y: auto; /* Add scrolling if content overflows */
    font-size: 12px; /* Reduced font size */
}

/* Modal Content Styling */
.modal-content input,
.modal-content select {
    width: 100%;
    padding: 6px 10px; /* Reduced padding */
    margin: 8px 0; /* Reduced margin */
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
    font-size: 12px; /* Reduced font size */
}

.modal-content {
    text-align: center;
}

/* Modal Buttons */
.modal-button-group {
    display: flex;
    justify-content: center;
    gap: 8px; /* Adjusted spacing between buttons */
    margin-top: 10px;
}

.modal-button-group button {
    padding: 6px 10px; /* Reduced padding */
    font-size: 11px; /* Reduced font size */
    border-radius: 20px;
    background-color: #e5e4e4;
    width: 40%; /* Adjusted button width */
}

.modal-button-group .cancel-button {
    background-color: #f8dcdc;
    color: black;
}

/* Smaller Modal for Expense and Delete */
.smaller-modal {
    width: 280px; /* Reduced width for smaller modals */
    padding: 10px; /* Reduced padding */
    font-size: 12px; /* Reduced font size */
}

/* Modal Title Styling */
.modal-title {
    font-size: 14px; /* Reduced font size */
    font-weight: bold;
    margin-bottom: 8px; /* Reduced margin */
    text-align: center;
}

/* Delete Modal Button Group */
.button-group {
    display: flex;
    justify-content: space-evenly; /* Ensure equal spacing between buttons */
    align-items: center; /* Align the buttons vertically */
    gap: 10px; /* Add consistent spacing between buttons */
    margin-top: 15px;
}

.button-group button {
    flex: 1; /* Ensure buttons take equal space */
    max-width: 120px; /* Set a consistent maximum width for buttons */
    text-align: center;
    padding: 10px 15px; /* Adjust padding for better appearance */
    font-size: 12px; /* Consistent font size */
    border-radius: 25px; /* Rounded buttons */
    background-color: #e5e4e4;
    border: 1px solid #ccc;
    cursor: pointer;
    transition: background-color 0.3s ease, opacity 0.3s ease; /* Smooth hover effect */
}

.button-group button:hover {
    opacity: 0.9; /* Add hover effect */
}

.button-group .cancel-button {
    background-color: #f8dcdc;
    color: black;
}

.button-group .cancel-button:hover {
    background-color: #f5bcbc; /* Slightly darker hover effect for cancel button */
}

/* Add/Edit Modal Labels */
.modal-content label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    text-align: left;
}

/* Dropdown alignment */
.sort-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}
</style>
