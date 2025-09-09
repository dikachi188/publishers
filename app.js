import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBCCLuMMoEruy9Y1q3Vbg4vFMnelbG9JYY",
  authDomain: "publisherrecords-2210d.firebaseapp.com",
  projectId: "publisherrecords-2210d",
  storageBucket: "publisherrecords-2210d.appspot.com",
  messagingSenderId: "1011321736820",
  appId: "1:1011321736820:web:4fd73f3447230aba858b21"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const editors = [
  "oowonta@gmail.com",
  "owontakingsley7@gmail.com",
  "kowonta@gmail.com"
];

const months = ["September","October","November","December","January","February","March","April","May","June","July","August"];

let publisherRecords = {};
let currentYear = "2024-2025";
let currentIndex = 0;

function switchServiceYear() {
  currentYear = document.getElementById("service-year-selector").value;
  if (!publisherRecords[currentYear]) {
    publisherRecords[currentYear] = [];
  }
  displayList();
  document.getElementById("record-view").style.display = "none";
}

function showAppView() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("app").style.display = "flex";
}

async function login() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const statusEl = document.getElementById("login-status");
  const loginBtn = document.getElementById("login-btn");

  if (!email || !password) {
    statusEl.textContent = "Please enter both email and password.";
    statusEl.style.color = "red";
    return;
  }

  loginBtn.disabled = true;
  statusEl.textContent = "Logging in...";
  statusEl.style.color = "black";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    statusEl.textContent = `Logged in as ${user.email}`;
    statusEl.style.color = "green";
    checkEditorAccess(user.email);
    showAppView();

    const docRef = doc(db, "publishers", user.email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      publisherRecords = docSnap.data().serviceYears || {};
    } else {
      publisherRecords = {};
    }

    displayList();
  } catch (error) {
    statusEl.textContent = "Login failed: " + error.message;
    statusEl.style.color = "red";
  } finally {
    loginBtn.disabled = false;
  }
}

function signUp() {
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const password = document.getElementById("signup-password").value;

  if (!editors.includes(email)) {
    document.getElementById("login-status").textContent = "Sign-up denied: Not an authorized editor.";
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const user = userCredential.user;
      document.getElementById("login-status").textContent = `Account created for ${user.email}`;
      checkEditorAccess(user.email);
      showAppView();
    })
    .catch(error => {
      document.getElementById("login-status").textContent = "Sign-up failed: " + error.message;
    });
}

function checkEditorAccess(email) {
  const isEditor = editors.includes(email);
  document.querySelectorAll("input, select, button[type='submit'], #delete-btn").forEach(el => {
    el.disabled = !isEditor;
  });
  document.querySelector("button[onclick='createNewRecord()']").style.display = isEditor ? "inline-block" : "none";
}

async function loadCSV(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");
    const records = lines.slice(1).map(line => {
      const values = line.split(",");
      const record = {};
      headers.forEach((header, i) => record[header.trim()] = values[i]?.trim());
      months.forEach(month => {
        record[month] = {
          shared: record[`${month}_Shared`] || "",
          studies: record[`${month}_Studies`] || "",
          pioneer: record[`${month}_AuxiliaryPioneer`] || "",
          hours: record[`${month}_Hours`] || "",
          remarks: record[`${month}_Remarks`] || ""
        };
      });
      return record;
    });
    publisherRecords[currentYear] = records;

    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "publishers", user.email), {
        serviceYears: publisherRecords
      });
    }

    displayList();
    loadRecord(0);
  };
  reader.readAsText(file);
}

function displayList() {
  const list = document.getElementById("publisher-list");
  list.innerHTML = "";
  const pubs = publisherRecords[currentYear] || [];
  pubs.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = p.Name || p.name || `Publisher ${i+1}`;
    li.onclick = () => {
      document.querySelectorAll("#publisher-list li").forEach(el => el.classList.remove("selected"));
      li.classList.add("selected");
      loadRecord(i);
    };
    list.appendChild(li);
  });
}

function filterPublishers() {
  const query = document.getElementById("search-bar").value.toLowerCase();
  const list = document.getElementById("publisher-list");
  list.innerHTML = "";
  const pubs = publisherRecords[currentYear] || [];
  pubs.forEach((p, i) => {
    const name = p.Name || p.name || `Publisher ${i+1}`;
    if (name.toLowerCase().includes(query)) {
      const li = document.createElement("li");
      li.textContent = name;
      li.onclick = () => loadRecord(i);
      list.appendChild(li);
    }
  });
}

function loadRecord(index) {
  document.getElementById("record-view").style.display = "flex";
  currentIndex = index;
  const pub = publisherRecords[currentYear][index];
  const form = document.getElementById("record-form");

  form.name.value = pub.name || "";
  form.gender.value = pub.gender || "";
  form.dob.value = pub.dob || "";
  form.dop.value = pub.dop || "";
  form.role.value = pub.role || "";

  const monthlyContainer = document.getElementById("monthly-data");
  monthlyContainer.innerHTML = "";

  months.forEach(month => {
    const data = pub[month] || {};
    const section = document.createElement("section");
    section.className = "month-record";
    section.innerHTML = `
      <h3>${month}</h3>
      <div class="month-grid">
        <label><input type="checkbox" name="${month}_shared" ${data.shared === "on" ? "checked" : ""} /> Shared in Ministry</label>
        <label><input type="checkbox" name="${month}_pioneer" ${data.pioneer === "on" ? "checked" : ""} /> Auxiliary Pioneer</label>
        <label>Studies: <input type="number" name="${month}_studies" value="${data.studies || ""}" min="0" /></label>
        <label>Hours: <input type="number" name="${month}_hours" value="${data.hours || ""}" min="0" /></label>
        <label>Return Visits: <input type="number" name="${month}_visits" value="${data.visits || ""}" min="0" /></label>
        <label>Remarks: <input type="text" name="${month}_remarks" value="${data.remarks || ""}" /></label>
      </div>
    `;
    monthlyContainer.appendChild(section);
  });
}

async function saveRecord(event) {
  event.preventDefault();
  const form = document.getElementById("record-form");
  const pub = {
    name: form.name.value,
    gender: form.gender.value,
  dob: form.dob.value,
  dop: form.dop.value,
  role: form.role.value
};

months.forEach(month => {
  pub[month] = {
    shared: form[`${month}_shared`].checked ? "on" : "",
    pioneer: form[`${month}_pioneer`].checked ? "on" : "",
    studies: form[`${month}_studies`].value,
    hours: form[`${month}_hours`].value,
    visits: form[`${month}_visits`].value,
    remarks: form[`${month}_remarks`].value
  };
});

publisherRecords[currentYear][currentIndex] = pub;
displayList();

// 🔥 Save to Firestore
const user = auth.currentUser;
if (user) {
  await setDoc(doc(db, "publishers", user.email), {
    serviceYears: publisherRecords
  });
}

   alert("Record saved!");
  }

  function createNewRecord() {
  const newPub = {
    name: "",
    gender: "",
    dob: "",
    dop: "",
    role: ""
  };

  months.forEach(month => {
    newPub[month] = {
      shared: "",
      studies: "",
      pioneer: "",
      hours: "",
      visits: "",
      remarks: ""
    };
  });

  if (!publisherRecords[currentYear]) {
    publisherRecords[currentYear] = [];
  }

  publisherRecords[currentYear].push(newPub);
  currentIndex = publisherRecords[currentYear].length - 1;
  loadRecord(currentIndex);
  displayList();
}

function addNewServiceYear() {
  const input = document.getElementById("new-year-input");
  const year = input.value.trim();
  const selector = document.getElementById("service-year-selector");

  if (!year.match(/^\d{4}-\d{4}$/)) {
    alert("Please enter a valid format like 2026-2027");
    return;
  }

  if ([...selector.options].some(opt => opt.value === year)) {
    alert("That service year already exists.");
    return;
  }

  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  selector.appendChild(option);

  publisherRecords[year] = [];
  selector.value = year;
  switchServiceYear();

  input.value = "";
}
  // 🔗 Expose functions globally so HTML can access them
window.login = login;
window.signUp = signUp;
window.switchServiceYear = switchServiceYear;
window.loadCSV = loadCSV;
window.displayList = displayList;
window.filterPublishers = filterPublishers;
window.loadRecord = loadRecord;
window.saveRecord = saveRecord;
window.checkEditorAccess = checkEditorAccess;
window.createNewRecord = createNewRecord;
window.addNewServiceYear = addNewServiceYear;
window.closeRecord = closeRecord;
