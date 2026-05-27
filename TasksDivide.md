# TasksDivide.md

## Group Details

Module Code: CS6004NP  
Module Title: Application Development  
Group: 550

## Group Members

| S.N. | Name           | Role         |
|------|----------------|--------------|
| 1    | Bishwo Tiwari  | Group Leader |
| 2    | Samrat KC      | Member       |
| 3    | Piyush Khadka  | Member       |
| 4    | Prabesh Rai    | Member       |
| 5    | Kushal Pun     | Member       |

## Task Division

The project is divided in such a way that each member is responsible for a complete part of the system, including both backend and frontend work for their assigned features.

Frontend will be developed using plain HTML, CSS, and JavaScript.  
Backend will be developed using ASP.NET Core Web API with PostgreSQL.

## Member 1: Bishwo Tiwari

Assigned Area: Admin Inventory and Staff Management

### Assigned Features
- Admin can manage staff registration and roles
- Admin can perform parts management
- Admin can create purchase invoices for stock updates
- Loyalty Program: 10 percent discount if single purchase is more than 5000

### Backend Work
- Staff management API
- Product and inventory management API
- Purchase invoice API
- Loyalty discount logic in sales order calculation

### Frontend Work
- Admin staff management page
- Admin parts management page
- Admin purchase invoice page
- Loyalty discount display in invoice page

### Main Files
- ProductsController.cs
- ProductController.cs
- OrdersController.cs
- Product.cs
- ProductDtos.cs
- Order.cs
- OrderItem.cs
- OrderDtos.cs
- OrderItemDtos.cs

---

## Member 2: Samrat KC

Assigned Area: Reports and Vendor Management

### Assigned Features
- Admin can generate and view financial reports
- Admin can manage vendor details
- Staff can generate customer related reports such as regular customers, top spenders, and pending credits

### Backend Work
- Supplier CRUD API
- Financial report API for daily, monthly, and yearly reports
- Customer report API for high spenders, regular customers, and pending credits

### Frontend Work
- Admin vendor management page
- Admin financial report page
- Staff customer reports page

### Main Files
- SuppliersController.cs
- DashboardController.cs
- Supplier.cs
- SupplierDtos.cs

---

## Member 3: Piyush Khadka

Assigned Area: Customer Registration and Sales

### Assigned Features
- Staff can register new customers with vehicle details
- Staff can sell vehicle parts and create sales invoices
- Staff can view customer details, history, and vehicle info
- Staff can search customers by vehicle number, phone, ID, or name

### Backend Work
- Customer registration API
- Vehicle detail handling API
- Sales order and sales invoice API
- Customer search API
- Customer detail and history API

### Frontend Work
- Staff customer registration page
- Staff sales page
- Staff customer detail page
- Staff search customer page

### Main Files
- CustomersController.cs
- OrdersController.cs
- OrderItemController.cs
- Customer.cs
- CustomerDtos.cs
- Order.cs
- OrderItem.cs
- OrderDtos.cs
- OrderItemDtos.cs

---

## Member 4: Prabesh Rai

Assigned Area: Notifications, Email, and Customer Service Features

### Assigned Features
- Staff can send invoices via email to customers
- Customers can book appointments
- Customers can request unavailable parts
- Customers can review services
- Customers can view purchase and service history
- System automatically notifies admin for low stock
- System sends email reminders to customers with unpaid credits overdue by more than one month

### Backend Work
- Invoice email sending API
- Appointment booking API
- Part request API
- Review API
- Customer history API
- Low stock notification logic
- Overdue credit reminder email logic

### Frontend Work
- Customer appointment page
- Customer part request page
- Customer review page
- Customer history page
- Admin low stock notification page
- Email invoice option in invoice page

### Main Files
- HomeController.cs
- InfoController.cs
- CustomersController.cs
- PaymentController.cs
- ExternalServicesOptions.cs

---

## Member 5: Kushal Pun

Assigned Area: Customer Account, Authentication, Categories, and Information Pages

### Assigned Features
- Customers can self register
- Customers can manage profile and vehicle details
- Categories management
- Service center information pages
- AI based vehicle part failure prediction

### Backend Work
- Customer self registration API
- Login and authentication handling
- Profile update API
- Vehicle management API
- Category CRUD API
- AI prediction logic for possible part failure
- Information API for service center details

### Frontend Work
- Customer registration page
- Login page
- Customer profile page
- Customer vehicle management page
- Admin category page
- Home page
- About / information page
- AI prediction page

### Main Files
- CategoriesController.cs
- CustomersController.cs
- InfoController.cs
- Category.cs
- CategoryDtos.cs

---

## Milestone 1 Task Division

For Milestone 1, the group will complete at least 5 features with both backend and frontend integration.

### Member wise Milestone 1 work

| Member          | Milestone 1 Features |
|-----------------|----------------------|
| Bishwo Tiwari   | Admin parts management, Admin purchase invoices |
| Samrat KC       | Admin vendor management |
| Piyush Khadka   | Staff register new customers with vehicle details |
| Prabesh Rai     | Customer view purchase and service history |
| Kushal Pun      | Customer self register and manage profile |

This gives the group 6 completed features for Milestone 1.

---

## Final Submission Task Division

For the final submission, all remaining features will be completed by the same assigned members.

| Member          | Remaining Final Features |
|-----------------|--------------------------|
| Bishwo Tiwari   | Admin staff management, Loyalty program |
| Samrat KC       | Financial reports, Customer related reports |
| Piyush Khadka   | Staff sales invoice, Customer details and history, Customer search |
| Prabesh Rai     | Email invoice, Appointments, Part requests, Reviews, Low stock alerts, Overdue credit reminders |
| Kushal Pun      | Authentication, Categories, Info pages, AI prediction |

---

## Shared Work

The following tasks will be handled jointly by the group:

- Testing and bug fixing
- API integration between frontend and backend
- GitHub commits and version control
- Report writing
- Screenshots for documentation
- Final review and polishing

### Shared report responsibilities

| Task | Responsible Member(s) |
|------|------------------------|
| Project overview | Bishwo Tiwari |
| Features and functionalities | Samrat KC |
| ER Diagram | Samrat KC |
| UML diagrams | Piyush Khadka |
| Proof of work screenshots | Prabesh Rai |
| Deployment details | Kushal Pun |
| Individual reflections | Each member writes their own |
| Final compilation of report | Bishwo Tiwari |

---

## Working Note

Each member is responsible for both backend and frontend work of their assigned features.  
If any feature overlaps with another member's controller or model, both members will coordinate before merging changes into the main project branch.

## Submitted By

Group 550