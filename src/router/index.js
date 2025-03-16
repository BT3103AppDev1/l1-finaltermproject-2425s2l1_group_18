import { createRouter, createWebHistory } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: () => import("../views/LoginPage.vue") },
        { path: "/register", component: () => import("../views/RegisterPage.vue") },
        { 
            path: "/home", 
            component: () => import("../views/HomePage.vue"),
            meta: { requiresAuth: true } 
        },
        { 
            path: "/uploads", 
            component: () => import("../views/UploadsPage.vue"),
            meta: { requiresAuth: true } 
        },
        { 
            path: "/expenses", 
            component: () => import("../views/ExpensePage.vue"),
            meta: { requiresAuth: true } 
        },
        {
            path: "/goals",
            component: () => import("../views/GoalsPage.vue"),
            meta: { requiresAuth: true }
        }
    ],
});

const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const removeListener = onAuthStateChanged(getAuth(), 
        (user) => {
            removeListener();
            resolve(user);
        },
        reject
        );
    });
};

router.beforeEach(async (to, from, next) => {
    const user = await getCurrentUser();

    if (to.matched.some((record) => record.meta.requiresAuth) && !user) {
        alert("You must be logged in to see this page");
        next("/");
    } else {
        next();
    }
});

export default router;
