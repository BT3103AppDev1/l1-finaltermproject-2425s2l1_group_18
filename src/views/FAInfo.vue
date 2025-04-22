<template>
    <Navbar />
    <div class="fa-info-container">
      <h2>My Financial Advisor</h2>
  
      <div v-if="currentClientFA" class="fa-details-box">
        <p><strong>Username:</strong> {{ currentClientFA.username }}</p>
        <p><strong>Email:</strong> {{ currentClientFA.email }}</p>
        <p><strong>Company:</strong> {{ currentClientFA.company }}</p>
        <p><strong>About:</strong> {{ currentClientFA.about }}</p>
        <p><strong>Representative Number:</strong> {{ currentClientFA.representativeNumber }}</p>
        <p><strong>Total Clients:</strong> {{ currentClientFA.totalClients }}</p>
        <button @click="removeFA" class="remove-btn">Remove FA</button>
      </div>
  
      <div v-else class="no-fa-box">
        <h3>Oops! No Financial Advisor Now.</h3>
        <p>Add one to get started!</p>
        <button @click="goToFindFA" class="find-fa-btn">Find Financial Advisor</button>
      </div>
    </div>
  
    <div v-if="currentClientFA" class="memos-container">
      <h3>View Memos from Your Financial Advisor</h3>

      <select v-model="selectedMemo" class="memo-dropdown" @change="viewMemo">
        <option disabled value="">Select a memo</option>
        <option v-for="memo in sortedMemos" :key="memo.id" :value="memo">
          {{ memo.label }} ({{ memo.date }})
        </option>
      </select>

      <div v-if="showMemoPopup" class="modal-overlay" @click.self="closeMemoPopup">
        <div class="modal">
          <h3>{{ selectedMemo.label }}</h3>
          <p>{{ selectedMemo.content }}</p>
          <button @click="downloadMemo">Download</button>
          <button @click="closeMemoPopup">Close</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { getAuth } from "firebase/auth";
  import { computed } from "vue";
  import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
  } from "firebase/firestore";
  import Navbar from "../components/TheNavbar.vue";
  
  const db = getFirestore();
  const auth = getAuth();
  const router = useRouter();
  
  const currentClientFA = ref(null);
  const currentClientId = ref("");
  
  const memos = ref([]);
  const selectedMemo = ref(null);
  const showMemoPopup = ref(false);


  const fetchCurrentFA = async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    currentClientId.value = user.uid;
  
    try {
      const clientRef = doc(db, "users", user.uid);
      const clientDoc = await getDoc(clientRef);
  
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const faId = clientData?.fa?.id;

        if (faId) {
          const faRef = doc(db, "users", faId);
          const faDoc = await getDoc(faRef);

          if (faDoc.exists()) {
            const faData = faDoc.data();
            const clientsRef = collection(db, "users", faId, "clients");
            const querySnapshot = await getDocs(clientsRef);
            const totalClients = querySnapshot.size;

            currentClientFA.value = {
              ...faData,
              totalClients,
              adviceAvailable: clientData.adviceAvailable || false,
              adviceDate: clientData.adviceDate || "",
              adviceFileURL: clientData.adviceFileURL || null,
              adviceText: clientData.adviceText || "",
            };
          }
        }
      }

    } catch (error) {
      console.error("Error fetching FA:", error);
    }
  };
  
  const fetchClientMemos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const adviceRef = collection(db, "users", user.uid, "advice");
      const snapshot = await getDocs(adviceRef);

      memos.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp.toDate().toLocaleDateString(), 
      }));
    } catch (error) {
      console.error("Error fetching memos:", error);
    }
  };

  const viewMemo = () => {
    if (selectedMemo.value) {
      showMemoPopup.value = true;
    }
  };

  const sortedMemos = computed(() => {
    return [...memos.value].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp); 
    });
  });

  const downloadMemo = () => {
    if (!selectedMemo.value) return;

    const blob = new Blob([selectedMemo.value.content], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedMemo.value.label}.txt`; 
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const closeMemoPopup = () => {
    showMemoPopup.value = false;
  };

  onMounted(() => {
    fetchCurrentFA();
    fetchClientMemos();
  });


  const removeFA = async () => {
    if (!currentClientFA.value) return;
  
    try {
      const clientRef = doc(db, "users", currentClientId.value);
      await updateDoc(clientRef, { fa: null });
  
      const faClientRef = doc(
        db,
        "users",
        currentClientFA.value.uid,
        "clients",
        currentClientId.value
      );
      await deleteDoc(faClientRef);
  
      alert(`Removed Financial Advisor: ${currentClientFA.value.username}`);
      currentClientFA.value = null;
    } catch (error) {
      console.error("Error removing FA:", error);
    }
  };
  
  const goToFindFA = () => {
    router.push("/find-fa");
  };
  
  const downloadAdvice = () => {
    if (currentClientFA.value?.adviceFileURL) {
      window.open(currentClientFA.value.adviceFileURL, "_blank");
    }
  };
  
  onMounted(fetchCurrentFA);
  </script>
  
  <style scoped>
  .fa-info-container {
    max-width: 600px;
    margin: 40px auto 20px auto;
    padding: 20px;
    text-align: center;
    font-family: "Georgia", serif;
  }
  
  h2 {
    font-size: 28px;
    margin-bottom: 30px;
  }
  
  .fa-details-box,
  .no-fa-box {
    background-color: rgb(251, 248, 243);
    border: 1px solid grey;
    border-radius: 20px;
    padding: 20px;
    margin-top: 20px;
  }
  
  .fa-details-box p {
    font-size: 17px;
    margin: 10px 0;
    line-height: 1.6;
  }

  .memos-container {
    margin-top: 30px;
    text-align: center;
    width: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;  
    justify-content: center;
    margin: 0 auto;

  }

  .memo-dropdown {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    font-family: inherit;
    margin-bottom: 20px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal {
    background: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .modal h3 {
    margin-bottom: 10px;
  }

  .modal button {
    margin-top: 10px;
    padding: 7px 20px;
    background-color: #8aabd1;
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 12px;
    cursor: pointer;
    margin-right: 5px;
  }

  .modal button:hover {
    background-color: #328cf0;
  }
  
  .remove-btn,
  .find-fa-btn,
  .download-btn {
    margin-top: 20px;
    padding: 7px 20px;
    border: none;
    border-radius: 25px;
    font-size: 13px;
    cursor: pointer;
    font-family: "Georgia", serif;
  }
  
  .remove-btn {
    background-color: #ff9e9e;
    color: black;
  }
  
  .remove-btn:hover {
    background-color: #dd6e6e;
  }
  
  .find-fa-btn {
    background-color: #4ca1ff;
    color: white;
  }
  
  .find-fa-btn:hover {
    background-color: #328cf0;
  }
  
  .advice-container {
    background-color: rgb(251, 248, 243);
    border: 1px solid grey;
    border-radius: 20px;
    padding: 25px;
    max-width: 550px;
    margin: 30px auto;
    text-align: center;
    font-family: "Georgia", serif;
  }

  .advice-title {
    margin-bottom: 25px;
    font-size: 18px; 
}
  
  .advice-container h3 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  .status-available {
    color: #67d781;
    font-weight: bold;
  }
  
  .status-nil {
    color: grey;
    font-style: italic;
  }
  
  .download-btn {
    background-color: white;
    border: 1px solid black;
    color: black;
  }
  
  .download-btn:hover {
    background-color: #f0f0f0;
  }
  </style>
  