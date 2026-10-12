# Test Cases

Manual cases for Chae. Run them in order. Company A is the first admin’s company. Company B is the second admin’s company.

Use a fresh email for each person. A person who signs up with no invite becomes the admin of a new company named `{name}'s company`. A person who signs up with an invited email joins that company as a worker.

| ID | Status |
| --- | --- |
| TC-01 | Complete |
| TC-02 | Complete |
| TC-03 | Complete |
| TC-04 | Complete |
| TC-05 | Complete |
| TC-06 | Complete |
| TC-07 | Complete |
| TC-08 | Complete |
| TC-09 | Complete |
| TC-10 | Not run |
| TC-11 | Not run |
| TC-12 | Not run |
| TC-13 | Not run |
| TC-14 | Not run |
| TC-15 | Not run |
| TC-16 | Not run |
| TC-17 | Not run |
| TC-18 | Not run |
| TC-19 | Not run |
| TC-20 | Not run |

## TC-01 — Create an admin

**Role:** New user

**Steps**

1. Open `/sign-up`.
2. Create an account with a name, email, and password that has not been used before.
3. Finish email verification if Clerk asks for a code.
4. Land on the dashboard.

**Expected result**

- The account opens the admin dashboard at `/dashboard/admin`.
- The company name is `{name}'s company`.
- The sidebar shows Overview, Workers, Job sites, Timesheets, Invoices, and Holidays.

## TC-02 — Admin invites a worker

**Role:** Admin A

**Steps**

1. Sign in as Admin A.
2. Open **Workers**.
3. Enter a new email and click **Invite worker**.
4. In a separate browser, sign up at `/sign-up` with that same email and finish verification.
5. Sign back in as Admin A and open **Workers**.

**Expected result**

- The email appears under **Pending invites** with role Worker until the person joins.
- After sign-up, that person lands on `/dashboard/worker`.
- The pending invite is gone, and the person appears in the **Workers** table for Company A.

## TC-03 — Admin creates a job site

**Role:** Admin A

**Steps**

1. Sign in as Admin A.
2. Open **Job sites**.
3. Enter a name, optionally an address, and submit the form.

**Expected result**

- The job site appears in Company A’s job site list.
- Worker A can select that job site when submitting a timesheet, invoice, or holiday request.

## TC-04 — Worker submits a timesheet

**Role:** Worker A

**Precondition:** TC-03. Company A has at least one job site.

**Steps**

1. Sign in as Worker A.
2. Open **Timesheets**.
3. Choose the Company A job site, a week, and hours for the days worked.
4. Click **Submit timesheet** and confirm.

**Expected result**

- The timesheet appears on the worker’s list with status **Pending**.
- Admin A sees it under **Waiting for review** on `/dashboard/admin/timesheets`.

## TC-05 — Worker uploads an invoice

**Role:** Worker A

**Precondition:** TC-03. Company A has at least one job site.

**Steps**

1. Sign in as Worker A.
2. Open **Invoices**.
3. Choose the Company A job site and an invoice month.
4. Attach between 1 and 10 files. Amount is optional.
5. Click **Submit invoice** and confirm.

**Expected result**

- The invoice appears on the worker’s list with status **Pending**, and the file can be opened.
- Admin A sees it under **Waiting for review** on `/dashboard/admin/invoices`.

## TC-06 — Worker requests a holiday

**Role:** Worker A

**Precondition:** TC-03. Company A has at least one job site.

**Steps**

1. Sign in as Worker A.
2. Open **Holidays**.
3. Choose the Company A job site, a start date, an end date, and a reason.
4. Click **Submit request** and confirm.

**Expected result**

- The request appears on the worker’s list with status **Pending**.
- Admin A sees it under **Waiting for review** on `/dashboard/admin/holidays`.

## TC-07 — Admin approves a timesheet

**Role:** Admin A

**Precondition:** TC-04. A Company A timesheet is pending.

**Steps**

1. Sign in as Admin A.
2. Open **Timesheets**.
3. On the pending timesheet, click **Approve** and confirm.

**Expected result**

- The timesheet moves to **Reviewed** with status **Approved**.
- Worker A sees **Approved** on that timesheet.
- Approve and Reject are no longer available for that timesheet.

## TC-08 — Admin approves an invoice

**Role:** Admin A

**Precondition:** TC-05. A Company A invoice is pending.

**Steps**

1. Sign in as Admin A.
2. Open **Invoices**.
3. On the pending invoice, click **Approve** and confirm.

**Expected result**

- The invoice moves to **Reviewed** with status **Approved**.
- Worker A sees **Approved** on that invoice.
- Approve and Reject are no longer available for that invoice.

## TC-09 — Admin approves a holiday

**Role:** Admin A

**Precondition:** TC-06. A Company A holiday request is pending.

**Steps**

1. Sign in as Admin A.
2. Open **Holidays**.
3. On the pending request, click **Approve** and confirm.

**Expected result**

- The request moves to **Reviewed** with status **Approved**.
- Worker A sees **Approved** on that request.
- Approve and Reject are no longer available for that request.

## TC-10 — Admin rejects a timesheet

**Role:** Admin A

**Precondition:** Worker A has submitted a new pending timesheet. Use a different week or job site from the one approved in TC-07.

**Steps**

1. Sign in as Admin A.
2. Open **Timesheets**.
3. On the pending timesheet, click **Reject**.
4. Enter a reason and confirm.

**Expected result**

- The timesheet moves to **Reviewed** with status **Rejected**.
- Worker A sees **Rejected** and the reason.
- Worker A can edit and submit that week again. A new submission returns to **Pending** and clears the old reason.

## TC-11 — Admin rejects an invoice

**Role:** Admin A

**Precondition:** Worker A has submitted a new pending invoice.

**Steps**

1. Sign in as Admin A.
2. Open **Invoices**.
3. On the pending invoice, click **Reject**.
4. Enter a reason and confirm.

**Expected result**

- The invoice moves to **Reviewed** with status **Rejected**.
- Worker A sees **Rejected** and the reason.

## TC-12 — Admin rejects a holiday

**Role:** Admin A

**Precondition:** Worker A has submitted a new pending holiday request.

**Steps**

1. Sign in as Admin A.
2. Open **Holidays**.
3. On the pending request, click **Reject**.
4. Enter a reason and confirm.

**Expected result**

- The request moves to **Reviewed** with status **Rejected**.
- Worker A sees **Rejected** and the reason.

## TC-13 — Create a second admin

**Role:** New user

**Steps**

1. Sign out.
2. Open `/sign-up` with a new email that has no invite.
3. Finish verification and land on the dashboard.

**Expected result**

- The account opens `/dashboard/admin` for a new company, Company B.
- Company B’s Workers, Job sites, Timesheets, Invoices, and Holidays lists are empty.
- None of Company A’s workers, job sites, timesheets, invoices, or holidays appear.

## TC-14 — Create a job site for the second admin

**Role:** Admin B

**Steps**

1. Sign in as Admin B.
2. Open **Job sites**.
3. Create a job site with a name that is different from Company A’s job site.
4. Sign in as Admin A and open **Job sites**.
5. Sign in as Worker A and open **Timesheets**.

**Expected result**

- The new job site appears only for Admin B.
- Admin A’s job site list is unchanged.
- Worker A cannot select Company B’s job site.

## TC-15 — Invite a worker for the second admin

**Role:** Admin B

**Steps**

1. Sign in as Admin B.
2. Open **Workers** and invite a new email that is not used by Admin A, Worker A, or any pending invite.
3. Sign up with that email and finish verification.
4. Sign in as Admin A and open **Workers**.

**Expected result**

- The new person lands on `/dashboard/worker` for Company B.
- They appear in Admin B’s **Workers** table, and the pending invite is gone.
- They do not appear in Admin A’s workers or pending invites.

## TC-16 — Timesheet isolation

**Role:** Worker B, then both admins

**Precondition:** TC-14 and TC-15.

**Steps**

1. Sign in as Worker B.
2. Open **Timesheets**, choose Company B’s job site, enter hours, and submit.
3. Sign in as Admin B and open **Timesheets**.
4. Sign in as Admin A and open **Timesheets**.
5. Sign in as Worker A and open **Timesheets**.

**Expected result**

- Admin B sees Worker B’s timesheet under **Waiting for review**.
- Admin A does not see that timesheet in **Waiting for review** or **Reviewed**.
- Worker A does not see Worker B’s timesheet.
- Worker B does not see Company A’s timesheets.

## TC-17 — Invoice isolation

**Role:** Worker B, then both admins

**Precondition:** TC-14 and TC-15.

**Steps**

1. Sign in as Worker B.
2. Open **Invoices**, choose Company B’s job site, attach a file, and submit.
3. Sign in as Admin B and open **Invoices**.
4. Sign in as Admin A and open **Invoices**.
5. Sign in as Worker A and open **Invoices**.

**Expected result**

- Admin B sees Worker B’s invoice under **Waiting for review**.
- Admin A does not see that invoice in **Waiting for review** or **Reviewed**.
- Worker A does not see Worker B’s invoice.
- Worker B does not see Company A’s invoices.

## TC-18 — Holiday isolation

**Role:** Worker B, then both admins

**Precondition:** TC-14 and TC-15.

**Steps**

1. Sign in as Worker B.
2. Open **Holidays**, choose Company B’s job site, enter dates and a reason, and submit.
3. Sign in as Admin B and open **Holidays**.
4. Sign in as Admin A and open **Holidays**.
5. Sign in as Worker A and open **Holidays**.

**Expected result**

- Admin B sees Worker B’s holiday request under **Waiting for review**.
- Admin A does not see that request in **Waiting for review** or **Reviewed**.
- Worker A does not see Worker B’s request.
- Worker B does not see Company A’s holiday requests.

## TC-19 — Admin removes a worker

**Role:** Admin B

**Precondition:** TC-15 through TC-18. Worker B has joined Company B and has a timesheet, an invoice, and a holiday request.

**Steps**

1. Sign in as Admin B.
2. Open **Workers**.
3. On Worker B’s row, click **Remove**.
4. Confirm **Remove** in the dialog.
5. Sign in as Worker B and open `/dashboard/worker`.
6. Sign in as Admin B and open **Timesheets**, **Invoices**, and **Holidays**.
7. Sign in as Admin A and open **Workers**.

**Expected result**

- The dialog says Worker B will lose access to Company B.
- Worker B disappears from Admin B’s **Workers** table.
- Worker B no longer reaches the worker dashboard. The screen stays on “Creating your dashboard” because the membership is gone.
- Worker B’s timesheet, invoice, and holiday request stay on Admin B’s review pages.
- Worker B does not appear in Admin A’s workers or pending invites.

## TC-20 — Admin removes a job site

**Role:** Admin A

**Precondition:** TC-04. Company A has one job site that already has a timesheet, invoice, or holiday request.

**Steps**

1. Sign in as Admin A.
2. Open **Job sites**.
3. On the job site that already has submissions, click **Remove** and confirm.
4. Create a second job site that has no timesheets, invoices, or holiday requests.
5. On that unused job site, click **Remove** and confirm.
6. Sign in as Worker A and open **Timesheets**.
7. Sign in as Admin B and open **Job sites**.

**Expected result**

- The used job site stays in the list. The page shows: “This job site is used by a timesheet, invoice, or holiday request, so it can't be removed.”
- The unused job site disappears from Admin A’s list.
- Worker A can still select the used job site, and cannot select the removed one.
- Admin B’s job sites are unchanged.
