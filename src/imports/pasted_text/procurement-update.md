IMPORTANT PROCUREMENT SYSTEM UPDATE

Do NOT redesign the existing Procurement Dashboard.

Keep all existing Procurement Dashboard layouts, cards, workflow visualizations, and navigation.

This update focuses on improving the Procurement workflow architecture to reflect real-world procurement operations used by Fairventures Agroforestry.

====================================================
CORE PROCUREMENT CONCEPT
========================

The system must NOT assume:

1 Purchase Request = 1 BES = 1 PO = 1 Payment Request

This is not how procurement works in reality.

Instead, use a document relationship model.

A single Purchase Request can generate:

* Multiple BES
* Multiple Purchase Orders
* Multiple Payment Requests

depending on procurement conditions.

Relationship:

Purchase Request
├── BES (0..N)
├── Purchase Order (0..N)
└── Payment Request (0..N)

====================================================
ITEM-BASED PROCUREMENT
======================

All procurement processes must be item-based.

Every Purchase Request contains multiple items.

Example:

PR-001

* NPK Fertilizer 2,000 Kg
* Pesticide 20 Liter
* Sacks 500 Pcs

Procurement must be able to select specific items from the PR when creating:

* BES
* Purchase Order
* Payment Request

The system must NOT force all PR items into a single document.

====================================================
SELECT ITEMS FROM SOURCE DOCUMENT
=================================

When creating BES:

Display:

Select Items From Purchase Request

Example:

☑ NPK Fertilizer
☐ Pesticide
☐ Sacks

Only selected items become part of the BES.

---

When creating Purchase Order:

Display:

Select Items From Source Document

Source can be:

* Purchase Request
* BES

Show table:

Select | Item | Requested Qty | Already Ordered | Remaining Qty

Users can choose only selected items.

---

When creating Payment Request:

Display:

Create Payment Request From

Options:

* Purchase Request
* Purchase Order
* BES

Show available items.

Users can select only specific items that need payment.

====================================================
PARTIAL PROCUREMENT SUPPORT
===========================

Example:

PR-001

NPK 2,000 Kg

Vendor A can only supply:

1,000 Kg

Vendor B can supply:

1,000 Kg

System must support:

PO-001
Vendor A
NPK 1,000 Kg

PO-002
Vendor B
NPK 1,000 Kg

Both linked to the same PR.

====================================================
FULFILLMENT TRACKING
====================

Each item must track:

Requested Quantity

Ordered Quantity

Paid Quantity

Delivered Quantity

Remaining Quantity

Example:

NPK

Requested: 2,000 Kg

Ordered: 1,500 Kg

Remaining: 500 Kg

Display fulfillment percentage.

Example:

75% Fulfilled

====================================================
BES MODULE IMPROVEMENT
======================

BES is not just a form.

BES functions as:

Procurement Evaluation Center

Purpose:

* Vendor Sourcing
* Vendor Evaluation
* Vendor Comparison
* Procurement Recommendation

====================================================
TEMPORARY VENDOR CONCEPT
========================

Support vendors that do not yet exist in Vendor Master.

During BES creation:

Allow:

* Add Temporary Vendor

Required Fields:

* Vendor Name
* Contact Person
* Phone Number
* Notes

Do NOT require:

* NPWP
* Bank Account
* Tax Documents
* Full Vendor Registration

Reason:

Procurement may still be gathering quotations.

====================================================
VENDOR COMPARISON TABLE
=======================

Vendor Type:

* Existing Vendor
* Temporary Vendor

Display:

Vendor Name
Vendor Type
Price
Lead Time
Shipping Cost
Total Cost

Example:

PT ABC
Existing Vendor

PT Agro Jaya
Temporary Vendor

====================================================
PROCUREMENT RECOMMENDATION
==========================

Procurement can write:

Recommended Vendor

Reason for Recommendation

Example:

Lowest total cost and fastest delivery.

====================================================
PROJECT MANAGER APPROVAL
========================

Project Manager reviews:

* Vendor Comparison
* Procurement Recommendation
* Budget Impact

Then selects the winning vendor.

====================================================
TEMPORARY VENDOR CONVERSION
===========================

If a Temporary Vendor is selected and approved:

System automatically requests:

Complete Vendor Information

Fields:

* Vendor Name
* Address
* Email
* Phone
* NPWP
* Bank Name
* Bank Account
* Beneficiary Name

Status changes:

Temporary Vendor
→ Active Vendor

Vendor is automatically added to Vendor Master.

====================================================
PURCHASE ORDER IMPROVEMENT
==========================

Purchase Orders can be created from:

* Purchase Request
* BES

When creating a PO:

Display:

Source Document

Options:

Purchase Request
BES

If BES selected:

Automatically load:

* Approved Vendor
* Approved Items
* Quantities

====================================================
PAYMENT REQUEST IMPROVEMENT
===========================

Payment Requests can be created from:

* Purchase Request
* Purchase Order
* BES

When creating PayReq:

Display:

Source Document

Options:

PR
PO
BES

Automatically load relevant data.

====================================================
DOCUMENT TRACEABILITY
=====================

Every document must display Related Documents.

Example:

PR-001
↓
BES-001
↓
PO-001
↓
PayReq-001

Users can click and navigate between documents.

====================================================
PROCUREMENT ROUTING
===================

Support all procurement routes.

Route A:

PR
↓
Direct PayReq
↓
Payment
↓
Delivery

---

Route B:

PR
↓
PO
↓
PayReq
↓
Payment
↓
Delivery

---

Route C:

PR
↓
BES
↓
PO
↓
PayReq
↓
Payment
↓
Delivery

====================================================
DESIGN GOAL
===========

Build a realistic enterprise procurement system.

The system must support:

* Multiple BES per PR
* Multiple PO per PR
* Multiple PayReq per PR
* Partial item ordering
* Multiple vendors for the same item
* Temporary Vendor workflow
* Vendor Comparison
* Procurement Evaluation
* Document Traceability
* Fulfillment Tracking

Do not create a generic procurement dashboard.

Design a procurement workflow that matches real-world procurement operations.
