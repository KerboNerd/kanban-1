// API Configuration
const API_BASE_URL = '/.netlify/functions/api';

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
});

// Task management
let tasks = [];
let archivedTasks = [];

// Load tasks from API
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const allTasks = await response.json();
        tasks = allTasks.filter(task => task.status !== 'done-list');
        archivedTasks = allTasks.filter(task => task.status === 'done-list');
        
        renderAllTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        alert('Failed to load tasks. Please try again later.');
    }
}

// Save task to API
async function saveTask(taskData) {
    try {
        const method = taskData.id ? 'PUT' : 'POST';
        const url = taskData.id ? `${API_BASE_URL}/tasks/${taskData.id}` : `${API_BASE_URL}/tasks`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) throw new Error('Failed to save task');
        
        const task = await response.json();
        return task;
    } catch (error) {
        console.error('Error saving task:', error);
        throw error;
    }
}

// Delete task from API
async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
}

// Modal functionality
const taskModal = document.getElementById('taskModal');
const archiveModal = document.getElementById('archiveModal');
const taskForm = document.getElementById('taskForm');
let currentTaskId = null;

function openNewTaskModal(listId) {
    currentTaskId = null;
    taskForm.reset();
    document.getElementById('taskStatus').value = listId;
    taskModal.classList.remove('hidden');
}

function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    currentTaskId = taskId;
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskAssignee').value = task.assignee;
    document.getElementById('taskDueDate').value = task.dueDate;
    document.getElementById('taskTags').value = task.tags.join(', ');
    document.getElementById('taskLinks').value = task.links.join(', ');

    taskModal.classList.remove('hidden');
}

function closeTaskModal() {
    taskModal.classList.add('hidden');
    taskForm.reset();
    currentTaskId = null;
}

// Archive Modal functionality
function openArchiveModal() {
    renderArchivedTasks();
    archiveModal.classList.remove('hidden');
}

function closeArchiveModal() {
    archiveModal.classList.add('hidden');
}

function renderArchivedTasks() {
    const container = document.getElementById('archivedTasksList');
    container.innerHTML = '';

    if (archivedTasks.length === 0) {
        container.innerHTML = '<p class="text-center font-mono text-gray-600">No archived tasks</p>';
        return;
    }

    archivedTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card bg-gray-300 p-3 rounded flex flex-col gap-2 priority-${task.priority}`;
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start';
        
        const title = document.createElement('h3');
        title.className = 'font-bold';
        title.textContent = task.title;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-2';
        
        const restoreButton = document.createElement('button');
        restoreButton.textContent = 'RESTORE';
        restoreButton.className = 'px-2 py-1 text-sm bg-gray-400 rounded';
        restoreButton.onclick = () => restoreTask(task.id);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'DELETE';
        deleteButton.className = 'px-2 py-1 text-sm bg-gray-400 rounded';
        deleteButton.onclick = () => deleteArchivedTask(task.id);

        buttonContainer.appendChild(restoreButton);
        buttonContainer.appendChild(deleteButton);
        header.appendChild(title);
        header.appendChild(buttonContainer);
        card.appendChild(header);

        // Add metadata
        const meta = document.createElement('div');
        meta.className = 'text-xs space-y-1';

        const archivedDate = document.createElement('div');
        archivedDate.textContent = `ARCHIVED: ${new Date(task.updatedAt).toLocaleDateString()}`;
        meta.appendChild(archivedDate);

        if (task.assignee) {
            const assignee = document.createElement('div');
            assignee.textContent = `ASSIGNEE: ${task.assignee}`;
            meta.appendChild(assignee);
        }

        if (task.dueDate) {
            const dueDate = document.createElement('div');
            dueDate.textContent = `DUE: ${new Date(task.dueDate).toLocaleDateString()}`;
            meta.appendChild(dueDate);
        }

        card.appendChild(meta);

        // Add description if exists
        if (task.description) {
            const description = document.createElement('p');
            description.className = 'text-sm';
            description.textContent = task.description;
            card.appendChild(description);
        }

        container.appendChild(card);
    });
}

async function restoreTask(taskId) {
    try {
        const task = archivedTasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = 'todo-list';
        await saveTask(task);
        
        archivedTasks = archivedTasks.filter(t => t.id !== taskId);
        tasks.push(task);
        
        renderAllTasks();
        renderArchivedTasks();
    } catch (error) {
        console.error('Error restoring task:', error);
        alert('Failed to restore task. Please try again later.');
    }
}

async function deleteArchivedTask(taskId) {
    if (confirm('Are you sure you want to permanently delete this task?')) {
        try {
            await deleteTask(taskId);
            archivedTasks = archivedTasks.filter(t => t.id !== taskId);
            renderArchivedTasks();
        } catch (error) {
            console.error('Error deleting archived task:', error);
            alert('Failed to delete task. Please try again later.');
        }
    }
}

// Form submission
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const taskData = {
        id: currentTaskId,
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value,
        dueDate: document.getElementById('taskDueDate').value,
        tags: document.getElementById('taskTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
        links: document.getElementById('taskLinks').value.split(',').map(link => link.trim()).filter(link => link),
        createdAt: currentTaskId ? tasks.find(t => t.id === currentTaskId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        const task = await saveTask(taskData);
        
        if (currentTaskId) {
            const index = tasks.findIndex(t => t.id === currentTaskId);
            tasks[index] = task;
        } else {
            tasks.push(task);
        }

        renderAllTasks();
        closeTaskModal();
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save task. Please try again later.');
    }
});

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card bg-gray-300 p-3 rounded flex flex-col gap-2 priority-${task.priority}`;
    card.draggable = true;
    card.dataset.taskId = task.id;

    // Title and buttons
    const header = document.createElement('div');
    header.className = 'flex justify-between items-start';
    
    const title = document.createElement('h3');
    title.className = 'font-bold';
    title.textContent = task.title;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex gap-2';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'EDIT';
    editButton.className = 'px-2 py-1 text-sm bg-gray-400 rounded';
    editButton.onclick = (e) => {
        e.stopPropagation();
        openEditTaskModal(task.id);
    };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'DEL';
    deleteButton.className = 'px-2 py-1 text-sm bg-gray-400 rounded';
    deleteButton.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteTask(task.id);
                tasks = tasks.filter(t => t.id !== task.id);
                renderAllTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
                alert('Failed to delete task. Please try again later.');
            }
        }
    };

    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    header.appendChild(title);
    header.appendChild(buttonContainer);

    // Description
    if (task.description) {
        const description = document.createElement('p');
        description.className = 'text-sm';
        description.textContent = task.description;
        card.appendChild(description);
    }

    // Meta information
    const meta = document.createElement('div');
    meta.className = 'text-xs space-y-1';

    if (task.assignee) {
        const assignee = document.createElement('div');
        assignee.textContent = `ASSIGNEE: ${task.assignee}`;
        meta.appendChild(assignee);
    }

    if (task.dueDate) {
        const dueDate = document.createElement('div');
        dueDate.textContent = `DUE: ${new Date(task.dueDate).toLocaleDateString()}`;
        meta.appendChild(dueDate);
    }

    // Tags
    if (task.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'flex flex-wrap gap-1 mt-2';
        task.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'task-tag';
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
        card.appendChild(tagsContainer);
    }

    // Links
    if (task.links.length > 0) {
        const linksContainer = document.createElement('div');
        linksContainer.className = 'text-xs space-y-1 mt-2';
        task.links.forEach(link => {
            const linkElement = document.createElement('a');
            linkElement.href = link.startsWith('http') ? link : `https://${link}`;
            linkElement.target = '_blank';
            linkElement.className = 'block text-blue-600 hover:underline';
            linkElement.textContent = link;
            linksContainer.appendChild(linkElement);
        });
        card.appendChild(linksContainer);
    }

    card.appendChild(header);
    card.appendChild(meta);

    // Drag and drop functionality
    card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', async () => {
        card.classList.remove('dragging');
        const newStatus = card.parentElement.id;
        try {
            const task = tasks.find(t => t.id === card.dataset.taskId);
            if (task) {
                task.status = newStatus;
                await saveTask(task);
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            alert('Failed to update task status. Please try again later.');
        }
    });

    return card;
}

function renderAllTasks() {
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('in-progress-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';

    tasks.forEach(task => {
        const list = document.getElementById(task.status);
        if (list) {
            list.appendChild(createTaskCard(task));
        }
    });
}

// Archive functionality
document.getElementById('archiveButton').addEventListener('click', async () => {
    const completedTasks = tasks.filter(task => task.status === 'done-list');
    
    try {
        for (const task of completedTasks) {
            await saveTask(task);
        }
        
        archivedTasks.push(...completedTasks);
        tasks = tasks.filter(task => task.status !== 'done-list');
        renderAllTasks();
    } catch (error) {
        console.error('Error archiving tasks:', error);
        alert('Failed to archive tasks. Please try again later.');
    }
});

// View archive button
document.getElementById('viewArchiveButton').addEventListener('click', openArchiveModal);

// Initialize drag and drop for all columns
const columns = document.querySelectorAll('.kanban-column');

columns.forEach(column => {
    column.addEventListener('dragover', e => {
        e.preventDefault();
        const draggingCard = document.querySelector('.dragging');
        const cardAfterDraggingCard = getCardAfterDraggingCard(column, e.clientY);
        
        if (cardAfterDraggingCard) {
            cardAfterDraggingCard.parentNode.insertBefore(draggingCard, cardAfterDraggingCard);
        } else {
            column.querySelector('div').appendChild(draggingCard);
        }
    });
});

function getCardAfterDraggingCard(column, y) {
    const cards = [...column.querySelectorAll('.task-card:not(.dragging)')];
    
    return cards.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initialize the app
loadTasks();
if (localStorage.getItem('darkMode') === 'true') {
    body.classList.add('dark-mode');
} 