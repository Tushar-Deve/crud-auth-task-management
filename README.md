# CRUD Auth Task Management System

A full-stack task management application built with **Next.js, React, Node.js, Express.js, and SQL database**. The application provides secure user authentication, task management, role-based panels, and task assignment functionality.

## 🚀 Live Demo

**Frontend:**
https://crud-auth-task-management.vercel.app/

**Backend:**
https://crud-auth-task-management.onrender.com/

## ✨ Features

### 🔐 Authentication

* User registration
* Registration OTP verification
* User login
* JWT-based authentication
* Logout
* Forgot password
* Reset password
* Change password
* Protected routes
* Session/token expiry handling

### 📋 Task Management

* Create tasks
* View tasks
* Update tasks
* Delete tasks
* Assign tasks to users
* View assigned tasks
* Task details
* Task status management
* Task priority
* Due dates

### 👤 User Panel

* User dashboard
* My Tasks
* Task details
* Profile management
* Change password
* Session management

### 🛠️ Admin Panel

* Admin dashboard
* User/task management
* Task assignment
* Profile/settings management

### 📎 Additional Features

* File attachment support
* REST API architecture
* Authentication middleware
* API request handling with Axios
* Rate limiting for authentication-related endpoints
* CORS configuration
* Environment variable configuration

## 🧑‍💻 Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Axios
* Lucide React

### Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Multer
* Express Rate Limit

### Database

* SQL Database

### Tools & Deployment

* Git
* GitHub
* VS Code
* Postman
* Vercel
* Render

## 🏗️ Project Architecture

```text
CRUD Auth Task Management
│
├── Frontend
│   ├── Authentication
│   ├── Admin Panel
│   ├── User Panel
│   ├── Task Management
│   └── Profile & Settings
│
└── Backend
    ├── Routes
    ├── Controllers
    ├── Middleware
    ├── Authentication
    ├── Task Management
    ├── File Uploads
    └── Database
```

## 🔑 Authentication Flow

```text
User
  ↓
Register
  ↓
OTP Verification
  ↓
Login
  ↓
JWT Access Token
  ↓
Protected APIs
  ↓
User/Admin Dashboard
```

## 📌 Main API Modules

| Module         | Description                                      |
| -------------- | ------------------------------------------------ |
| Authentication | Registration, login, logout, password management |
| Users          | User profile and account operations              |
| Tasks          | Create, read, update and delete tasks            |
| Assignment     | Assign tasks between users                       |
| Attachments    | Upload and manage task files                     |

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

### 4. Configure environment variables

Create the required `.env` files for the frontend and backend.

Example:

```env
NEXT_PUBLIC_API_URL=YOUR_BACKEND_URL
```

Add the remaining backend environment variables required by the application.

### 5. Start the backend

```bash
npm run dev
```

### 6. Start the frontend

```bash
cd ../client
npm run dev
```

The frontend will run locally on:

```text
http://localhost:3000
```

## 🔒 Security

The application implements several security-related practices:

* JWT-based authentication
* Protected API routes
* Authentication middleware
* Password management
* Rate limiting
* CORS configuration
* Environment variables for sensitive configuration
* Token expiry/session handling

## 📱 Responsive Interface

The application is designed to provide a responsive interface across desktop and mobile screen sizes.

## 📈 Future Improvements

* Refresh token based authentication
* Advanced task filtering and search
* Task notifications
* Activity/history tracking
* Improved role and permission management
* Automated testing
* CI/CD pipeline

## 👨‍💻 Author

**Tushar**

Computer Science Student & Full-Stack Developer

### Technologies

`JavaScript` `TypeScript` `React` `Next.js` `Node.js` `Express.js` `SQL` `Tailwind CSS` `Git` `GitHub`

---

⭐ If you find this project useful, consider giving the repository a star.
