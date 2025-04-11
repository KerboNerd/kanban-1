const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Octokit with GitHub token
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

// Helper function to convert task to GitHub issue format
function taskToIssue(task) {
    const labels = [
        task.status,
        `priority-${task.priority}`
    ];
    
    if (task.tags) {
        labels.push(...task.tags);
    }

    const body = [
        task.description || '',
        '\n\n---\n',
        `**Assignee:** ${task.assignee || 'Unassigned'}\n`,
        `**Due Date:** ${task.dueDate || 'No due date'}\n`,
        `**Created:** ${task.createdAt}\n`,
        `**Updated:** ${task.updatedAt}\n`,
        '\n**Links:**\n',
        ...(task.links || []).map(link => `- ${link}\n`)
    ].join('');

    return {
        title: task.title,
        body: body,
        labels: labels,
        assignee: task.assignee || undefined,
        due_date: task.dueDate || undefined
    };
}

// Helper function to convert GitHub issue to task format
function issueToTask(issue) {
    const metadata = issue.body.split('---')[1] || '';
    const linksMatch = metadata.match(/\*\*Links:\*\*\n([\s\S]*?)(?=\n\n|$)/);
    const links = linksMatch ? linksMatch[1].split('\n').map(link => link.trim().replace('- ', '')) : [];

    return {
        id: issue.number.toString(),
        title: issue.title,
        description: issue.body.split('---')[0].trim(),
        status: issue.labels.find(label => ['todo-list', 'in-progress-list', 'done-list'].includes(label.name))?.name || 'todo-list',
        priority: issue.labels.find(label => label.name.startsWith('priority-'))?.name.replace('priority-', '') || 'medium',
        assignee: issue.assignee?.login || '',
        dueDate: issue.due_date || '',
        tags: issue.labels.filter(label => !['todo-list', 'in-progress-list', 'done-list'].includes(label.name) && !label.name.startsWith('priority-')).map(label => label.name),
        links: links,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
    };
}

// Get all tasks
app.get('/tasks', async (req, res) => {
    try {
        const { data: issues } = await octokit.issues.listForRepo({
            owner: OWNER,
            repo: REPO,
            state: 'all'
        });
        
        const tasks = issues.map(issueToTask);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create a new task
app.post('/tasks', async (req, res) => {
    try {
        const issueData = taskToIssue(req.body);
        const { data: issue } = await octokit.issues.create({
            owner: OWNER,
            repo: REPO,
            ...issueData
        });
        
        res.json(issueToTask(issue));
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
    try {
        const issueData = taskToIssue(req.body);
        const { data: issue } = await octokit.issues.update({
            owner: OWNER,
            repo: REPO,
            issue_number: parseInt(req.params.id),
            ...issueData
        });
        
        res.json(issueToTask(issue));
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete a task (close the issue)
app.delete('/tasks/:id', async (req, res) => {
    try {
        await octokit.issues.update({
            owner: OWNER,
            repo: REPO,
            issue_number: parseInt(req.params.id),
            state: 'closed'
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

module.exports.handler = serverless(app); 