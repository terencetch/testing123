// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCsuTYdBcFTGRYja0ONqRaW_es2eSCIeKA",
  authDomain: "platform-selection.firebaseapp.com",
  databaseURL: "https://platform-selection-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "platform-selection",
  storageBucket: "platform-selection.firebasestorage.app",
  messagingSenderId: "937466148910",
  appId: "1:937466148910:web:42406630f4d64409e947bf",
  measurementId: "G-LP3VWKX2F7"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js';
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentRoomId = null;
let roomRef = null;

function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}

window.createRoom = function() {
  const roomId = generateRoomId();
  const url = new URL(window.location.href);
  url.searchParams.set('roomId', roomId);
  window.history.pushState({}, '', url);
  joinRoom(roomId);
};

function joinRoom(roomId) {
  currentRoomId = roomId;
  roomRef = ref(database, `platforms/${currentRoomId}`);
  clearFirebaseData();
  createPlatformUI();
  setupRoomListener();
}

function getRoomIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('roomId');
}

function createPlatformUI() {
  const platformTableBody = document.getElementById('platforms');
  platformTableBody.innerHTML = '';

  if (!currentRoomId) return;

  for (let i = 10; i >= 1; i--) {
    const row = document.createElement('tr');
    const platformCell = document.createElement('td');
    platformCell.textContent = `Platform ${i}`;
    row.appendChild(platformCell);

    ['Beleth', 'P0NY', 'UnsungHero', 'AhoyCaptain'].forEach(user => {
      const userCell = document.createElement('td');
      userCell.classList.add('choice-container');
      userCell.dataset.user = user;
      userCell.dataset.platform = i;

      const choiceWrapperContainer = document.createElement('div');
      choiceWrapperContainer.classList.add('choice-wrapper-container');

      for (let choice = 1; choice <= 4; choice++) {
        const choiceWrapper = document.createElement('div');
        choiceWrapper.classList.add('choice-wrapper');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = choice;
        checkbox.dataset.platform = i;
        checkbox.dataset.user = user;
        checkbox.checked = false;

        const label = document.createElement('div');
        label.classList.add('choice-label');
        label.textContent = choice;

        choiceWrapper.appendChild(checkbox);
        choiceWrapper.appendChild(label);
        choiceWrapperContainer.appendChild(choiceWrapper);
      }
      userCell.appendChild(choiceWrapperContainer);
      row.appendChild(userCell);
    });
    platformTableBody.appendChild(row);
  }
}

function clearFirebaseData() {
  if (roomRef) {
    set(roomRef, null);
  }
}

function setupRoomListener() {
  if (roomRef) {
    onValue(roomRef, (snapshot) => {
      const platformData = snapshot.val() || {};
      updateUIState(platformData);
    });
  }
}

document.getElementById('platforms').addEventListener('change', (event) => {
  if (event.target.type === 'checkbox') {
    const checkbox = event.target;
    const platformNumber = checkbox.dataset.platform;
    const user = checkbox.dataset.user;
    const choice = checkbox.value;

    if (roomRef) {
      const userRef = ref(database, `${roomRef.key}/${platformNumber}/${user}`);
      set(userRef, checkbox.checked ? choice : null);
    }
  }
});

function updateUIState(platformData) {
  document.querySelectorAll('.choice-container').forEach(userCell => {
    const platform = userCell.dataset.platform;
    const user = userCell.dataset.user;
    const checkboxes = userCell.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
      checkbox.disabled = false;
      checkbox.checked = false;
      checkbox.parentElement.style.backgroundColor = '';
    });

    const platformUsersData = platformData[platform] || {};
    Object.entries(platformUsersData).forEach(([otherUser, otherChoice]) => {
      if (otherUser !== user && otherChoice) {
        checkboxes.forEach(checkbox => {
          if (checkbox.value === otherChoice) {
            checkbox.disabled = true;
          }
        });
      }
    });

    Object.entries(platformUsersData).forEach(([dbUser, dbChoice]) => {
      if (dbChoice) {
        checkboxes.forEach(checkbox => {
          if (checkbox.value === dbChoice) {
            checkbox.checked = true;
          }
        });
      }
    });

    const currentUserChoice = platformUsersData[user];
    if (currentUserChoice) {
      checkboxes.forEach(checkbox => {
        if (checkbox.value !== currentUserChoice) {
          checkbox.disabled = true;
        }
      });
    }

    const uncheckedChoices = Array.from(checkboxes).filter(checkbox => !checkbox.checked && !checkbox.disabled);
    if (uncheckedChoices.length === 1) {
      uncheckedChoices[0].parentElement.style.backgroundColor = 'green';
    }
  });
}

// Get room ID from URL on page load
const roomIdFromUrl = getRoomIdFromUrl();
if (roomIdFromUrl) {
  joinRoom(roomIdFromUrl);
}
