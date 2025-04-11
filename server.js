require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Octokit } = require('octokit');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
        `- **Due Date**: ${task.dueDate || 'No due date'}`,
        `- **Created At**: ${task.createdAt}`,
        `- **Updated At**: ${task.updatedAt}`,
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
            metadata[key.replace('-', '')] = value;
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
        assignee: metadata.Assignee,
        dueDate: metadata.DueDate,
        tags: tags,
        links: links,
        createdAt: metadata.CreatedAt,
        updatedAt: metadata.UpdatedAt
    };
}

// Routes
app.get('/api/tasks', async (req, res) => {
    try {
        const response = await octokit.rest.issues.listForRepo({
            owner: OWNER,
            repo: REPO,
            state: 'all'
        });

        const tasks = response.data.map(issueToTask);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
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