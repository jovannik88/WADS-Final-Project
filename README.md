## Final Project – Web Application Development and Security

Course Code: COMP6703001


Course Name: Web Application Development and Security


Institution: BINUS University International

Class : L4CC

Group Members :

| Name |Student ID |Github Username|
|-----------|-----------|-----------|
| Jovan Nikholas| 2902641811 | jovannik88| 
| Lyonnel Judson Saputra | 2802505853| LyonelJS|
| MANJAKAMANANA MAMY JEAN |2902639832| Mamy32| 


##

**Project Overview**

Project Title: Study planner and productivity tracker


The purpose of this project is to help students plan their study sessions by organizing assignments and test deadline reminders that can be viewed directly in their calendar. Every completed or accomplished task will be tracked in a dashboard, allowing students to monitor their progress and productivity.

This web application will also include a notification feature that reminds users about upcoming deadlines and important reminders.

Additionally, the program will include two AI-powered functions designed to help students determine which tasks they should prioritize. These AI features will assist in organizing student schedules and improving task prioritization.

## AI Integration Layer

The AI Integration Layer is part of the back-end service layer and includes the following intelligent features:

---

### Smart Task Prioritization

This AI feature determines which task should be completed first based on several key parameters:

- **Importance**  
  The weight of the task, such as how impactful it is toward the final grade.

- **Urgency**  
  How close the task is to its deadline.

- **Effort**  
  The level of difficulty required to complete the task.

- **Dependency**  
  Whether completing a task is required before starting or finishing other tasks.

The AI evaluates these parameters to generate a prioritized task list. The results will be displayed on the frontend of the web application.

#### AI Model
This feature will use **Gemini API** or other **LLM-based APIs**. LLMs allow users to describe task parameters using natural language, making prioritization more accurate and personalized.

---

### Study Schedule Optimization

This AI feature helps students generate the most optimal study schedule by analyzing three main factors:

- **Hard Blocks**  
  Fixed activities that cannot be changed, such as classes or mandatory events.

- **Tasks**  
  Assignments, projects, or study activities that need to be completed.

- **Energy Levels**  
  Identifies when the user is most productive (e.g., morning or night).

The AI processes these factors to create an optimized study schedule, which will be displayed on the frontend of the web application.

#### AI Model
This feature will also use **Gemini API** or other **LLM-based APIs**. By allowing users to describe their productivity habits and preferences in natural language, the AI can generate more realistic and personalized schedules.


##


## System Architecture

### 3.1 Front-end layer (Next.js)

Basically, the front-end is built using next.js react framework and is responsible for:

- rendering the user interface such as dashboard,study planer, task forms etc…
- communicating with the back-end (Node.js)
- displaying Ai-generated recommendation and classifications.

The Front End, will get the data from the Backend Layer by fetching it

This front-end does not directly access the database and Ai services, all interactions are handled across secure back-end API.

---

### 3.2 Back-end layer (Node.js)

The back-end is implemented using node.js and follows a Restful API architecture.

Responsibilities include:

- Handling HTTP requests (GET, POST, PUT, DELETE)
- Authentication using JWT
- Authorization with role-based access control
- Business logic implementation
- Input validation and output sanitization
- Secure interaction with the database using Prisma
- Orchestration of AI services

The Backend is acting as a Database Management System (DBMS), the function is to utilize database data to be displayed in the front end.

---

### 3.3 Database layer (PostgresSQL with prisma)

The database layer uses PostgresSQL with prisma ORM

Responsibilities include:

- For storing the users, study tasks, study sessions and productivity logs
- Secure database access restricted to the back-end only
- Enforcing relational data integrity




