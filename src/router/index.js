import { createRouter, createWebHistory } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const routes = [
    { path: "/", component: () => import("../views/LoginPage.vue") },
    { path: "/register", component: () => import("../views/RegisterPage.vue") },
    { path: "/faregister", component: () => import("../views/FARegisterPage.vue") },
    { path: "/home", component: () => import("../views/HomePage.vue"), meta: { requiresAuth: true } },
    { path: "/uploads", component: () => import("../views/UploadsPage.vue"), meta: { requiresAuth: true, role: "User" } },
    { path: "/expenses", component: () => import("../views/ExpensePage.vue"), meta: { requiresAuth: true, role: "User" } },
    { path: "/goals", component: () => import("../views/GoalsPage.vue"), meta: { requiresAuth: true, role: "User" } },
    { path: "/settings", component: () => import("../views/SettingsPage.vue"), meta: { requiresAuth: true } },
    { path: "/profile", component: () => import("../views/ProfilePage.vue"), meta: { requiresAuth: true } },
    { path: "/find-fa", component: () => import("../views/FindFA.vue"), meta: { requiresAuth: true, role: 'User' } },
    { path: "/find-client", component: () => import("../views/FindClient.vue"), meta: { requiresAuth: true, role: 'FA' } },
    { path: "/give-advice", component: () => import("../views/GiveAdvice.vue"), meta: { requiresAuth: true, role: 'FA' } },
    { path: "/fa-info", component: () => import("../views/FAInfo.vue"), meta: { requiresAuth: true, role: 'User' } },
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

const getCurrentUserRole = async (user) => {
    if (!user) return null;

    const db = getFirestore();
    const userDoc = await getDoc(doc(db, "users", user.uid));

    return userDoc.exists() ? userDoc.data().role : null;
};

router.beforeEach(async (to, from, next) => {
    const user = await new Promise(resolve => {
        onAuthStateChanged(getAuth(), resolve);
    });

    if (to.matched.some(record => record.meta.requiresAuth) && !user) {
        alert("You must be logged in to see this page");
        return next("/");
    }

    const role = await getCurrentUserRole(user);

    if (to.matched.some(record => record.meta.role) && to.meta.role !== role) {
        alert("Access denied");
        return next("/home");
    }

    next();
});

export default router;
