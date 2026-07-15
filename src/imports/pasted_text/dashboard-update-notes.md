IMPORTANT

This update has ONLY TWO objectives:

1. Add a new sidebar menu:
Transaction Management
├── Commodity Purchase
├── Commodity Selling
└── Saprodi Distribution

2. Update Dashboard content to reflect the complete Fairventures Agroforestry business process.

DO NOT MODIFY ANYTHING ELSE.

====================================================
DO NOT MODIFY
====================================================

Do NOT modify:

- Procurement Module
- Warehouse Module
- Finance Module
- Reports Module
- HR Module

- Existing Forms
- Existing CRUD Pages
- Existing Workflows
- Existing Database Logic
- Existing Business Logic

- Existing Procurement Flow
- Existing Warehouse Flow
- Existing Finance Flow

Do not redesign any existing module.

Do not create new forms.

Do not create new workflows.

Only perform the two updates described below.

====================================================
UPDATE 1
SIDEBAR NAVIGATION
====================================================

Add a new top-level menu:

Transaction Management

Place it between:

Warehouse

and

Finance

Final Sidebar Structure:

Dashboard

Procurement

Warehouse

Transaction Management
├── Commodity Purchase
├── Commodity Selling
└── Saprodi Distribution

Finance

Reports

HR

====================================================
TRANSACTION MANAGEMENT STATUS
====================================================

For now:

Create navigation menu only.

No forms required.

No tables required.

No workflows required.

Each submenu may temporarily display:

"Module Under Development"

or

"Coming Soon"

====================================================
UPDATE 2
DASHBOARD REDESIGN
====================================================

Keep the existing dashboard design style.

Keep the existing layout structure.

Keep existing colors.

Keep existing typography.

Keep existing responsive behavior.

Only replace dashboard content with meaningful executive-level business information.

====================================================
SECTION 1
EXECUTIVE SUMMARY KPI CARDS
====================================================

Display 6 KPI Cards:

1. Procurement Cost

Total procurement spending.

Example:
Rp 850,000,000

----------------------------------------------------

2. Inventory Value

Current inventory value.

Example:
Rp 320,000,000

----------------------------------------------------

3. Saprodi Distributed

Total value of saprodi distributed to farmers.

Example:
Rp 210,000,000

----------------------------------------------------

4. Commodity Purchased

Total commodity purchased from farmers.

Example:
Rp 1,500,000,000

----------------------------------------------------

5. Commodity Sales

Total commodity sold to offtakers.

Example:
Rp 1,900,000,000

----------------------------------------------------

6. Outstanding Farmer Debt

Farmer liabilities from saprodi distribution.

Example:
Rp 80,000,000

====================================================
SECTION 2
BUSINESS FLOW OVERVIEW
====================================================

Create a visual business flow summary.

Flow:

Purchase Request
      ↓
Purchase Order
      ↓
Stock Received
      ↓
Saprodi Distribution
      ↓
Commodity Purchase
      ↓
Commodity Selling

Display transaction counts for each stage.

Example:

PR Created : 25

PO Created : 18

Stock Received : 15

Saprodi Distribution : 12

Commodity Purchase : 9

Commodity Selling : 8

Purpose:

Management can immediately understand where activities are occurring in the business process.

====================================================
SECTION 3
INVENTORY HEALTH
====================================================

Display a Low Stock Alert table.

Columns:

Item Name

Current Stock

Minimum Stock

Status

Example:

NPK
200 Kg
500 Kg
Reorder Required

----------------------------------------------------

KCL
150 Kg
500 Kg
Low Stock

Purpose:

Provide visibility into inventory risks.

====================================================
SECTION 4
FARMER SETTLEMENT SUMMARY
====================================================

Display 3 KPI Cards:

1. Total Saprodi Distributed

Example:
Rp 210,000,000

----------------------------------------------------

2. Recovered Through Commodity Sales

Example:
Rp 140,000,000

----------------------------------------------------

3. Outstanding Farmer Debt

Example:
Rp 70,000,000

Purpose:

Monitor recovery of distributed agricultural inputs.

====================================================
SECTION 5
FINANCE SNAPSHOT
====================================================

Display 4 KPI Cards:

Cash Position

Outstanding Vendor Payments

Outstanding Offtaker Receivables

Estimated Gross Margin

Example:

Cash Position
Rp 1,250,000,000

Outstanding Vendor Payments
Rp 150,000,000

Outstanding Offtaker Receivables
Rp 75,000,000

Estimated Gross Margin
18%

====================================================
SECTION 6
ACTION REQUIRED
====================================================

Display important alerts requiring management attention.

Examples:

4 PR awaiting approval

2 PO awaiting Director approval

3 PayReq awaiting Finance approval

NPK stock below minimum level

5 farmers have outstanding debt over 90 days

Commodity delivery pending

Purpose:

Highlight urgent actions requiring follow-up.

====================================================
DASHBOARD PHILOSOPHY
====================================================

The Dashboard must not display excessive raw data.

Do not show all transactions.

Do not show all inventory items.

Do not show unnecessary operational details.

Display only information useful for management decision-making.

The Dashboard should summarize the entire business process:

Procurement
↓
Warehouse
↓
Saprodi Distribution
↓
Commodity Purchase
↓
Commodity Selling
↓
Finance

Users should understand the business condition within 10 seconds of opening the dashboard.

====================================================
FINAL REQUIREMENT
====================================================

Only perform these two changes:

1. Add Transaction Management menu and its submenus.

2. Update Dashboard content.

Do not modify any other module, page, workflow, form, CRUD, or business process.