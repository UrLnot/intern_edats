# eDTS User Guide

## Login

1. Open the app URL.
2. Enter your username and password.
3. Click Login.

If no credentials are configured, the default login is:

- Username: `pmd_admin`
- Password: `pmd_admin`

## Dashboard

### Active vs Archive

- **Active** shows in-progress documents (not archived).
- **Archive** shows finalized documents (archived).

Use the **Active / Archive** tabs at the top of the dashboard to switch views.

### Statistics

The top statistics panel updates based on the selected tab:

- **Active tab**
  - Total: all active documents
  - Pending: active documents still in progress
  - Overdue: active documents that are past their due date
- **Archive tab**
  - Total: all archived documents
  - Completed Overdue: archived documents finished after the due date
  - Completed: all archived documents

### Document Type counts

Under the statistics you will see “Document Types” chips showing:

- Document type name
- Count

If there are many types, use **Show More / Show Less**.

### Search bar

The search bar filters the currently displayed list by:

- Tracking Number
- Sender (step 1)
- Subject
- Latest receiver (most recent step)

### Section filter

The section filter only shows sections that are currently present in the loaded list.

Selecting a section filters documents to those whose latest recorded section matches the selected section.

### Facecards

Each document facecard shows (high level):

- Tracking Number
- Subject
- Current holder / receiver
- Current section
- Due status (and due date)
- Total time (for completed documents)

Click a facecard to open the document details.

## Create Document

From the dashboard, click **New Entry**.

Fields you typically fill in:

- **Sender**: the person originating the document
- **Receiver**: the first receiver/holder
- **Section**: must be one of:
  - Plans and Programs
  - Monitoring and Evaluation
  - ICT
  - Statistics
- **Type of Document**: one of:
  - Memorandum
  - Endorsement
  - Letter
  - Email
  - Special Order
  - Notice of Meeting
  - Advisory
- **Action Required**: choose one or more items
- **Remarks**: additional notes (optional)
- **Due In**:
  - Simple (3 days)
  - Technical (7 days)
  - Highly Technical (20 days)

When you save, the app generates a tracking number like:

- `PMD-YYYYMMDD-0001`

## Document Details

The document details page shows:

- Document info (tracking number, subject, type)
- Due information
- Total time (if finalized)
- Tracking history (steps)

### Tracking history & step duration

Each step shows:

- Sender / receiver
- Section
- Forwarded date
- Received date/time (when completed)
- Duration:
  - “Elapsed …” for the current pending step
  - “Took …” for completed steps

### Total Time

When a document is finalized, “Total Time” represents the time from when the document was created/forwarded (step 1) to when it was finalized, using Manila-time normalized timestamps.

## Forward Document (Active documents)

When a document is still active, the details page shows the **Forward Document** form.

### Section lock

- Once a section is set on the document, it becomes locked for subsequent steps.
- The section dropdown will be disabled when locked.
- The server also rejects attempts to change the locked section.

### Receiver dropdown and filtering

- The receiver list is populated from the employees table.
- When a section is selected/locked, the receiver list is filtered to employees in that section.

### Action Taken

Action Taken is optional and can be left blank.

### Complete & Forward

Completes the current step (sets received date/time) and creates the next step with the selected receiver.

## Finalize (Mark as Final)

Finalizing a document:

- Completes the last step
- Marks the log as **Completed**
- Moves the document to **Archive**

## Attachments

On the details page you can upload files as attachments.

- Uploaded attachments are linked to the tracking number.
- You can preview/download attachments depending on file type.

## Overdue rules (how it’s counted)

- Due date is based on **Step 1**:
  - Simple: +3 days
  - Technical: +7 days
  - Highly Technical: +20 days
- Deadline is treated as the **end of the due day in Manila** (11:59:59 PM).
- “Overdue” means current Manila time is past that deadline.
- “Completed Overdue” means the completion timestamp is past that deadline.
