# Ecowater Inventory Revisited

## Purpose
The purpose of this web application is to help track weekly and monthly inventory numbers in a more accurate, efficient and easier manner. The essential function of the application is to display spreadsheet numbers and reports on hand. This can be achieved through clean inputs of data that are tracked everyday and loaded into the system.

Then, we would compare those clean inputs with reported use of items and put those numbers side by side with in-person inventory counts. These actions would lead to real time updates, inventory tracking and on-hand reports.

Multiple people must be able to handle inputs. Ideally, users with logins will help keep data safe and logged efficiently. It should be able to log updates with timestamps and user stamps. It should be able to display weekly and monthly reports with accurate data.

---

## Elicitation Techniques
The main elicitation techniques were 1 on 1 interviews with Anton, Kris, Liz and Myrian. Each person runs a department and has their own needs from the system.

These interviews have been conducted at separate times spanning from September 2025 to the present (March 2026). I have not recorded dates/times at this point besides today. I will note I have had multiple meetings with each person that provided valuable information.

### List of Meetings (Recorded)
- **3/6/2026** — Meeting with Myrian over updated requirements for the system. Used to reevaluate client needs.

---

## Functional Requirements

1. Users must be able to create a login using email and password.  
2. There will be roles for users such as admins and staff.  
3. The system will allow creating inventory items.  
4. The system will allow editing inventory items and their attributes.  
5. The system will allow deletion of inventory items.  
6. The system will allow inventory search, sort, and filter.  

---

### Inventory Item Attributes
Inventory items will contain the following attributes:

- itemID  
- itemName  
- quantity  
- category of use  
- SKU (if applicable)  
- sourced from  
- last updated timestamp  
- itemLocation  

7. The system will allow users and admins to update stock, increase or decrease.  
8. The system will allow users to see what items are low in stock.  
9. The system will have a log of all updates that are timestamped and associated with a user.  

---

## Non-Functional Requirements

1. The system’s search function should respond within two seconds.  
2. The system will support up to 5 concurrent users.  
3. The system will have a simple UI that is user friendly. Compact and practical.  
4. The system will allow users to perform meaningful actions in less than 3 clicks.  
5. The system will prevent data loss during a crash.  
6. The system will maintain data through updates.  
7. The system shall encrypt passwords.  
8. The system will require authentication for certain actions depending on role.  
9. The system will prevent unauthorized access.  
10. The system will be scalable and modular.  

---

## Features
*(To be defined)*

---

## Architectural Design

The chosen architectural design shall be a layered architecture.

The system will comprise of three layers:
- User Interface (UI)  
- Backend (Business Logic)  
- Database

---

## Tech Stack

---

## Future Improvements
