// --- Shared Helper Functions ---

function extractShortLink(url) {
  // Matches trello.com/c/SHORTLINK/...
  const match = url.match(/trello\.com\/c\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null; // Return null if no match
}

async function fetchCardTitle(url) {
  const shortLink = extractShortLink(url);
  if (!shortLink) {
    return url; // Return original URL if not a valid Trello card URL
  }
  try {
    // NOTE: Uses public API - has limitations for private cards!
    // Consider switching to authenticated API later.
    const res = await fetch(`https://trello.com/1/cards/${shortLink}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    return data.name || `Card ${shortLink}`; // Return name or fallback
  } catch (error) {
    console.error('Error fetching card title:', error);
    return `Card ${shortLink} (Error)`; // Indicate error in fallback
  }
}

// --- Core Data Operations ---

async function getSubtasks(t) {
  return t.get('card', 'shared', 'subtasks', []);
}

async function saveSubtasks(t, subtasks) {
  return t.set('card', 'shared', 'subtasks', subtasks);
}

// --- Rendering Logic ---

async function renderSubtasks(t, listElement, subtasks) {
  listElement.innerHTML = ''; // Clear current list

  if (!subtasks || !subtasks.length) {
    listElement.innerHTML = `<li class="empty-note">No subtasks linked yet.</li>`;
    return;
  }

  // Use Promise.all to fetch titles concurrently for faster rendering
  const listItemsPromises = subtasks.map(async (url, index) => {
    const title = await fetchCardTitle(url);

    const li = document.createElement('li');
    li.className = 'subtask-item'; // Using classes from subtask-section.html

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.className = 'subtask-title'; // Using class from subtask-section.html
    link.textContent = title;
    link.title = url; // Show full URL on hover

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.className = 'remove-btn'; // Using class from subtask-section.html
    removeBtn.title = 'Remove';
    // Pass t and listElement to the handler so it can re-render
    removeBtn.onclick = () => handleRemoveSubtask(t, listElement, index);

    li.appendChild(link);
    li.appendChild(removeBtn);
    return li;
  });

  const listItems = await Promise.all(listItemsPromises);
  listItems.forEach(item => listElement.appendChild(item));
}

// --- Event Handlers / Actions ---

async function handleAddSubtask(t, listElement, inputElement) {
  const url = inputElement.value.trim();
  if (!url || !extractShortLink(url)) { // Basic validation
     t.alert({ message: 'Please paste a valid Trello card URL.', duration: 5, display: 'error' });
     inputElement.focus();
     return;
  }

  try {
     // Disable input/button during add
     inputElement.disabled = true;
     // Find button next to input (assuming it's the next sibling)
     const addButton = inputElement.nextElementSibling;
     if (addButton) addButton.disabled = true;

     let subtasks = await getSubtasks(t);
     if (!subtasks.includes(url)) {
         subtasks.push(url);
         await saveSubtasks(t, subtasks);
         // Fetch again after save for consistency
         subtasks = await getSubtasks(t);
     } else {
         t.alert({ message: 'This subtask is already linked.', duration: 5, display: 'warning' });
     }

     inputElement.value = ''; // Clear input
     await renderSubtasks(t, listElement, subtasks); // Re-render

  } catch (error) {
      console.error('Error adding subtask:', error);
      t.alert({ message: 'Failed to add subtask. Please try again.', duration: 6, display: 'error' });
  } finally {
      // Re-enable input/button
      inputElement.disabled = false;
      const addButton = inputElement.nextElementSibling;
      if (addButton) addButton.disabled = false;
      inputElement.focus();
  }
}

async function handleRemoveSubtask(t, listElement, index) {
  try {
    let subtasks = await getSubtasks(t);
    subtasks.splice(index, 1); // Remove item at index
    await saveSubtasks(t, subtasks);
    // Fetch again after save
    subtasks = await getSubtasks(t);
    await renderSubtasks(t, listElement, subtasks); // Re-render
  } catch (error) {
      console.error('Error removing subtask:', error);
      t.alert({ message: 'Failed to remove subtask. Please try again.', duration: 6, display: 'error' });
  }
}

// --- Initialization ---

async function initializeSubtaskView(t, listElement) {
   try {
      const subtasks = await getSubtasks(t);
      await renderSubtasks(t, listElement, subtasks);
   } catch (error) {
       console.error('Error initializing subtask view:', error);
       listElement.innerHTML = `<li class="empty-note" style="color: red;">Error loading subtasks.</li>`;
   }
}