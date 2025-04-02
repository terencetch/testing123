// Firebase config (same as before)
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

// Initialize Firebase (same as before)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js';
import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentRoomId = null;
let currentUserId = null;
let roomRef = null;

function joinRoom() {
  const roomIdInput = document.getElementById('roomId');
  const userIdInput = document.getElementById('userId');
  const roomId = roomIdInput.value.trim();
  const userId = userIdInput.value.trim();

  if (roomId && userId) {
    currentRoomId = roomId;
    currentUserId = userId;
    const usersRef = ref(database, `rooms/${currentRoomId}/users`);

    get(usersRef)
      .then((snapshot) => {
        let users = snapshot.val() ? Object.keys(snapshot.val()) : [];

        if (users.length >= 4 && !users.includes(userId)) {
          alert('The room is at maximum capacity (4 players).');
          return; // Stop the join process
        }

        roomRef = ref(database, `rooms/${currentRoomId}/users/${currentUserId}`);

        set(roomRef, true)
          .then(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('roomId', currentRoomId);
            window.history.pushState({}, '', url);
            createPlatformUI();
            setupRoomListener();
            document.querySelector('.initial-page').style.display = 'none';
          })
          .catch((error) => {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
          });
      })
      .catch((error) => {
        console.error('Error fetching users:', error);
        alert('Failed to join room. Please try again.');
      });
  } else {
    alert('Please enter both Room ID and User ID.');
  }
}

document.getElementById('joinRoomButton').addEventListener('click', joinRoom);

function getRoomIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('roomId');
}

function createPlatformUI() {
  const platformTableBody = document.getElementById('platforms');
  platformTableBody.style.display = 'table';
  platformTableBody.innerHTML = '';

  if (!currentRoomId) {
    document.getElementById('clearRoomButton').style.display = 'none';
    return;
  }

  document.getElementById('clearRoomButton').style.display = 'block';

  const headerRow = document.createElement('tr');
  const platformHeader = document.createElement('th');
  platformHeader.textContent = 'Platforms';
  headerRow.appendChild(platformHeader);
  platformTableBody.appendChild(headerRow);

  // Create the platform rows only once
  for (let i = 10; i >= 1; i--) {
    const row = document.createElement('tr');
    const platformCell = document.createElement('td');
    platformCell.textContent = `Platform ${i}`;
    row.appendChild(platformCell);
    platformTableBody.appendChild(row);
  }

  // Update user headers dynamically
  updateUserHeaders();
}

function updateUserHeaders() {
  const usersRef = ref(database, `rooms/${currentRoomId}/users`);
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() ? Object.keys(snapshot.val()) : [];
    const headerRow = document.querySelector('#platforms tr'); // Get the header row

    // Remove existing user headers
    while (headerRow.cells.length > 1) {
      headerRow.deleteCell(1);
    }

    // Add new user headers
    users.forEach(user => {
      const userHeader = document.createElement('th');
      userHeader.textContent = user;
      headerRow.appendChild(userHeader);
    });

    // Update user cells in platform rows
    updateUserCells(users);
  });
}

function updateUserCells(users) {
  const platformTableBody = document.getElementById('platforms');
  const platformRows = platformTableBody.querySelectorAll('tr:not(:first-child)'); // Skip header row

  platformRows.forEach((row, index) => {
    const platformNumber = 10 - index; // Calculate platform number

    // Remove existing user cells
    while (row.cells.length > 1) {
      row.deleteCell(1);
    }

    // Add new user cells
    users.forEach(user => {
      const userCell = document.createElement('td');
      userCell.classList.add('choice-container');
      userCell.dataset.user = user;
      userCell.dataset.platform = platformNumber;

      const choiceWrapperContainer = document.createElement('div');
      choiceWrapperContainer.classList.add('choice-wrapper-container');

      for (let choice = 1; choice <= 4; choice++) {
        const choiceWrapper = document.createElement('div');
        choiceWrapper.classList.add('choice-wrapper');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = choice;
        checkbox.dataset.platform = platformNumber;
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
  });
}

function setupRoomListener() {
  if (currentRoomId) {
    const platformRef = ref(database, `rooms/${currentRoomId}/platforms`);
    onValue(platformRef, (snapshot) => {
      if (snapshot.exists()) {
        updateUIState(snapshot.val());
      } else {
        updateUIState({});
      }
    });
  }
}

document.getElementById('platforms').addEventListener('change', (event) => {
  if (event.target.type === 'checkbox') {
    const checkbox = event.target;
    const platformNumber = checkbox.dataset.platform;
    const user = checkbox.dataset.user;
    const choice = checkbox.value;

    if (currentRoomId) {
      const userRef = ref(database, `rooms/${currentRoomId}/platforms/${platformNumber}/${user}`);
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

function clearRoom() {
  if (currentRoomId) {
    const platformRef = ref(database, `rooms/${currentRoomId}/platforms`);
    set(platformRef, null)
      .then(() => {
        alert('Platform choices cleared!');
        // Update the UI to clear the platform choices
        updateUIState({}); // Pass an empty object to clear all choices
      })
      .catch((error) => {
        console.error('Error clearing platform choices:', error);
        alert('Failed to clear platform choices. Please try again.');
      });
  }
}

document.getElementById('clearRoomButton').addEventListener('click', clearRoom);

const roomIdFromUrl = getRoomIdFromUrl();
if (roomIdFromUrl) {
  currentRoomId = roomIdFromUrl;
  createPlatformUI();
  setupRoomListener();
  document.querySelector('.initial-page').style.display = 'none';
} else {
    document.getElementById('platforms').style.display = 'none';
}
