WAREHOUSE MODULE REDESIGN (SIMPLIFIED VERSION)

IMPORTANT

This task ONLY updates the Warehouse Module.

DO NOT MODIFY:

* Dashboard (Main Dashboard)
* Procurement Module
* Purchase Request (PR)
* BES
* Purchase Order (PO)
* Payment Request (PayReq)
* Finance Module
* Reports Module
* Existing Procurement Workflow
* Existing Navigation Outside Warehouse

Keep all existing modules unchanged.

====================================================
WAREHOUSE MODULE OBJECTIVE
==========================

The Warehouse module should be simple, practical, and easy for Operational and Warehouse users.

Avoid creating too many menus.

Focus on:

* Stock Monitoring
* Stock In
* Stock Out
* Stock Tracking
* Low Stock Alerts

====================================================
WAREHOUSE MENU STRUCTURE
========================

Warehouse

├── Dashboard
└── Stock Management

====================================================
WAREHOUSE DASHBOARD
===================

Purpose:

Provide a quick overview of inventory conditions.

====================================================
TOP KPI CARDS
=============

Display:

1. Total Items
   Total active inventory items.

Example:
45 Items

---

2. Total Stock Quantity

Example:
25,000 Kg

---

3. Stock In This Month

Example:
12,500 Kg

---

4. Stock Out This Month

Example:
9,800 Kg

---

5. Low Stock Items

Example:
4 Items

---

6. Pending Distributions

Example:
3 Requests

====================================================
STOCK MOVEMENT CHART
====================

Monthly chart comparison:

Stock In
vs
Stock Out

Display monthly movement trends.

====================================================
LOW STOCK ALERT PANEL
=====================

Show items below minimum stock.

Example:

NPK
Current Stock: 200 Kg
Minimum Stock: 500 Kg

Status:
Reorder Required

---

KCL
Current Stock: 300 Kg
Minimum Stock: 500 Kg

Status:
Low Stock

====================================================
RECENT STOCK ACTIVITY
=====================

Display latest inventory movements.

Example:

+2,000 Kg NPK
Stock In

---

-500 Kg NPK
Distribution

---

+100 Liter Herbicide
Stock In

====================================================
STOCK MANAGEMENT
================

Use tabs.

Tabs:

1. Stock List
2. Stock In
3. Stock Out

====================================================
TAB 1 - STOCK LIST
==================

Purpose:

View all inventory.

Table Columns:

Item Code

Item Name

Category

Unit

Current Stock

Minimum Stock

Status

Last Updated

====================================================
STOCK STATUS
============

Normal

Low Stock

Out of Stock

====================================================
ITEM DETAIL VIEW
================

When user clicks an item:

Display:

Item Information

Current Stock

Minimum Stock

Stock Movement History

Last Stock In

Last Stock Out

====================================================
STOCK CALCULATION
=================

DO NOT allow manual editing of Current Stock.

Current Stock must be automatically calculated:

Current Stock

=

Total Stock In

*

Total Stock Out

Example:

NPK

Total Stock In:
2,000 Kg

Total Stock Out:
500 Kg

Current Stock:
1,500 Kg

====================================================
TAB 2 - STOCK IN
================

Purpose:

Record incoming inventory.

====================================================
HEADER INFORMATION
==================

Stock In Number

Stock In Date

Warehouse Location

Received By

Remarks

====================================================
SOURCE DOCUMENT
===============

Dropdown:

Source Type

Options:

* Purchase Order (PO)
* Payment Request (PayReq)

Purpose:

Support situations where goods arrive before payment or after payment.

====================================================
DOCUMENT SELECTION
==================

Searchable dropdown.

Examples:

PO-2026-001

PO-2026-002

PayReq-2026-010

====================================================
AUTO LOAD ITEMS
===============

After selecting document:

Automatically display items from selected document.

====================================================
ITEM TABLE
==========

Item Name

Unit

Document Quantity

Previously Received Quantity

Remaining Quantity

Received Quantity

Item Condition

Remarks

====================================================
ITEM CONDITION
==============

Dropdown:

* Good
* Damaged
* Partially Damaged
* Expired
* Wrong Item
* Quantity Shortage
* Quantity Excess
* Pending Inspection

If condition is not "Good"

Remarks becomes mandatory.

====================================================
PHOTO DOCUMENTATION
===================

Upload multiple images.

Examples:

* Product photos
* Fertilizer sacks
* Pesticide containers
* Unloading process
* Warehouse receiving evidence

Show image preview.

====================================================
DELIVERY INFORMATION
====================

Delivery Note Number

Supplier Delivery Date

Vehicle Number

Warehouse Notes

====================================================
RELATED DOCUMENTS
=================

Display read-only traceability.

Examples:

PR-2026-041

PO-2026-067

PayReq-2026-022

Purpose:

Transaction tracking only.

====================================================
PARTIAL RECEIVING
=================

Support partial receiving.

Example:

Document Quantity:
2,000 Kg

Received:
1,500 Kg

Remaining:
500 Kg

Status:
Partial

====================================================
TAB 3 - STOCK OUT
=================

Purpose:

Record distribution and inventory usage.

====================================================
HEADER INFORMATION
==================

Distribution Number

Distribution Date

Requested By

Operational PIC

Remarks

====================================================
DESTINATION INFORMATION
=======================

Distribution To:

* Farmer
* Farmer Group
* Project Site
* Field Team
* Operational Team

====================================================
ITEM TABLE
==========

Item Name

Current Stock

Unit

Quantity Out

Remaining Stock

====================================================
VALIDATION
==========

Quantity Out cannot exceed Current Stock.

System must automatically prevent negative inventory.

====================================================
AUTO STOCK UPDATE
=================

After Stock Out submission:

Inventory automatically decreases.

====================================================
WAREHOUSE BUSINESS RULES
========================

1. Current Stock is always calculated automatically.

2. Stock In increases inventory.

3. Stock Out decreases inventory.

4. No manual stock adjustments.

5. Low stock alerts appear automatically when Current Stock is below Minimum Stock.

6. Warehouse only manages inventory movement.

7. Procurement and Finance workflows remain unchanged.

====================================================
DESIGN REQUIREMENTS
===================

Maintain existing ERP design style.

Use the same colors, typography, cards, tables, spacing, and navigation already used in the system.

Do not redesign Procurement.

Do not redesign Finance.

Do not redesign Dashboard.

Only improve and simplify Warehouse Module.
