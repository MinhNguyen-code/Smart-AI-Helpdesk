# MASTER PROMPT — SMART IT HELPDESK
## Build a Complete New Full-Stack Web Application from Scratch
### React + Vite + Tailwind CSS + Node.js/Express + MySQL + Google Authentication

---

# 0. YOUR MISSION

You are acting as:

- Principal Software Architect
- Senior Full-Stack Developer
- React Frontend Engineer
- Node.js Backend Engineer
- MySQL Database Architect
- UI/UX Implementation Engineer
- Reliability Engineering Consultant
- Application Security Engineer
- QA Automation Engineer
- Technical Documentation Lead

Your mission is to design, implement, test and document a completely new web application named:

**SMART IT HELPDESK**

This is a real software development project, not a prototype.

You must create actual working source code.

You must implement frontend, backend, database, authentication, authorization, business logic, ticket management, automatic priority assignment, SLA monitoring, technical-team notifications and analytics.

Use the seven original wireframe images supplied by the project owner as the primary UI references.

Build the project directly inside the existing D:\Smart IT Helpdesk workspace.

Do not import, copy or depend on any other existing project's code, database, environment configuration or credentials.

Do not modify unrelated repositories or local databases.

**Your goal is a functional, tested, documented single-organization MVP within a seven-day development plan.**

Work autonomously through safe implementation stages. Do not stop after producing only a plan.

However, stop for explicit user action whenever external credentials, provider configuration, permission approval or potentially destructive operations are required.

Never claim a stage is complete without implementation and verification evidence.

---

# 1. OFFICIAL PROJECT TOPIC

Project title:

**Hệ thống quản lý ticket phản hồi sự cố có ưu tiên tự động**

English name:

**Smart IT Helpdesk for System Reliability Management**

Academic research topics:

1. Reliability Engineering in Networked User Systems
2. Error Prevention Strategies

Application domain:

Web Application.

## Problem statement

In a networked learning or working environment, users may experience:

- Server outages
- Network connectivity issues
- Login problems
- Learning Management System errors
- Application failures
- Software installation issues
- Account permission problems
- Device and computer problems

Traditional incident reporting through informal communication can lead to:

- Missing incident reports
- Delayed responses
- Incorrect priority handling
- Unclear responsibility
- Missed SLA deadlines
- Poor incident traceability
- Insufficient performance measurement

Build a centralized ticket management application that addresses these problems.

## Required input

Users submit:

- Incident title
- Detailed description
- Impact level
- Incident category
- Optional attachment

## Required output

The system must:

- Create and store tickets
- Automatically classify incident priority
- Notify technical staff
- Track incident processing
- Assign responsible technicians
- Track SLA deadlines
- Alert when SLA is breached
- Maintain ticket history
- Calculate operational statistics
- Generate useful performance reports

The implementation must clearly demonstrate how the application contributes to reliability engineering and error-prevention strategies.

---

# 2. PROJECT SCOPE

## Architecture

Single-organization application.

Do not build Multi-Tenant SaaS.

Do not implement subscription management, billing or organization switching.

## User roles

Three roles:

1. ADMIN
2. IT_AGENT
3. END_USER

## Mandatory modules

1. Authentication
2. User and role management
3. Ticket creation
4. Ticket listing and search
5. Ticket detail and conversation
6. Ticket assignment
7. Ticket status management
8. Rule-Based Priority Engine
9. SLA configuration
10. SLA monitoring and breach alerts
11. Technical-team notifications
12. Kanban board
13. Dashboard analytics
14. Ticket attachments
15. Audit and event history

## Out of scope

Do not implement:

- Complex AI or LLM classification
- Multi-Tenant SaaS
- Billing
- Payment integration
- Microservices
- Advanced ITSM workflow automation
- Mobile native applications
- Distributed event streaming
- Unnecessary enterprise abstractions

Keep the implementation understandable, modular and maintainable.

---

# 3. REQUIRED TECHNOLOGY STACK

## Frontend

- React
- Vite
- JavaScript / JSX
- Tailwind CSS
- React Router
- Lucide React
- Recharts
- Native Fetch API or a lightweight equivalent

Use compatible, maintained versions.

Prefer a simple feature-oriented React architecture.

Avoid unnecessary Redux or complex global state management.

## Backend

- Node.js
- Express
- Knex.js
- mysql2
- MySQL 8.x
- Runtime request validation
- Secure server-side session handling

## Authentication

Use Google OpenID Connect / OAuth 2.0 Authorization Code Flow.

Use:

- Authorization Code Flow
- PKCE
- State validation
- Nonce validation
- Google-issued ID token verification
- Verified email identity
- Server-side application session

Choose a maintained library suitable for the installed Node.js version.

Do not manually implement token-signature cryptography.

## Testing

- Node.js test runner or an appropriate backend test framework
- React Testing Library
- Vitest
- Playwright
- Real MySQL integration tests

## Developer environment

Target Windows 11 development.

Provide commands compatible with PowerShell.

Avoid shell commands that assume Bash-only syntax.

---

# 4. START FROM A NEW PROJECT DIRECTORY

Use the existing standalone project root D:\Smart IT Helpdesk. Never create a nested project directory.

Suggested name:

`smart-it-helpdesk`

The new directory must not contain inherited source code or old application configuration.

Initialize a new Git repository only inside this directory.

Do not automatically push to GitHub.

Create the following initial files:

- README.md
- AGENTS.md
- .gitignore
- .env.example
- docs/PROJECT_SPEC.md
- docs/ARCHITECTURE.md
- docs/DATABASE_DESIGN.md
- docs/API_SPEC.md
- docs/IMPLEMENTATION_PLAN.md
- docs/TEST_PLAN.md
- docs/DAILY_PROGRESS.md

Use a monorepo-style layout.

Suggested structure:

```text
smart-it-helpdesk/
├── src/
│   ├── app/
│   ├── api/
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   ├── forms/
│   │   └── charts/
│   ├── features/
│   │   ├── auth/
│   │   ├── tickets/
│   │   ├── kanban/
│   │   ├── rules/
│   │   ├── sla/
│   │   ├── notifications/
│   │   └── dashboard/
│   ├── hooks/
│   ├── utils/
│   └── styles/
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── tickets/
│   │   ├── rules/
│   │   ├── sla/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   └── utils/
│   ├── migrations/
│   ├── scripts/
│   ├── tests/
│   └── private-uploads/
├── e2e/
├── docs/
│   ├── references/
│   │   └── wireframes/
│   ├── architecture/
│   ├── phase-reports/
│   └── screenshots/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .gitignore
├── AGENTS.md
└── README.md
```

The exact structure may be refined if a simpler approach is justified.

Keep shared components reusable.

Avoid circular dependencies and large monolithic files.

---

# 5. AUTHENTICATION USING THREE REAL GOOGLE ACCOUNTS

The project owner supplied three Gmail accounts.

Use the following initial account mapping as a proposed setup:

| Gmail | Proposed role |
|---|---|
| binmin109@gmail.com | ADMIN |
| nguyenbinhminh.1009.vn@gmail.com | IT_AGENT |
| nguyenbinhminh.2006.vn@gmail.com | END_USER |

Before assigning privileged roles, obtain the project owner's confirmation.

These addresses identify proposed authorized users.

They are not application passwords.

## Mandatory authentication requirements

Implement real Google Sign-In.

The website must redirect the user through Google's official authentication process.

After successful authentication:

1. Verify the OpenID Connect response.
2. Verify the ID token.
3. Require a verified email.
4. Check the approved-user allowlist.
5. Create or bind the local user record to the verified Google `sub`.
6. Retrieve the user's application role from MySQL.
7. Create a new server-side session.
8. Redirect the user to the appropriate page.

Do not automatically give Admin privileges to arbitrary Google users.

Do not treat a user-supplied email string as proof of account ownership.

Do not accept Google account passwords inside the application.

Do not store Google passwords.

Do not use Gmail app passwords as login passwords.

Do not hardcode OAuth client secrets.

## Account onboarding

Implement a secure Admin/bootstrap command for approving specific Gmail addresses and intended roles.

Approved users must authenticate successfully through Google before receiving an active application session.

Only bind an account to a Google `sub` after verified authentication.

Use normalized email matching for initial allowlist lookup.

Persist the Google subject identifier as the stable external identity.

Do not automatically rebind an existing account to a different subject without an explicit secure administrative recovery process.

## Google Cloud configuration

Provide an exact setup guide for:

- Creating or selecting a Google Cloud project
- Configuring the OAuth consent screen
- Registering the application
- Configuring approved test users where required
- Configuring authorized redirect URIs
- Creating OAuth client credentials
- Populating the local `.env`
- Testing the callback flow

Any required cloud configuration must be completed by the project owner through their own authorized account.

Do not invent OAuth client IDs or secrets.

Do not attempt to bypass provider restrictions or verification requirements.

If Google credentials are unavailable, complete the remaining application modules and clearly mark real Google login as BLOCKED.

Do not simulate successful Google authentication and call it a working login system.

Use isolated, test-only authentication fixtures for automated tests if necessary.

---

# 6. FRONTEND — SEVEN ORIGINAL WIREFRAMES

The visual design must follow the supplied images.

Logical screen names below are labels only. Preserve the seven original filenames in Wireframe/ and use docs/references/wireframes_mapping.md to locate them:

```text
Wireframe/
├── 01-login.jpg
├── 02-create-ticket.jpg
├── 03-kanban-board.jpg
├── 04-ticket-detail.jpg
├── 05-dashboard.jpg
├── 06-rules-list.jpg
└── 07-rule-dialog.jpg
```

Inspect each image before implementation.

If the images are missing, ask for them or report the blocker.

Do not claim visual fidelity without inspecting the actual references.

## General visual style

- White backgrounds
- Light gray surfaces
- Dark readable text
- Small sidebar
- Thin borders
- Simple tables
- Compact buttons
- Modest corner radius
- Limited blue accents
- Minimal shadows

Avoid:

- Neon effects
- Heavy gradients
- Oversized dark KPI cards
- Excessive animations
- Unnecessary decorative elements
- Generic dashboard templates

Prioritize visual similarity and functional usability.

## Screen 01 — Login

Create the two-column Login interface.

Left:

- Project identity
- Large heading
- Supporting description
- Helpdesk illustration
- Trust/support information

Right:

- Smart IT Helpdesk identity
- Login heading
- Supporting description
- Official Google Sign-In button
- Authentication errors
- Support/help information

Important:

The original wireframe depicts email/password inputs, but this application uses Google Sign-In.

Preserve the overall layout while replacing unsupported password-based login with the real Google authentication flow.

Do not ask users for their Gmail passwords.

## Screen 02 — Create Ticket

Build the centered form.

Required fields:

- Incident title
- Impact level
- Incident category
- Detailed description
- Optional attachment

Impact choices:

- Cá nhân
- Phòng ban
- Toàn tổ chức

Actions:

- Cancel
- Submit Ticket

Include validation and meaningful success/error feedback.

## Screen 03 — Kanban

Implement three columns:

- Mới tạo
- Đang xử lý
- Đã giải quyết

Ticket cards include:

- Ticket reference
- Title
- Priority
- Category
- Reporter or assignee where relevant
- SLA deadline/status

Use real database data.

## Screen 04 — Ticket Detail

Implement the large detail modal.

Left:

- Ticket description
- Attachments
- Conversation
- Ticket history
- Reply form

Right:

- SLA indicator
- Status
- Assignee
- Category
- Impact
- Priority explanation

Implement correct permission-aware actions.

## Screen 05 — Dashboard

Use the original light dashboard layout.

Top:

- Page heading
- Date-range filter
- Four KPI cards

Below:

- Daily ticket chart
- Incident category distribution

Include priority distribution where practical without disrupting the reference layout.

All metrics must come from real backend analytics.

## Screen 06 — Rule Engine List

Implement:

- Rule search
- Rule table
- Keyword
- Assigned priority
- Active status
- Add/Edit/Delete
- Confirmation dialogs

Admin only.

## Screen 07 — Rule Dialog

Implement a compact dialog for:

- Keyword/phrase
- Priority
- Active status
- Save
- Cancel

Use actual backend validation.

---

# 7. DATABASE DESIGN

Use MySQL as the authoritative datastore.

Create a brand-new development database.

Suggested name:

`smart_it_helpdesk_dev`

Create a separate dedicated testing database:

`smart_it_helpdesk_test`

These names apply only to the newly created project environment.

Before any migration or test fixture write:

- Verify the current database.
- Verify the connected MySQL account.
- Verify it is not an unrelated database.
- Use least-privilege credentials.
- Require explicit approval before first-time schema creation where necessary.

Do not automatically drop or truncate databases.

## Required tables

### users

- id
- google_sub
- email
- full_name
- avatar_url
- role
- is_active
- created_at
- updated_at

### categories

- id
- name
- description
- is_active
- timestamps

### tickets

- id
- ticket_code
- reporter_id
- assignee_id
- category_id
- title
- description
- impact
- priority
- status
- priority_reason
- response_deadline_at
- resolution_deadline_at
- first_response_at
- resolved_at
- created_at
- updated_at
- version

### ticket_comments

- id
- ticket_id
- author_id
- message
- visibility
- created_at

### ticket_attachments

- id
- ticket_id
- uploaded_by
- original_filename
- stored_filename
- mime_type
- size_bytes
- created_at

### ticket_history

- id
- ticket_id
- actor_id
- event_type
- old_value
- new_value
- created_at

### priority_rules

- id
- keyword
- normalized_keyword
- priority
- is_active
- created_at
- updated_at

### sla_policies

- id
- priority
- response_minutes
- resolution_minutes
- is_active
- created_at
- updated_at

### notifications

- id
- recipient_id
- ticket_id
- notification_type
- title
- message
- deduplication_key
- is_read
- created_at

### audit_logs

- id
- actor_id
- action
- entity_type
- entity_id
- safe_metadata
- created_at

### session storage

Use a persistent MySQL-backed session store.

Add small supporting tables only when necessary.

## Database principles

- Foreign keys
- Indexes
- Unique constraints
- Transactions
- Parameterized queries
- Migration versioning
- UTC timestamps
- Clear lifecycle invariants
- No plaintext passwords
- No fake operational records

Never use an in-memory array as a substitute for MySQL persistence.

---

# 8. BACKEND API DESIGN

Use a versioned REST API.

Base prefix:

`/api/v1`

Suggested endpoints:

## System

GET /health

GET /ready

## Authentication

GET /auth/google

GET /auth/google/callback

GET /auth/me

POST /auth/logout

## Tickets

GET /tickets

POST /tickets

GET /tickets/:id

PATCH /tickets/:id

PATCH /tickets/:id/status

PATCH /tickets/:id/assign

GET /tickets/:id/comments

POST /tickets/:id/comments

POST /tickets/:id/attachments

GET /tickets/:id/attachments/:attachmentId

## Categories

GET /categories

## Rules

GET /rules

POST /rules

PATCH /rules/:id

DELETE /rules/:id

## SLA

GET /sla/policies

PUT /sla/policies/:priority

GET /sla/breaches

## Notifications

GET /notifications

PATCH /notifications/:id/read

## Analytics

GET /analytics/summary

GET /analytics/daily

GET /analytics/categories

GET /analytics/priorities

GET /analytics/sla

The route list is an initial contract proposal.

Keep it concise and consistent with implemented frontend needs.

Document request and response schemas.

Use consistent HTTP status codes and sanitized errors.

Implement pagination for ticket lists.

Do not return entire ticket datasets merely to compute dashboards in React.

---

# 9. ROLE-BASED ACCESS CONTROL

## ADMIN

Can:

- Access all tickets
- Manage priority rules
- Configure SLA
- View reports
- Assign tickets
- Manage supported account status and roles
- Access audit information where implemented

## IT_AGENT

Can:

- Access operational ticket queues
- View authorized ticket details
- Reply to tickets
- Change ticket status
- Assign or accept tickets under the configured policy
- See SLA alerts

Cannot:

- Change global Rule Engine configuration
- Change administrative access rights

## END_USER

Can:

- Create tickets
- View own tickets
- View own ticket details
- Reply to own tickets
- Download authorized attachments

Cannot:

- View unrelated users' private tickets
- Modify priority rules
- Assign technical staff
- Modify SLA policies
- Access Admin-only analytics

Enforce permissions on the backend.

Verify direct-object access for every ticket ID and attachment.

Frontend navigation is not a security boundary.

---

# 10. RULE-BASED AUTOMATIC PRIORITY ENGINE

This module directly implements the academic research requirement.

Use a deterministic keyword-matching engine.

Do not use an LLM or external AI API.

## Priority levels

Two levels:

- URGENT — Khẩn cấp
- NORMAL — Bình thường

## Inputs

- Ticket title
- Ticket description
- Impact level

## Example rules

"server sập" → URGENT

"mất kết nối toàn hệ thống" → URGENT

"không truy cập được LMS" → URGENT

"lỗi nhỏ" → NORMAL

These are sample rules, not permanent hardcoded behavior.

Persist active rules in MySQL.

## Evaluation algorithm

1. Read title and description.
2. Normalize text for matching.
3. Normalize Unicode consistently.
4. Apply Vietnamese accent-insensitive matching.
5. Handle punctuation and phrase boundaries.
6. Read active rules from MySQL.
7. Evaluate matching rules.
8. Determine priority.
9. Consider impact level.
10. Persist classification evidence.

Proposed deterministic policy:

- Organization-wide impact → URGENT.
- Any active URGENT keyword match → URGENT.
- Otherwise → NORMAL.

Department/individual impact remains recorded and visible but does not automatically escalate unless a matching rule or explicit policy requires it.

URGENT always wins over NORMAL.

The frontend cannot override server-assigned priority.

## Example

Title:

"Server sập, không vào được LMS"

Description:

"Toàn bộ sinh viên không truy cập được hệ thống."

Impact:

Toàn tổ chức.

Expected priority:

URGENT.

Reason:

Organization-wide impact and matching urgent keywords.

## Historical consistency

Rule edits must not retroactively alter old tickets without an explicit reclassification operation.

Persist enough rule evidence to explain historical decisions.

Implement tests for Vietnamese text normalization, phrase matching, inactive rules and priority precedence.

---

# 11. TICKET LIFECYCLE

Statuses:

- OPEN
- IN_PROGRESS
- RESOLVED

Default:

OPEN.

## Allowed transitions

OPEN → IN_PROGRESS

IN_PROGRESS → RESOLVED

Do not silently permit unrelated transitions.

Ticket creation should use a database transaction to persist:

- Ticket
- Assigned priority
- SLA deadline snapshot
- Initial history event
- Initial notification records

Ticket updates should record:

- Actor
- Action
- Timestamp
- Old/new status when applicable

For concurrent updates, use a version or equivalent server-side safeguard.

Reject invalid transitions safely.

Do not rely on frontend-only status enforcement.

---

# 12. SLA MONITORING

SLA is a mandatory feature.

Use simple calendar-time targets for the MVP.

Clearly document this choice.

Suggested configurable initial values:

| Priority | Response SLA | Resolution SLA |
|---|---|---|
| URGENT | 15 minutes | 120 minutes |
| NORMAL | 240 minutes | 1440 minutes |

These are demo policies, not universal SLA standards.

Admin must be able to review and configure the values.

## On ticket creation

1. Determine priority.
2. Load the active SLA policy.
3. Calculate response deadline.
4. Calculate resolution deadline.
5. Store deadline values.
6. Save the ticket.

If the required SLA policy is missing, fail safely with a meaningful configuration error.

Do not create fictional deadlines.

## Tracking

Track:

- Created time
- First qualifying IT Agent response
- First response deadline
- Resolved time
- Resolution deadline
- Response SLA breach
- Resolution SLA breach

Define the first qualifying response event precisely.

## Breach detection

Implement a bounded SLA checking worker or scheduled command.

For example:

`npm run worker:sla`

The worker should:

- Find overdue unresolved SLA obligations
- Generate durable in-app notifications
- Avoid duplicate breach alerts
- Log processing results
- Handle repeat runs safely

Do not depend on a browser remaining open to detect breaches.

For local demo, document how to launch the worker alongside Express.

Do not silently start multiple conflicting worker instances.

---

# 13. NOTIFICATIONS

Technical-team notifications are part of the required project output.

Implement in-app notifications first.

On ticket creation:

- Notify relevant IT Agents/Admins.

On assignment:

- Notify assigned agent.

On SLA breach:

- Notify responsible technical staff and Admin.

On new authorized reply:

- Notify appropriate participants.

Features:

- Unread count
- Notification list
- Mark as read
- Link to ticket
- Persistence in MySQL

A notification is not considered sent merely because the frontend displayed a toast.

Store notification records durably.

Email notifications may be added as an optional enhancement.

If implementing email:

- Use authorized SMTP or email provider credentials.
- Keep secrets in environment configuration.
- Send through a reliable job/outbox approach.
- Do not use personal Gmail passwords.
- Do not pretend email delivery succeeded without provider confirmation.

The MVP must still support durable in-app notifications when email is unavailable.

---

# 14. DASHBOARD ANALYTICS

The Dashboard must use real database records.

No hardcoded operational KPIs.

Required statistics:

1. Total tickets
2. Open/in-progress/resolved ticket counts
3. Average resolution time
4. SLA compliance rate
5. Tickets per day
6. Incident distribution by category
7. Incident distribution by priority

## Average resolution time

Compute from resolved tickets with valid creation and resolution timestamps.

Do not include unresolved tickets in the resolved-ticket average.

## Category distribution

For each category:

- Count of incidents
- Percentage of total incidents in the selected period

Use a documented denominator.

## SLA compliance

Document exactly:

- Which SLA obligation is evaluated
- Which tickets are included
- When a ticket qualifies as compliant
- How pending tickets are treated

Avoid reporting a misleading percentage.

## Empty states

If no valid records exist:

- Show zero for valid count metrics.
- Show unavailable for undefined averages.
- Explain empty chart datasets.

Use MySQL aggregation queries.

Do not compute organization-wide analytics from a single paginated frontend response.

Use UTC in database storage and a clearly documented reporting timezone, preferably Asia/Ho_Chi_Minh for Vietnamese users.

---

# 15. APPLICATION SECURITY

Implement reasonable security controls from the beginning.

Required:

- HTTPS-ready session configuration
- HttpOnly cookies
- Secure cookies in HTTPS environments
- Appropriate SameSite policy
- Session rotation after login
- Persistent session store
- CSRF protection
- OAuth state, nonce and PKCE
- Origin validation for mutations
- RBAC middleware
- Input validation
- Parameterized SQL through Knex
- Safe error messages
- Safe logging
- Login and API rate limiting
- Security headers
- Private attachment storage
- Authorization checks for downloads

## Attachments

Never serve private uploads directly from a public static directory.

Validate:

- File size
- Allowed file types
- Actual content type when feasible
- Filename safety

Store generated internal filenames.

Keep original names as metadata.

Do not execute uploaded content.

## Secrets

Never commit:

- OAuth client secrets
- Session secrets
- Database passwords
- `.env`
- Production data
- Personal authentication tokens

Do not print secrets in reports or test logs.

---

# 16. RELIABILITY ENGINEERING REQUIREMENTS

This project must demonstrate concepts from reliability engineering.

Implement practical mechanisms such as:

### Failure prevention

- Server-side validation
- Database constraints
- Clear status transitions
- Access controls
- Safe error handling

### Failure detection

- Health endpoint
- Readiness endpoint
- SLA breach detection
- Structured server error logs

### Failure containment

- Database transactions
- Ticket-level authorization
- No silent partial writes
- Safe retry handling

### Traceability

- Ticket history
- Rule classification evidence
- Actor timestamps
- SLA timestamps

### Recovery and robustness

- Safe application restart
- Persistent session storage
- Persistent notifications
- Repeatable migrations
- Idempotent SLA alert generation

Do not overengineer this into a distributed system.

Explain how each mechanism relates to the academic research topics in the project documentation.

---

# 17. FRONTEND ARCHITECTURE

Create reusable components for:

- Sidebar
- Topbar
- Page header
- Button
- Input
- Select
- Textarea
- Badge
- Modal
- Table
- Loading state
- Empty state
- Error state
- Confirmation dialog
- Ticket card
- SLA indicator
- Notification menu
- Analytics chart

Use consistent design tokens.

Keep React presentation separated from API calls.

Do not create fake interactive elements.

If a button is visible, it must perform its actual supported action or clearly explain why the action is unavailable.

Do not expose inaccessible Admin actions to unauthorized users.

---

# 18. RESPONSIVE REQUIREMENTS

Test at:

- 1440×900
- 1280×800
- 950×900
- 768×1024
- 390×844

Desktop screens should match the original wireframes closely.

Tablet and mobile may adapt their layout.

Requirements:

- No unnecessary horizontal overflow
- Usable navigation
- Forms remain readable
- Kanban remains navigable
- Ticket detail works on mobile
- Modal buttons remain accessible
- Tables have a suitable narrow-screen layout
- Charts do not clip labels

Respect keyboard interaction and visible focus states.

---

# 19. SEVEN-DAY IMPLEMENTATION PLAN

Execute the project in seven major stages.

The day numbers are development checkpoints, not claims that real elapsed time has passed.

Continue through safe stages without repeatedly asking for approval.

Pause only for genuine blockers, secrets, external account configuration or potentially destructive changes.

## DAY 1 — FOUNDATION

Build:

- New project directory
- Git initialization
- React/Vite setup
- Tailwind setup
- Express backend
- MySQL connection layer
- Initial migrations
- Basic API client
- Health/readiness endpoints
- Environment validation
- Project documentation

Acceptance:

- Frontend starts.
- Backend starts.
- Correct API endpoint responds.
- MySQL readiness is accurate.
- Database schema is safely initialized.
- No unrelated project is modified.

## DAY 2 — GOOGLE AUTHENTICATION AND RBAC

Build:

- Google OIDC integration
- OAuth callback
- User allowlist
- User role mapping
- Persistent sessions
- AuthProvider
- Protected routes
- Login UI based on wireframe 01
- Admin onboarding script
- Authentication tests

Acceptance:

- Real Google login works after authorized OAuth configuration.
- Three proposed accounts can be independently approved.
- Correct application roles are assigned after verified identity.
- Unauthorized Google accounts are rejected.
- Logout invalidates the session.

If real Google OAuth configuration is unavailable, report that acceptance item as BLOCKED and continue safe independent work.

## DAY 3 — TICKET CORE

Build:

- Categories
- Ticket creation
- Ticket list
- Ticket details
- Comments
- Assignment
- Status transitions
- Attachments
- Ticket history
- Wireframe 02
- Ticket APIs
- Authorization tests

Acceptance:

- Ticket persists in MySQL.
- End-User views own tickets.
- IT Agent handles permitted tickets.
- Admin has correct access.
- Invalid transitions are rejected.
- Attachments remain private.

## DAY 4 — PRIORITY ENGINE AND SLA

Build:

- Priority Rule CRUD
- Automatic keyword evaluation
- Impact-based urgency
- Priority decision persistence
- SLA policies
- Response/resolution deadlines
- SLA worker
- Rule Engine UI matching wireframes 06 and 07

Acceptance:

- "server sập" produces URGENT using configured rules.
- Normal incidents remain NORMAL when no escalation applies.
- SLA deadlines are computed correctly.
- Overdue tickets generate breach alerts.
- Duplicate alerts are prevented.
- Only Admin can manage rules and SLA settings.

## DAY 5 — KANBAN AND NOTIFICATIONS

Build:

- Three-column Kanban
- Ticket cards
- Filters
- Search
- Ticket detail modal
- Status changes
- In-app notifications
- Unread count
- Wireframes 03 and 04

Acceptance:

- Kanban reflects the database.
- Ticket status updates persist.
- Modal displays actual ticket details.
- Technical staff receive new-ticket notifications.
- Notifications link to relevant tickets.
- Unauthorized ticket access is blocked.

## DAY 6 — ANALYTICS AND VISUAL POLISH

Build:

- SQL aggregation APIs
- Dashboard KPI cards
- Daily ticket chart
- Category distribution
- Priority distribution
- SLA reporting
- Date-range filtering
- Wireframe 05
- Responsive polish across all seven screens

Acceptance:

- Dashboard uses real data.
- Average resolution time is calculated correctly.
- Category percentages use accurate denominators.
- No fake live metrics.
- Layout closely follows the wireframes.
- Screenshots are inspected at required widths.

## DAY 7 — FULL INTEGRATION AND ACCEPTANCE

Perform a real end-to-end flow:

1. Authenticate as Admin with Google.
2. Configure SLA.
3. Create an urgent keyword rule.
4. Authenticate as End-User.
5. Submit an incident ticket.
6. Verify automatic priority.
7. Verify SLA deadlines.
8. Confirm technical-team notification.
9. Authenticate as IT Agent.
10. Open the ticket in Kanban.
11. Assign or accept the ticket.
12. Send a reply.
13. Update status.
14. Resolve the ticket.
15. Confirm recorded resolution time.
16. Verify Dashboard statistics.
17. Confirm authorization boundaries.
18. Verify logout.

Run automated regression tests.

Run production build.

Perform browser screenshot acceptance.

Fix critical defects.

Document remaining limitations.

---

# 20. REQUIRED AUTOMATED TESTS

Implement tests for:

## Authentication

- Valid and invalid OAuth callback handling
- Verified email requirement
- Unauthorized Google accounts
- Account role binding
- Session restoration
- Logout
- RBAC

## Ticket management

- Ticket creation
- Input validation
- Category validation
- Access control
- Status transitions
- Assignment
- Comments
- Attachments
- Concurrent update handling

## Rule Engine

- Keyword matching
- Vietnamese Unicode handling
- Accent-insensitive matching
- Active/inactive rules
- Urgent precedence
- Impact escalation
- Historical decision consistency

## SLA

- Correct deadline calculation
- Missing policy handling
- Response-time measurement
- Resolution-time measurement
- Breach detection
- Duplicate alert prevention
- Persistence after restart

## Analytics

- Ticket counts
- Category percentages
- Priority counts
- Average resolution time
- SLA compliance
- Date-range filtering
- Empty datasets

## Frontend

- Login page
- Create Ticket
- Kanban
- Ticket detail
- Rule Engine
- Dashboard
- Role-specific navigation
- Error/loading/empty states

Run real database integration tests against the dedicated testing schema only.

Do not run destructive fixtures against development data.

---

# 21. VISUAL ACCEPTANCE PROCESS

For each of the seven screens:

1. Inspect the wireframe.
2. Render the actual React page.
3. Capture a browser screenshot.
4. Compare with the wireframe.
5. Identify visual differences.
6. Correct the layout.
7. Capture another screenshot.
8. Document the result.

Compare:

- Composition
- Component dimensions
- Spacing
- Font hierarchy
- Borders
- Colors
- Table structure
- Modal sizing
- Responsive behavior

Do not claim visual verification if the browser/screenshot tools are unavailable.

Do not call the project complete only because `npm run build` passes.

---

# 22. IMPLEMENTATION PRIORITY

If the seven-day target becomes constrained, use this priority order:

P0 — Mandatory:

1. Project foundation
2. MySQL persistence
3. Google authentication
4. RBAC
5. Ticket creation and management
6. Automatic priority assignment
7. SLA deadline calculation
8. In-app technical notifications
9. SLA breach detection
10. Basic Dashboard with real data

P1 — Important:

1. Full ticket conversation
2. Private attachments
3. Kanban search/filter
4. Full visual fidelity
5. Responsive improvements
6. Advanced report filtering

P2 — Optional:

1. External email notifications
2. Drag-and-drop Kanban
3. Additional charts
4. Decorative animations
5. Export reports

Do not sacrifice core security or reliable persistence for optional visual enhancements.

If a P0 item remains incomplete, the final project status cannot be PASS.

---

# 23. DAILY REPORTING

At the end of every development stage, update:

`docs/DAILY_PROGRESS.md`

Create a report:

`docs/phase-reports/DAY-XX-REPORT.md`

Each report must contain:

1. Stage objective
2. Implemented features
3. API endpoints
4. Database changes
5. Frontend components
6. Screenshots
7. Test commands
8. Exact test results
9. Known defects
10. Remaining blockers
11. Next-stage prerequisites

Use statuses:

PASS / PARTIAL / BLOCKED.

Do not invent passing test results.

Do not conceal incomplete features.

---

# 24. FINAL PROJECT ACCEPTANCE

The application qualifies as a completed local MVP only when:

- A real approved Google account can sign in.
- Role-based authorization works.
- A user can create a ticket.
- The ticket persists in MySQL.
- Automatic priority classification works.
- Rule changes are persisted.
- SLA deadlines are calculated.
- Breach alerts are generated.
- Technical staff receive in-app notifications.
- The Kanban board reflects real ticket states.
- Ticket details and conversations work.
- Dashboard statistics use real SQL queries.
- All seven wireframe screens are implemented.
- The frontend and backend build successfully.
- Relevant automated tests pass.
- The application can be restarted without losing persisted data.
- The README contains reproducible local setup instructions.

A production deployment is outside this checkpoint.

Do not claim production readiness merely because the local MVP works.

---

# 25. POST-MVP PROJECT FOLDER REVIEW

Once the MVP reaches its final acceptance stage, perform a READ-ONLY project-structure audit.

This is not permission to delete or reorganize files automatically.

Create:

`docs/PROJECT_FOLDER_REVIEW.md`

Include:

- Current directory tree
- Main entry points
- Frontend feature map
- Backend module map
- Database migration inventory
- Test inventory
- Generated artifact inventory
- Unused-file candidates
- Duplicate-code candidates
- Large-file candidates
- Documentation gaps
- Suggested folder restructuring
- Safe cleanup plan

Clearly classify recommendations as:

- KEEP
- REVIEW
- REFACTOR
- REMOVE_CANDIDATE

Do not remove or move files as part of the audit.

The project owner will approve a separate folder-cleanup checkpoint afterward.

---

# 26. FINAL DELIVERABLES

At the end of the full implementation, provide:

A. Overall status: PASS / PARTIAL / BLOCKED

B. Functional application summary

C. Complete project directory structure

D. Architecture diagram

E. Database ERD

F. API documentation

G. Google authentication setup status

H. Three-account role configuration status

I. Ticket Lifecycle verification

J. Rule Engine verification

K. SLA verification

L. Technical notification verification

M. Dashboard analytics verification

N. Wireframe comparison results

O. Automated test results

P. Browser E2E results

Q. Production build results

R. Local startup instructions

S. Known limitations

T. Git repository status

U. Folder audit report location

V. Suggested next steps

Never expose credentials in the final report.

Do not commit or push without authorization.

---

# 27. EXECUTION INSTRUCTIONS

Begin with the following sequence:

**STEP 1**

Verify that the selected workspace is suitable for creating a brand-new standalone project.

Do not modify unrelated directories.

**STEP 2**

Inspect the supplied wireframe images.

**STEP 3**

Create the project specification, architecture and implementation plan.

**STEP 4**

Scaffold the actual React frontend and Express backend.

**STEP 5**

Design and implement MySQL migrations and database configuration.

**STEP 6**

Implement backend business logic and frontend screens stage by stage.

**STEP 7**

Run the application, browser tests and database integration tests.

**STEP 8**

Fix defects and complete local MVP acceptance.

**STEP 9**

Generate the read-only project folder audit.

Do not stop after scaffolding.

Do not deliver only an implementation plan.

Do not create mock endpoints and claim that the actual backend is complete.

Work toward a real, functioning Smart IT Helpdesk application.

When blocked by external OAuth credentials or database authorization, report precisely what user action is required and continue other safe independent tasks.

Maintain clear progress checkpoints.

**START BUILDING SMART IT HELPDESK FROM SCRATCH NOW.**

