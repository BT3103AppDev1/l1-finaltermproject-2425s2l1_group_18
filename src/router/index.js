import { createRouter, createWebHistory } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: () => import("../views/Login.vue") },
        { path: "/register", component: () => import("../views/Register.vue") },
        { 
            path: "/home", 
            component: () => import("../views/Home.vue"),
            meta: { requiresAuth: true } 
        },
        { 
            path: "/uploads", 
            component: () => import("../views/Uploads.vue"),
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

router.beforeEach(async(to, from, next) => {
    if (to.matched.some((record) => record.meta.requiresAuth)) {
        if (await getCurrentUser()) {
            next();
        } else {
            alert("You must be logged in to see this page");
            next("/");
        }
    } else {
        next();
    }
});

export default router;
