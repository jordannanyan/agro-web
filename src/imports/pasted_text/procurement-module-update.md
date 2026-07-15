UPDATE EXISTING PROCUREMENT MODULE

IMPORTANT:

Do NOT redesign the Procurement Dashboard from scratch.

Keep the current Procurement Dashboard layout, workflow visualization, KPI cards, tabs, and overall design.

Maintain the existing workflow section exactly as the current design:

Operational Team
→ Procurement Review
→ Vendor Selection
→ Purchase Order
→ Payment Request
→ Finance Approval
→ Purchase & Delivery

Keep the existing enterprise UI style.

Only enhance and expand the existing Procurement module with more realistic ERP functionality.

====================================================
PURCHASE REQUEST (CREATE PR)
============================

Follow actual Fairventures Agroforestry business process.

PR is created by Operational Team.

Procurement only receives and processes approved Purchase Requests.

Create a dedicated "Create Purchase Request" page.

Header Information:

PR Number (Auto Generate)

Format:

NO/COMPANY-PR/MONTH/YEAR

Example:

001/PT.SNBS-PR/VII/2026

Company Dropdown:

* PT Sumatra Nature Based Solutions (SNBS)
* PT Jambi Nature Based Solutions (JNBS)

Request Date

Date of Items Required

====================================================
ITEM DETAIL TABLE
=================

Columns:

Budget Code
Description of Goods / Services
Unit(s)
Quantity
Unit Cost (Estimate)
Total Cost

Budget Code Dropdown:

* 1_Investment
* 2_Labor
* 3_Material
* 4_Upkeep
* 5_Personel
* 6_Rent

Unit(s) Dropdown:

* Kg
* Gram
* Ton
* Liter
* Ml
* Pcs
* Box
* Pack
* Roll
* Sack
* Bottle
* Drum
* Meter
* Unit
* Set
* Trip
* Lot
* Service
* Lump Sum

Features:

* Add Row
  Edit Row
  Delete Row

Auto Calculation:

Quantity × Unit Cost

Display Grand Total.

====================================================
ATTACHMENTS
===========

Upload:

* Product Photo
* Supporting Documents
* Quotation
* Excel
* PDF

Show preview cards.

====================================================
APPROVAL SECTION
================

Requested By

Fields:

* Name
* Job Position
* Date
* Note

Approved By (Project Manager)

Fields:

* Name
* Job Position
* Date
* Note

Acknowledged By (Finance)

Fields:

* Name
* Job Position
* Date
* Note

Status:

* Draft
* Pending Approval
* Approved
* Rejected
* Revision Required

Buttons:

Save Draft
Submit PR

====================================================
PURCHASE ORDER (CREATE PO)
==========================

Keep existing Purchase Order workflow.

One Purchase Request can generate multiple Purchase Orders.

Example:

PR-001

→ PO-001 Vendor A
→ PO-002 Vendor B
→ PO-003 Vendor C

Create a modern enterprise PO page.

Page Header:

Title:
Create Purchase Order

Breadcrumb:

Procurement > Purchase Orders > Create PO

====================================================
PURCHASE REQUEST SELECTION
==========================

Searchable PR Dropdown

Example:

PR-001 - Production Materials May 2026
PR-002 - Packaging Materials June 2026

After selecting PR:

Automatically load all PR items.

====================================================
VENDOR INFORMATION
==================

Vendor Dropdown

Vendor Contact

Vendor Email

Payment Terms

Delivery Address

====================================================
AVAILABLE ITEMS FROM PR
=======================

Responsive Table:

Select
Item Code
Item Name
Requested Qty
Ordered Qty
Remaining Qty

Features:

Checkbox Selection

Multi Vendor Support

Search

Filter

Highlight Low Remaining Quantity

====================================================
PO ITEM DETAILS
===============

Table:

Item
Requested Qty
Remaining Qty
Order Qty
Unit Price
Total

Validation:

Order Qty cannot exceed Remaining Qty

Auto calculate totals.

====================================================
PO SUMMARY CARD
===============

Display:

Selected Items

Total Quantity

Subtotal

Tax

Grand Total

====================================================
PO ATTACHMENTS
==============

Upload:

Vendor Quotation

Contract

Agreement

Vendor Proposal

Supporting Documents

====================================================
PO APPROVAL
===========

Requested By

Approved By

Acknowledged By

Fields:

Name

Position

Date

Note

Status

====================================================
PO ACTIONS
==========

Save Draft

Submit PO

Approve PO

Print PO

Export PDF

Cancel PO

====================================================
PAYMENT REQUEST (PAYREQ)
========================

Keep current workflow.

Create realistic ERP Payment Request page.

====================================================
HEADER INFORMATION
==================

Project Code Dropdown:

* 1_Investment
* 2_Labor
* 3_Material
* 4_Upkeep
* 5_Personel
* 6_Rent

Additional Fields:

Entity / Project

Reason of Payment

Person In Charge

Date / Duration of Activity

Estimated Payment Date

Released Payment Date

====================================================
PAYMENT INFORMATION
===================

Request Type

Reference Number

Amount

Bank Name

Bank Account

Beneficiary Name

====================================================
PAYREQ ATTACHMENTS
==================

Category 1:
Product Evidence

* Product Photos
* Delivery Photos

Category 2:
Invoice

* Invoice Image
* Invoice PDF

Category 3:
Supporting Documents

* Purchase Order
* Quotation
* Tax Document
* Receipt
* Contract

Display preview cards.

====================================================
PAYREQ APPROVAL
===============

Requested By

Approved By

Acknowledged By

Fields:

Name

Position

Date

Note

Status

Buttons:

Approve

Reject

Request Revision

====================================================
ACTIVITY TIMELINE
=================

Show complete history:

PR Created

Manager Approved

Finance Acknowledged

PO Generated

Vendor Assigned

PO Approved

PayReq Created

Finance Approved

Payment Released

Delivery Completed

====================================================
DESIGN REQUIREMENTS
===================

Do NOT replace existing Procurement Dashboard.

Do NOT redesign workflow cards.

Keep current Procurement page layout.

Only add professional ERP forms and CRUD functionality.

Use enterprise ERP style inspired by:

SAP
Oracle NetSuite
Microsoft Dynamics
Odoo Enterprise

All forms should be realistic, production-ready, and suitable for presentation to management.
