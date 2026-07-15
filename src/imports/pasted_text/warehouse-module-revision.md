WAREHOUSE MODULE REVISION ONLY

IMPORTANT

DO NOT MODIFY ANY EXISTING MODULES.

DO NOT CHANGE:

* Dashboard
* Procurement Module
* Purchase Requests
* Procurement Evaluation (BES)
* Purchase Orders
* Payment Requests
* Vendor Master
* Finance Module
* Reports Module
* Existing Navigation Structure

All existing pages and workflows are already approved.

This revision ONLY focuses on the Warehouse Module.

====================================================
WAREHOUSE MODULE UPDATE
=======================

Rename:

Goods Receiving
or
Goods Receiving Note (GRN)

TO:

Stock In

Reason:

Stock In is easier to understand by Operational, Warehouse, Procurement, and Project Teams.

====================================================
WAREHOUSE MENU
==============

Warehouse

├── Dashboard
├── Stock In
├── Inventory
├── Distribution
├── Stock Card
├── Stock Opname
├── Reorder Monitoring
└── Reports

====================================================
STOCK IN MODULE
===============

Purpose:

Record incoming goods into warehouse inventory.

Stock will automatically increase after Stock In is submitted.

====================================================
STOCK IN HEADER
===============

Stock In Number

Stock In Date

Warehouse Location

Received By

Remarks

====================================================
SOURCE DOCUMENT
===============

Support real-world procurement scenarios.

Create dropdown:

Source Type

Options:

• Purchase Order (PO)
• Payment Request (PayReq)

Reason:

Sometimes goods arrive before payment is completed.

Sometimes goods arrive after payment is completed.

Warehouse must support both conditions.

====================================================
SELECT DOCUMENT
===============

After Source Type selection:

Display searchable dropdown.

Examples:

PO-001

PO-002

PayReq-001

PayReq-002

====================================================
AUTO LOAD ITEM INFORMATION
==========================

When a source document is selected:

Automatically load all item information.

Display table:

Item Name

Unit

Document Quantity

Previously Received Quantity

Remaining Quantity

Received Quantity

====================================================
PARTIAL RECEIVING
=================

Support partial receiving.

Example:

PO Quantity:
2,000 Kg

Received Today:
1,500 Kg

Status:
Partial

Remaining:
500 Kg

System must allow future Stock In transactions until quantity is fully received.

====================================================
RECEIVING STATUS
================

Status options:

Complete

Partial

====================================================
PHOTO DOCUMENTATION
===================

Add mandatory warehouse documentation section.

Title:

Photo Documentation

Purpose:

Provide evidence that goods were physically received.

Support multiple image uploads.

Examples:

Photo of delivered goods

Photo of fertilizer sacks

Photo of pesticide containers

Photo during unloading process

Photo of received quantity

Display image preview after upload.

====================================================
DELIVERY INFORMATION
====================

Additional fields:

Delivery Note Number

Supplier Delivery Date

Vehicle Number (Optional)

Warehouse Notes

====================================================
RELATED DOCUMENTS
=================

Display related documents as read-only information.

Examples:

PR-001

PO-001

PayReq-001

Purpose:

Document traceability only.

Warehouse users do not need to manage Procurement or Finance processes.

====================================================
INVENTORY INTEGRATION
=====================

After Stock In submission:

Inventory automatically increases.

Create automatic stock movement records.

Example:

+2,000 Kg NPK

Reference:
Stock In #SI-001

====================================================
INVENTORY MODULE
================

Do not allow manual stock editing.

Inventory must be calculated automatically from:

Total Stock In
minus
Total Distribution

====================================================
DISTRIBUTION MODULE
===================

Purpose:

Record stock issued from warehouse.

Inventory automatically decreases.

====================================================
DISTRIBUTION HEADER
===================

Distribution Number

Distribution Date

Area

Village

Project

Farmer Group

Operational PIC

Remarks

====================================================
DISTRIBUTION ITEM TABLE
=======================

Item

Current Stock

Unit

Quantity Out

Remaining Stock

====================================================
DISTRIBUTION DESTINATION
========================

Support:

Farmer

Farmer Group

Project Site

Field Team

====================================================
STOCK CARD
==========

Display complete inventory movement history.

Date

Transaction Type

Reference Number

Stock In

Stock Out

Balance

====================================================
STOCK OPNAME
============

Compare:

System Stock

vs

Physical Stock

Display stock differences and adjustment status.

====================================================
REORDER MONITORING
==================

Monitor items below minimum stock.

Display:

Current Stock

Minimum Stock

Shortage

Status

Action Button:
Create Purchase Request

====================================================
DESIGN REQUIREMENTS
===================

Keep existing ERP design style.

Do NOT redesign Procurement.

Do NOT redesign Dashboard.

Do NOT redesign Finance.

Only add and improve Warehouse Module.

Warehouse must integrate with Procurement but must not modify Procurement workflows.

Maintain consistent UI, colors, cards, tables, spacing, and navigation with the current Fairventures Agroforestry system.
