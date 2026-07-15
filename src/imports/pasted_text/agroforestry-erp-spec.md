# FAIRVENTURES AGROFORESTRY

## Integrated Procurement, Inventory & Finance Management System

Create a professional enterprise ERP-style web application for Fairventures Agroforestry.

This is NOT just a dashboard.

Design a realistic business system that follows actual operational workflow used by procurement, finance, and operational teams.

Visual style:

* Enterprise ERP
* SAP inspired
* Oracle ERP inspired
* Microsoft Dynamics inspired
* Modern clean UI
* Professional business software
* Real workflow-based system
* Production-ready design

Branding:
Fairventures Agroforestry
Integrated Operations System

Remove modules:

* Warehouse
* Map Monitoring

Sidebar Menu:

* Dashboard
* Procurement
* Inventory Control
* Distribution
* Financial
* Reports
* Settings

---

# PROCUREMENT MODULE

Procurement contains 3 main modules:

1. Purchase Request (PR)
2. Purchase Order (PO)
3. Payment Request (PayReq)

Display them as tabs inside Procurement.

---

# PURCHASE REQUEST (CRUD)

IMPORTANT:
This page must follow actual company Purchase Request template.

---

## Purchase Request List Page

Show:

* PR Number
* Company
* Request Date
* Required Date
* Total Amount
* Status
* Requester
* Current Approver

Actions:

* Create PR
* View
* Edit
* Delete
* Duplicate
* Export PDF

Status:

* Draft
* Waiting Manager Approval
* Waiting Finance Acknowledge
* Approved
* Rejected
* Revision Required

---

## Create Purchase Request Page

### Header Information

Fields:

* PR Number (Auto Generate)
* Company
* Request Date
* Date of Items Required

---

### Item Detail Table

Columns:

* Budget Code
* Description of Goods / Services
* Unit(s)
* Quantity
* Unit Cost (Estimate)
* Total Cost

Features:

* Add Item Row
* Edit Row
* Delete Row
* Auto Calculate Total

Formula:

Quantity × Unit Cost = Total Cost

Grand Total automatically calculated.

---

### Attachment Section

Allow uploads:

* Product Photos
* Quotation Files
* PDF Documents
* Excel Files
* Supporting Documents

Display preview cards.

---

### Approval Workflow Section

Requested By

Fields:

* Name
* Job Position
* Date
* Note
* Status

Approved By (Manager Project)

Fields:

* Name
* Job Position
* Date
* Note
* Status

Acknowledged By (Finance)

Fields:

* Name
* Job Position
* Date
* Note
* Status

Approval buttons:

* Approve
* Reject
* Request Revision

---

### Activity Timeline

Show chronological history:

* PR Created
* Manager Approved
* Finance Acknowledged
* Revision Requested
* Sent to Procurement

Include user, date, and note.

---

# PURCHASE ORDER (CRUD)

IMPORTANT:

One Purchase Request can create multiple Purchase Orders because procurement may purchase from multiple vendors.

Example:

PR-001

PO-001 Vendor A

PO-002 Vendor B

PO-003 Vendor C

Visualize relationship clearly.

---

## Purchase Order List

Columns:

* PO Number
* Related PR
* Vendor
* Project
* Total Amount
* Status

Actions:

* Create PO
* View
* Edit
* Delete
* Print
* Export PDF

---

## Create Purchase Order

### Header

Fields:

* Program / Project
* Cost Code
* Vendor
* PO Number
* Order Date
* Due Date

---

### Item Table

Columns:

* Budget Code
* Description of Goods / Services
* Unit
* Quantity
* Unit Cost
* Total Cost

Auto calculate totals.

---

### Reference Section

Display:

* Related PR
* PR Number
* Link to Original PR

---

### Vendor Documents

Upload:

* Vendor Quotation
* Contract
* Agreement
* Vendor Proposal

---

### Approval Section

Requested By

Approved By

Acknowledged By

Each includes:

* Name
* Position
* Date
* Note
* Status

---

### Activity Timeline

Display:

* PO Created
* Vendor Assigned
* Approved
* Sent to Vendor
* Goods Received

---

# PAYMENT REQUEST (CRUD)

IMPORTANT:

Follow actual company Payment Request template.

---

## Payment Request List

Columns:

* PayReq Number
* Related PO
* Vendor
* Amount
* Due Date
* Status

Actions:

* Create
* View
* Edit
* Delete
* Export PDF

---

## Create Payment Request

### Header

Fields:

* Entity / Project
* Project Code
* Reason of Payment
* Person In Charge
* Date / Duration of Activity
* Estimated Payment Date
* Released Payment Date

---

### Payment Information

Fields:

* Request Type
* Reference Number
* Amount
* Bank Name
* Bank Account
* Beneficiary Name

---

### Attachment Section

Create 3 upload categories:

#### Product Evidence

* Product Photos
* Delivery Photos

#### Invoice

* Invoice Image
* Invoice PDF

#### Supporting Documents

* PO Document
* Quotation
* Tax Document
* Receipt
* Contract

Display previews.

---

### Approval Workflow

Requested By

Approved By

Acknowledged By

Fields:

* Name
* Position
* Date
* Note
* Status

Buttons:

* Approve
* Reject
* Return for Revision

---

### Activity Timeline

Display:

* PayReq Created
* Finance Review
* Director Approval
* Payment Released

---

# INVENTORY CONTROL

Inventory must be connected to Procurement.

Business Rules:

When PO is received:
Stock automatically increases.

When Distribution is created:
Stock automatically decreases.

---

## Inventory List

Columns:

* Item Code
* Item Name
* Category
* Current Stock
* Minimum Stock
* Unit

Actions:

* Create
* Edit
* Delete
* Stock Adjustment
* Stock Opname

---

## Stock Alerts

Show:

* Critical Stock
* Reorder Required
* Overstock

Examples:

"Stock NPK almost depleted"

"Reorder KCL immediately"

---

# DISTRIBUTION MODULE

Operational team distributes materials to farmers.

---

## Create Distribution

Fields:

* Distribution Number
* Farmer
* Area
* Commodity
* Item
* Quantity
* Distribution Date
* Notes

Attachments:

* Distribution Evidence
* Delivery Photos

Business Rule:

Submitting distribution automatically reduces stock.

---

# DASHBOARD

Dashboard must show real operational data.

Top KPI Cards:

* Total Purchase Requests
* Active Purchase Orders
* Pending Payment Requests
* Incoming Stock
* Critical Stock Items
* Distribution Activities

---

## Procurement Workflow Visualization

Operational Request

↓

Procurement Review

↓

Vendor Selection

↓

Purchase Order

↓

Payment Request

↓

Finance Approval

↓

Delivery

---

## Procurement Analytics

Charts:

* Monthly Purchases
* Purchase by Supplier
* Purchase by Category
* Vendor Performance
* Procurement Lead Time

---

## Inventory Analytics

Charts:

* Stock In vs Stock Out
* Critical Stock Items
* Top Consumed Items

---

## Financial Summary

Cards:

* Total Procurement Cost
* Outstanding Payments
* Payments This Month
* Budget Utilization

---

# REPORTS MODULE

Create a dedicated Finance & Procurement Reporting Center.

---

## Finance Reports

* General Journal
* General Ledger
* Trial Balance
* Profit & Loss
* Balance Sheet
* Cash Flow Statement

---

## Procurement Reports

* Monthly Purchase Report
* Purchase by Supplier
* Purchase by Category
* Vendor Performance Report
* Procurement Lead Time Report

---

## Payment Reports

* Supplier Payment Report
* Payment History
* Outstanding Payments
* Overdue Payments

---

# NOTIFICATION CENTER

Show:

* Stock Almost Empty
* Procurement Overdue
* Payment Due Soon
* Approval Waiting
* Delivery Delayed

---

# FINAL DESIGN GOAL

The system must feel like a real enterprise ERP platform used by Procurement, Finance, Inventory, and Operational teams.

All pages must be designed with complete CRUD functionality, approval workflows, attachment management, activity timelines, status tracking, and integrated dashboard analytics.

This is not a concept dashboard. It should look like a real production-ready business system.
