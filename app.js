// Firebase imports (modular syntax)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBCCLuMMoEruy9Y1q3Vbg4vFMnelbG9JYY",
  authDomain: "publisherrecords-2210d.firebaseapp.com",
  projectId: "publisherrecords-2210d",
  storageBucket: "publisherrecords-2210d.appspot.com",
  messagingSenderId: "1011321736820",
  appId: "1:1011321736820:web:4fd73f3447230aba858b21"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// App logic
let publishers = [];
let currentIndex = 0;
const months = ["September","October","November","December","January","February","March","April","May","June","July","August"];

function loadCSV(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");
    publishers = lines.slice(1).map(line => {
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
    localStorage.setItem("publishersData", JSON.stringify(publishers));
    displayList();
    loadRecord(0);
  };
  reader.readAsText(file);
}

function displayList() {
  const list = document.getElementById("publisher-list");
  list.innerHTML = "";
  publishers.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = p.Name || p.name || `Publisher ${i+1}`;
    li.onclick = () => loadRecord(i);
    list.appendChild(li);
  });
}

function filterPublishers() {
  const query = document.getElementById("search-bar").value.toLowerCase();
  const list = document.getElementById("publisher-list");
  list.innerHTML = "";
  publishers.forEach((p, i) => {
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
  currentIndex = index;
  const pub = publishers[index];
  const form = document.getElementById("record-form");
  form.name.value = pub.Name || pub.name || "";
  form.gender.value = pub.Gender || pub.gender || "";
  form.dob.value = pub.DateOfBirth || pub.dob || "";
  form.dop.value = pub.DateOfBaptism || pub.dop || "";
  form.role.value = pub.Role || pub.role || "";
  const monthlyDiv = document.getElementById("monthly-data");
  monthlyDiv.innerHTML = "";
  months.forEach(month => {
    const m = pub[month] || {};
    monthlyDiv.innerHTML += `
      <div class="month">
        <strong>${month}</strong><br/>
        Shared in Ministry: <input type="checkbox" name="${month}_shared" ${m.shared === "Yes" ? "checked" : ""}/><br/>
        Bible Studies: <input type="number" name="${month}_studies" value="${m.studies || ""}"/><br/>
        Auxiliary Pioneer: <input type="checkbox" name="${month}_pioneer" ${m.pioneer === "Yes" ? "checked" : ""}/><br/>
        Hours: <input type="number" name="${month}_hours" value="${m.hours || ""}"/><br/>
        Remarks: <input type="text" name="${month}_remarks" value="${m.remarks || ""}"/><br/>
      </div>`;
  });
}

function saveRecord(e) {
  e.preventDefault();
  const form = document.getElementById("record-form");
  const pub = publishers[currentIndex];

  pub.Name = form.name.value;
  pub.gender = form.gender.value;
  pub.dob = form.dob.value;
  pub.dop = form.dop.value;
  pub.role = form.role.value;

  months.forEach(month => {
    pub[month] = {
      shared: form[`${month}_shared`].checked ? "Yes" : "No",
      studies: form[`${month}_studies`].value,
      pioneer: form[`${month}_pioneer`].checked ? "Yes" : "No",
      hours: form[`${month}_hours`].value,
      remarks: form[`${month}_remarks`].value
    };
  });

  localStorage.setItem("publishersData", JSON.stringify(publishers));
  displayList();
  alert("✅ Record saved locally.");

  const firestoreData = {
    name: pub.Name,
    gender: pub.gender,
    dateOfBirth: pub.dob,
    dateOfBaptism: pub.dop,
    role: pub.role,
    monthly: {},
    timestamp: serverTimestamp()
  };

  months.forEach(month => {
    firestoreData.monthly[month] = { ...pub[month] };
  });

  addDoc(collection(db, "publishers"), firestoreData)
    .then((docRef) => {
      console.log("✅ Record saved to Firestore with ID:", docRef.id);
      alert("✅ Record saved to Firestore!");
    })
    .catch((error) => {
      console.error("❌ Error saving to Firestore:", error);
      alert("⚠️ Failed to save to Firestore. Record saved locally only.");
    });
}

window.onload = function() {
  const saved = localStorage.getItem("publishersData");
  if (saved) {
    publishers = JSON.parse(saved);
    displayList();
    loadRecord(0);
  }
  document.getElementById("delete-btn").addEventListener("click", deleteRecord);
};

function createNewRecord() {
  const newRecord = {
    Name: "",
    Gender: "Male",
    DateOfBirth: "",
    DateOfBaptism: "",
    Role: "None"
  };
  months.forEach(month => {
    newRecord[month] = {
      shared: "No",
      studies: "",
      pioneer: "No",
      hours: "",
      remarks: ""
    };
  });
  publishers.push(newRecord);
  currentIndex = publishers.length - 1;
  displayList();
  loadRecord(currentIndex);
}

function deleteRecord() {
  if (publishers.length === 0) return;
  const confirmed = confirm("Are you sure you want to delete this publisher?");
  if (!confirmed) return;
  publishers.splice(currentIndex, 1);
  localStorage.setItem("publishersData", JSON.stringify(publishers));
  currentIndex = Math.max(0, currentIndex - 1);
  displayList();
  if (publishers.length > 0) {
    loadRecord(currentIndex);
  } else {
    document.getElementById("record-form").reset();
    document.getElementById("monthly-data").innerHTML = "";
  }
}
window.saveRecord = saveRecord;
window.loadCSV = loadCSV;
window.filterPublishers = filterPublishers;
window.createNewRecord = createNewRecord;