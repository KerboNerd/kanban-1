require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Octokit } = require('octokit');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Debug logs
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '***' : 'Not found');
console.log('GITHUB_OWNER:', process.env.GITHUB_OWNER);
console.log('GITHUB_REPO:', process.env.GITHUB_REPO);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));  // Serve static files from current directory

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize Octokit
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Constants
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

// Helper function to convert task to GitHub issue format
function taskToIssue(task) {
    const labels = [
        `status:${task.status.replace('-list', '')}`,
        `priority:${task.priority}`
    ];

    if (task.tags && task.tags.length > 0) {
        labels.push(...task.tags.map(tag => `tag:${tag}`));
    }

    const body = [
        task.description || '',
        '',
        '### Metadata',
        `- **Assignee**: ${task.assignee || 'Unassigned'}`,
        `- **Assigned To**: ${task.assignedTo || 'Unassigned'}`,
        `- **Due Date**: ${task.dueDate || 'No due date'}`,
        `- **Created At**: ${task.createdAt || new Date().toISOString()}`,
        `- **Updated At**: ${new Date().toISOString()}`,
        '',
        '### Links',
        ...(task.links || []).map(link => `- ${link}`)
    ].join('\n');

    return {
        title: task.title,
        body: body,
        labels: labels
    };
}

// Helper function to convert GitHub issue to task format
function issueToTask(issue) {
    const labels = issue.labels.map(label => label.name);
    const status = labels.find(label => label.startsWith('status:'))?.replace('status:', '') || 'todo';
    const priority = labels.find(label => label.startsWith('priority:'))?.replace('priority:', '') || 'medium';
    const tags = labels
        .filter(label => label.startsWith('tag:'))
        .map(label => label.replace('tag:', ''));

    const bodyLines = issue.body.split('\n');
    const metadata = {};
    let links = [];
    let description = '';

    let currentSection = 'description';
    for (const line of bodyLines) {
        if (line.startsWith('### Metadata')) {
            currentSection = 'metadata';
            continue;
        }
        if (line.startsWith('### Links')) {
            currentSection = 'links';
            continue;
        }

        if (currentSection === 'description' && line.trim()) {
            description += line + '\n';
        }
        if (currentSection === 'metadata' && line.includes(':')) {
            const [key, value] = line.split(':').map(s => s.trim());
            const cleanKey = key.replace(/-|\*|\s/g, '').toLowerCase();
            const cleanValue = value.replace(/\*|\s/g, '');
            metadata[cleanKey] = cleanValue === 'Noduedate' ? null : cleanValue;
        }
        if (currentSection === 'links' && line.trim()) {
            links.push(line.replace('-', '').trim());
        }
    }

    return {
        id: issue.number.toString(),
        title: issue.title,
        description: description.trim(),
        status: `${status}-list`,
        priority: priority,
        assignee: metadata.assignee,
        assignedTo: metadata.assignedto,
        dueDate: metadata.duedate,
        tags: tags,
        links: links,
        createdAt: metadata.createdat,
        updatedAt: metadata.updatedat
    };
}

// Routes
app.get('/api/tasks', async (req, res) => {
    try {
        console.log('Fetching tasks from GitHub...');
        console.log('Using owner:', OWNER);
        console.log('Using repo:', REPO);
        
        const response = await octokit.rest.issues.listForRepo({
            owner: OWNER,
            repo: REPO,
            state: 'all'
        });

        console.log('GitHub API response:', response.status);
        console.log('Number of issues:', response.data.length);
        console.log('First issue labels:', response.data[0]?.labels);
        
        const tasks = response.data.map(issueToTask);
        console.log('Converted tasks:', tasks);
        
        res.json(tasks);
    } catch (error) {
        console.error('Detailed error fetching tasks:', {
            message: error.message,
            status: error.status,
            response: error.response?.data,
            headers: error.response?.headers
        });
        res.status(500).json({ 
            error: 'Failed to fetch tasks',
            details: error.message 
        });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const issue = taskToIssue(req.body);
        const response = await octokit.rest.issues.create({
            owner: OWNER,
            repo: REPO,
            ...issue
        });

        const task = issueToTask(response.data);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const issue = taskToIssue(req.body);
        const response = await octokit.rest.issues.update({
            owner: OWNER,
            repo: REPO,
            issue_number: parseInt(req.params.id),
            ...issue
        });

        const task = issueToTask(response.data);
        res.json(task);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await octokit.rest.issues.update({
            owner: OWNER,
            repo: REPO,
            issue_number: parseInt(req.params.id),
            state: 'closed'
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 