// js/tasks.js - Agentic Task Management System
export class TaskManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.tasks = [];
        this.container = document.getElementById(containerId);
    }

    // Create a new task
    addTask(description) {
        const task = {
            id: this.tasks.length + 1,
            description,
            status: 'pending' // pending, in_progress, completed
        };
        this.tasks.push(task);
        this.render();
        return task.id;
    }

    // Update task status
    updateTaskStatus(id, status) {
        const task = this.tasks.find(t => t.id === parseInt(id));
        if (task) {
            task.status = status;
            this.render();
        }
    }

    // Clear all tasks
    clearTasks() {
        this.tasks = [];
        this.render();
    }

    // Render the task list to the UI
    render() {
        if (!this.container) return;

        if (this.tasks.length === 0) {
            this.container.classList.add('hidden');
            return;
        }

        this.container.classList.remove('hidden');

        this.container.innerHTML = `
            <div class="task-panel-header">
                <span>Mission Progress</span>
                <button class="close-tasks" onclick="window.taskManager.clearTasks()">✕</button>
            </div>
            <div class="task-list">
                ${this.tasks.map(task => `
                    <div class="task-item ${task.status}">
                        <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}">
                            ${task.status === 'completed' ? '✓' : ''}
                        </div>
                        <div class="task-content">
                            <span class="task-text">${task.description}</span>
                            ${task.status === 'in_progress' ? '<span class="task-loader"></span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}
