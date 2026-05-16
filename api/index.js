const express = require('express');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- SMTP CONFIGURATION ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS // Must be a Google App Password
    },
    tls: {
        rejectUnauthorized: false // Helps with some network environments
    }
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ SMTP Verification Failed:', error);
    } else {
        console.log('🚀 SMTP Server is ready to send emails');
    }
});

// Azure SQL Configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// --- DATABASE CONNECTION POOL ---
const poolPromise = (async () => {
    try {
        // Validate Environment Variables
        const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_NAME', 'JWT_SECRET'];
        const missingVars = requiredVars.filter(v => !process.env[v]);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please set them in Vercel settings.`);
        }

        console.log(`🔌 Attempting to connect to SQL Server: ${dbConfig.server}...`);
        const pool = await new sql.ConnectionPool(dbConfig).connect();
        console.log('✅ Connected to Azure SQL');
        return pool;
    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
        // We throw the error so that 'await poolPromise' in routes will fail loudly
        throw err;
    }
})();

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied: No Token' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'SmartHR+ API is running',
        timestamp: new Date().toISOString(),
        env: {
            node: process.version,
            db_configured: !!process.env.DB_SERVER
        }
    });
});

app.get('/api/db-test', async (req, res) => {
    try {
        console.log('🔍 Testing DB connection...');
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT GETDATE() as serverTime');
        res.json({
            status: 'success',
            message: 'Successfully connected to Azure SQL',
            serverTime: result.recordset[0].serverTime
        });
    } catch (err) {
        console.error('❌ DB Test Failed:', err.message);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            details: err.message,
            tip: 'Ensure Azure SQL Firewall allows "Azure Services" or 0.0.0.0/0.'
        });
    }
});

// --- API ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`
                SELECT u.UserID, u.Username, u.PasswordHash, r.RoleName, e.FirstName, e.LastName, e.EmployeeID
                FROM Users u
                JOIN Roles r ON u.RoleID = r.RoleID
                JOIN Employees e ON u.EmployeeID = e.EmployeeID
                WHERE u.Username = @username
            `);
        const user = result.recordset[0];
        
        // Secure Password Check
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        
        // FALLBACK: Allow plaintext comparison for existing users during migration period
        // Remove the '|| password === user.PasswordHash' once all users are migrated
        if (!isPasswordValid && password !== user.PasswordHash) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.UserID, role: user.RoleName, employeeId: user.EmployeeID, name: `${user.FirstName} ${user.LastName}` },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({ token, user: { name: `${user.FirstName} ${user.LastName}`, role: user.RoleName } });
    } catch (err) {
        console.error('❌ Login Error:', err.message);
        res.status(500).json({
            message: 'Database connection or query error',
            details: err.message,
            tip: 'Check Vercel Env Vars and Azure SQL Firewall (Allow Azure Services).'
        });
    }
});

// Lookups (Protected)
// These routes are now handled by the /api/lookups endpoints for better organization
app.get('/api/roles', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Roles');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch roles' }); }
});

app.get('/api/departments', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Departments');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch departments' }); }
});

app.get('/api/designations', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Designations');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch designations' }); }
});

app.get('/api/branches', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Branches');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch branches' }); }
});

// Recruitment: Hire (Complex Enrollment)
app.post('/api/recruitment/hire', authenticateToken, async (req, res) => {
    const e = req.body;
    try {
        const pool = await poolPromise;
        // 1. Enrollment via Stored Procedure
        const hashedPassword = await bcrypt.hash(e.password, 10);
        await pool.request()
            .input('EmployeeCode', sql.NVarChar, e.employeeCode)
            .input('FirstName', sql.NVarChar, e.firstName)
            .input('LastName', sql.NVarChar, e.lastName)
            .input('Gender', sql.NVarChar, e.gender)
            .input('DOB', sql.Date, e.dob)
            .input('CNIC', sql.NVarChar, e.cnic)
            .input('Phone', sql.NVarChar, e.phone)
            .input('Email', sql.NVarChar, e.email)
            .input('Address', sql.NVarChar, e.address)
            .input('DepartmentID', sql.Int, e.departmentID)
            .input('DesignationID', sql.Int, e.designationID)
            .input('BranchID', sql.Int, e.branchID)
            .input('BasicSalary', sql.Decimal, e.basicSalary)
            .input('Username', sql.NVarChar, e.username)
            .input('PasswordHash', sql.NVarChar, hashedPassword) 
            .input('RoleID', sql.Int, e.roleID)
            .execute('sp_AddEmployee');

        // 2. Update Applicant Status
        await pool.request()
            .input('ApplicantID', sql.Int, e.applicantID)
            .query('UPDATE Applicants SET Status = \'Hired\' WHERE ApplicantID = @ApplicantID');

        // 3. Send SMTP Congrats Email
        console.log(`📧 Attempting to send Welcome Email to: ${e.email}...`);
        const mailOptions = {
            from: `"SmartHR+ Human Resources" <${process.env.SMTP_USER}>`,
            to: e.email,
            subject: 'Congratulations! Welcome to SmartHR+',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
                    <h2 style="color: #6366f1;">Welcome to the Team, ${e.firstName}!</h2>
                    <p>We are thrilled to inform you that your application has been accepted.</p>
                    <p><strong>Your Employee Details:</strong></p>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Employee Code:</strong> ${e.employeeCode}</li>
                        <li><strong>Login Username:</strong> ${e.username}</li>
                        <li><strong>Temp Password:</strong> ${e.password}</li>
                    </ul>
                    <p>Please change your password after your first login at our portal.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #777;">This is an automated message from SmartHR+ Recruitment Lifecycle.</p>
                </div>
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email Sent Successfully:', info.response);
            res.json({ message: 'Employee hired and welcome email sent successfully!', info: info.response });
        } catch (mailErr) {
            console.error('⚠️ SQL Success but Email Failed:', mailErr);
            res.json({
                message: 'Employee enrolled in DB, but email notification failed.',
                error: mailErr.message,
                tip: 'Check SMTP credentials or App Password.'
            });
        }
    } catch (err) {
        console.error('❌ Hiring Process Error:', err);
        let userMessage = 'An unexpected error occurred during enrollment.';

        // Handle SQL Constraint Violations (Duplicate Keys, etc.)
        if (err.number === 2627 || err.number === 2601 || err.message.includes('Violation of UNIQUE KEY')) {
            if (err.message.includes('Email')) userMessage = 'This Email is already registered to an active employee.';
            else if (err.message.includes('EmployeeCode')) userMessage = 'The Employee Code provided is already in use.';
            else if (err.message.includes('CNIC')) userMessage = 'The CNIC/ID Number is already associated with an existing record.';
            else userMessage = 'A duplicate record was found. Please ensure all unique identifiers are correct.';
        } else if (err.number === 547) {
            userMessage = 'Database reference error: One of the selected lookups (Dept/Branch/Role) is invalid.';
        } else {
            userMessage = err.message;
        }
        res.status(400).json({ message: userMessage });
    }
});

// Recruitment: Reject
app.post('/api/recruitment/reject/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const applicant = await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('SELECT Email, FirstName FROM Applicants WHERE ApplicantID = @ID');

        if (applicant.recordset.length > 0) {
            const { Email, FirstName } = applicant.recordset[0];
            await pool.request()
                .input('ID', sql.Int, req.params.id)
                .query('UPDATE Applicants SET Status = \'Rejected\' WHERE ApplicantID = @ID');

            const mailOptions = {
                from: `"SmartHR+ Recruitment" <${process.env.SMTP_USER}>`,
                to: Email,
                subject: 'Update regarding your application at SmartHR+',
                text: `Dear ${FirstName},\n\nThank you for your interest in SmartHR+. After careful consideration, we have decided not to move forward with your application at this time.\n\nWe wish you the best in your future endeavors.`
            };

            console.log(`📧 Sending rejection email to: ${Email}...`);
            try {
                await transporter.sendMail(mailOptions);
                console.log('✅ Rejection email sent.');
            } catch (mailErr) {
                console.error('⚠️ Rejection Email Failed:', mailErr);
            }
        }
        res.json({ message: 'Applicant processed and notified' });
    } catch (err) {
        console.error('❌ Rejection Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Public: Submit Application
app.post('/api/public/apply', async (req, res) => {
    const { firstName, lastName, email, phone, gender, dob, cnic, address, position, proposalText, desiredRoleID } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('FirstName', sql.NVarChar, firstName)
            .input('LastName', sql.NVarChar, lastName)
            .input('Email', sql.NVarChar, email)
            .input('Phone', sql.NVarChar, phone)
            .input('Gender', sql.NVarChar, gender)
            .input('DOB', sql.Date, dob)
            .input('CNIC', sql.NVarChar, cnic)
            .input('Address', sql.NVarChar, address)
            .input('Position', sql.NVarChar, position)
            .input('Proposal', sql.NVarChar, proposalText)
            .input('RoleID', sql.Int, desiredRoleID)
            .query(`
                INSERT INTO Applicants (FirstName, LastName, Email, Phone, Gender, DOB, CNIC, Address, AppliedPosition, ProposalText, DesiredRoleID, Status)
                VALUES (@FirstName, @LastName, @Email, @Phone, @Gender, @DOB, @CNIC, @Address, @Position, @Proposal, @RoleID, 'Applied')
            `);
        res.json({ message: 'Application submitted successfully' });
    } catch (err) {
        let userMessage = err.message;
        if (err.number === 2627 || err.number === 2601) {
            userMessage = 'You have already submitted an application with this email address.';
        }
        res.status(400).json({ message: userMessage });
    }
});

app.get('/api/public/roles', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RoleID, RoleName FROM Roles');
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Public Roles Error:', err.message);
        res.status(500).json({
            message: 'Failed to fetch roles',
            details: err.message
        });
    }
});

// Stats, Attendance, Payroll... 

app.get('/api/applicants', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Applicants ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch applicants' }); }
});

// Employees: List
app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT e.*, d.DepartmentName, des.DesignationName, b.BranchName
            FROM Employees e
            JOIN Departments d ON e.DepartmentID = d.DepartmentID
            JOIN Designations des ON e.DesignationID = des.DesignationID
            JOIN Branches b ON e.BranchID = b.BranchID
            ORDER BY e.CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch employees' }); }
});

// Employees: Enroll (from EmployeeList.jsx quick-add modal)
// Note: For full hire flow use /api/recruitment/hire instead
app.post('/api/employees', authenticateToken, async (req, res) => {
    const { EmployeeCode, FirstName, LastName, Gender, DOB, CNIC, Phone, Email, Address,
            DepartmentID, DesignationID, BranchID, BasicSalary } = req.body;
    try {
        const pool = await poolPromise;
        // Generate a temporary username and password for the quick-enroll flow
        const tempUsername = `${FirstName.toLowerCase()}.${LastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
        const tempPassword = `TempPass${Math.floor(1000 + Math.random() * 9000)}!`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Default role to Employee (RoleID = 4 — adjust if your seed differs)
        const roleResult = await pool.request().query(`SELECT TOP 1 RoleID FROM Roles WHERE RoleName LIKE '%Employee%'`);
        const roleID = roleResult.recordset[0]?.RoleID || 4;

        await pool.request()
            .input('EmployeeCode', sql.NVarChar, EmployeeCode)
            .input('FirstName', sql.NVarChar, FirstName)
            .input('LastName', sql.NVarChar, LastName)
            .input('Gender', sql.NVarChar, Gender || 'Male')
            .input('DOB', sql.Date, DOB || '1990-01-01')
            .input('CNIC', sql.NVarChar, CNIC)
            .input('Phone', sql.NVarChar, Phone || 'N/A')
            .input('Email', sql.NVarChar, Email)
            .input('Address', sql.NVarChar, Address || 'N/A')
            .input('DepartmentID', sql.Int, DepartmentID)
            .input('DesignationID', sql.Int, DesignationID)
            .input('BranchID', sql.Int, BranchID)
            .input('BasicSalary', sql.Decimal, BasicSalary)
            .input('Username', sql.NVarChar, tempUsername)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .input('RoleID', sql.Int, roleID)
            .execute('sp_AddEmployee');

        res.json({ message: `Employee enrolled. Temp username: ${tempUsername}` });
    } catch (err) {
        console.error('❌ Employee Enroll Error:', err);
        let userMessage = 'Enrollment failed.';
        if (err.number === 2627 || err.number === 2601) {
            userMessage = 'A duplicate CNIC, Email, or Employee Code was found.';
        } else {
            userMessage = err.message;
        }
        res.status(400).json({ message: userMessage });
    }
});

// Payroll: Generate
app.post('/api/payroll/generate', authenticateToken, async (req, res) => {
    const { month, year } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Month', sql.Int, month)
            .input('Year', sql.Int, year)
            .execute('sp_GenerateMonthlyPayroll');
        res.json({ message: 'Payroll generated successfully' });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// Payroll: History
// Note: Payroll table has no Status column — using 'Processed' as computed value
app.get('/api/payroll/history', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.*, 
                   e.FirstName + ' ' + e.LastName as EmployeeName, 
                   e.EmployeeCode,
                   'Processed' as Status
            FROM Payroll p
            JOIN Employees e ON p.EmployeeID = e.EmployeeID
            ORDER BY p.GeneratedDate DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch payroll history' }); }
});

// Attendance: Mark
app.post('/api/attendance/mark', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        // sp_MarkAttendance expects @EmployeeID INT and @CheckInTime TIME
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        await pool.request()
            .input('EmployeeID', sql.Int, req.user.employeeId)
            .input('CheckInTime', sql.VarChar(8), timeStr)
            .execute('sp_MarkAttendance');

        res.json({ message: 'Attendance marked successfully' });
    } catch (err) {
        console.error('❌ Attendance Error:', err);
        // Return the SP error message directly (e.g. 'already marked for today')
        res.status(400).json({ message: err.message });
    }
});

// Attendance: History
app.get('/api/attendance/history', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT 
                    FORMAT(AttendanceDate, 'yyyy-MM-dd') as Date,
                    ISNULL(FORMAT(CheckInTime, 'hh:mm tt'), 'NOT RECORDED') as CheckIn,
                    ISNULL(FORMAT(CheckOutTime, 'hh:mm tt'), 'NOT RECORDED') as CheckOut,
                    Status,
                    ISNULL(CAST(WorkingHours AS VARCHAR), '0.0') as Hours,
                    CASE WHEN CheckOutTime IS NOT NULL THEN 1 ELSE 0 END as CheckedOut
                FROM Attendance 
                WHERE EmployeeID = @EmpID
                ORDER BY AttendanceDate DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch attendance history' }); }
});

// Attendance: Clock Out
app.post('/api/attendance/checkout', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const now = new Date();
        const checkOutStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        // Check today's attendance record exists and hasn't already been checked out
        const existing = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT AttendanceID, CheckInTime, CheckOutTime 
                FROM Attendance 
                WHERE EmployeeID = @EmpID AND AttendanceDate = CAST(GETDATE() AS DATE)
            `);

        if (existing.recordset.length === 0) {
            return res.status(400).json({ message: 'No check-in found for today. Please clock in first.' });
        }
        if (existing.recordset[0].CheckOutTime !== null) {
            return res.status(400).json({ message: 'You have already clocked out for today.' });
        }

        const { AttendanceID, CheckInTime } = existing.recordset[0];

        // Update checkout time and calculate working hours
        await pool.request()
            .input('ID', sql.Int, AttendanceID)
            .input('CheckOut', sql.VarChar(8), checkOutStr)
            .query(`
                UPDATE Attendance 
                SET CheckOutTime = @CheckOut,
                    WorkingHours = CAST(
                        DATEDIFF(MINUTE, CheckInTime, CAST(@CheckOut AS TIME)) / 60.0
                    AS DECIMAL(4,2))
                WHERE AttendanceID = @ID
            `);

        res.json({ message: `Clocked out at ${checkOutStr}. Working hours recorded.` });
    } catch (err) {
        console.error('❌ Checkout Error:', err);
        res.status(500).json({ message: err.message });
    }
});


// --- DASHBOARD & ANALYTICS ---
// Combined Stats for Admin and General Dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const stats = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Employees WHERE EmploymentStatus = 'Active') as ActiveEmployees,
                (SELECT COUNT(*) FROM Employees) as TotalEmployees,
                (SELECT COUNT(*) FROM LeaveRequests WHERE Status = 'Pending') as PendingLeaves,
                (SELECT ISNULL(SUM(NetSalary), 0) FROM Payroll WHERE PayrollMonth = MONTH(GETDATE()) AND PayrollYear = YEAR(GETDATE())) as MonthlyPayout,
                (SELECT ISNULL(SUM(NetSalary), 0) FROM Payroll WHERE MONTH(GeneratedDate) = MONTH(GETDATE())) as MonthlyPayroll,
                (SELECT COUNT(*) FROM Applicants WHERE Status = 'Applied') as NewApplicants,
                (SELECT ISNULL(AVG(ProductivityScore), 0) FROM vw_ProductivityScore) as AvgProductivity
        `);
        res.json(stats.recordset[0]);
    } catch (err) { 
        console.error('❌ Stats Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch dashboard statistics' }); 
    }
});

// Analytics: Productivity
app.get('/api/analytics/productivity', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 6 * FROM vw_ProductivityScore ORDER BY ProductivityScore DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Analytics: Predictive Risks (Burnout & Attrition)
app.get('/api/analytics/risks', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const risks = await pool.request().query(`
            SELECT * FROM (
                SELECT TOP 5
                    e.FirstName + ' ' + e.LastName as Name,
                    'Burnout' as Category,
                    CAST(COUNT(a.AttendanceID) AS NVARCHAR) + ' Late Days' as Risk
                FROM Employees e
                JOIN Attendance a ON e.EmployeeID = a.EmployeeID
                WHERE a.Status = 'Late'
                  AND a.AttendanceDate > DATEADD(day, -30, GETDATE())
                GROUP BY e.EmployeeID, e.FirstName, e.LastName
                HAVING COUNT(a.AttendanceID) >= 2
                ORDER BY COUNT(a.AttendanceID) DESC
            ) AS Burnout

            UNION ALL

            SELECT * FROM (
                SELECT TOP 5
                    e.FirstName + ' ' + e.LastName as Name,
                    'Attrition' as Category,
                    'Low Engagement' as Risk
                FROM Employees e
                WHERE e.EmploymentStatus = 'Active'
                  AND NOT EXISTS (
                      SELECT 1 FROM EmployeeRewardPoints erp WHERE erp.EmployeeID = e.EmployeeID
                  )
                  AND (
                      NOT EXISTS (SELECT 1 FROM PerformanceReviews pr WHERE pr.EmployeeID = e.EmployeeID)
                      OR EXISTS (SELECT 1 FROM PerformanceReviews pr WHERE pr.EmployeeID = e.EmployeeID AND pr.Score < 60)
                  )
                ORDER BY e.FirstName
            ) AS Attrition
        `);
        res.json(risks.recordset);
    } catch (err) { 
        console.error('❌ Risks Error:', err.message);
        res.status(500).json({ message: 'Failed to calculate workforce risks' }); 
    }
});



// Dashboard: Announcements
app.get('/api/dashboard/announcements', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 3 * FROM Notifications WHERE Title LIKE \'%Announ%\' OR Title LIKE \'%Global%\' ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Analytics: Personal Hours
// Analytics: Personal Performance (Last 7 Days)
app.get('/api/analytics/personal-hours', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT TOP 7 FORMAT(AttendanceDate, 'ddd') as Day, ISNULL(WorkingHours, 0) as Hours
                FROM Attendance 
                WHERE EmployeeID = @EmpID 
                ORDER BY AttendanceDate DESC
            `);
        res.json(result.recordset.reverse());
    } catch (err) { 
        console.error('❌ Personal Hours Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch personal performance data' }); 
    }
});

// Dashboard: Employee Specific Summary
app.get('/api/dashboard/employee-summary', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const summary = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT 
                    (SELECT dbo.fn_GetLeaveBalance(@EmpID, 1)) as RemainingLeaves,
                    (SELECT TOP 1 Status FROM Attendance WHERE EmployeeID = @EmpID AND AttendanceDate = CAST(GETDATE() AS DATE)) as TodayStatus,
                    (SELECT ISNULL(SUM(Points), 0) FROM EmployeeRewardPoints WHERE EmployeeID = @EmpID) as RewardPoints,
                    (SELECT TOP 1 CAST(ReviewDate AS DATE) FROM PerformanceReviews WHERE EmployeeID = @EmpID ORDER BY ReviewDate DESC) as LastReview
            `);
        res.json(summary.recordset[0]);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch employee summary' }); }
});

// Analytics: Workforce Distribution (By Department)
app.get('/api/analytics/workforce', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT d.DepartmentName as name, COUNT(e.EmployeeID) as value
            FROM Departments d
            LEFT JOIN Employees e ON d.DepartmentID = e.DepartmentID
            GROUP BY d.DepartmentName
            HAVING COUNT(e.EmployeeID) > 0
        `);
        res.json(result.recordset);
    } catch (err) { 
        console.error('❌ Workforce Analytics Error:', err.message);
        res.status(500).json({ message: 'Failed to calculate workforce distribution' }); 
    }
});

// Profile: Get Details
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT e.*, d.DepartmentName, des.DesignationName, b.BranchName
                FROM Employees e
                JOIN Departments d ON e.DepartmentID = d.DepartmentID
                JOIN Designations des ON e.DesignationID = des.DesignationID
                JOIN Branches b ON e.BranchID = b.BranchID
                WHERE e.EmployeeID = @EmpID
            `);
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Profile: Update
app.post('/api/profile/update', authenticateToken, async (req, res) => {
    const { FirstName, LastName, Phone, Address, Gender, DOB, CNIC, Password } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .input('FN', sql.NVarChar, FirstName)
            .input('LN', sql.NVarChar, LastName)
            .input('Phone', sql.NVarChar, Phone)
            .input('Address', sql.NVarChar, Address)
            .input('Gender', sql.NVarChar, Gender)
            .input('DOB', sql.Date, DOB)
            .input('CNIC', sql.NVarChar, CNIC)
            .query(`
                UPDATE Employees 
                SET FirstName = @FN, LastName = @LN, Phone = @Phone, 
                    Address = @Address, Gender = @Gender, DOB = @DOB, CNIC = @CNIC 
                WHERE EmployeeID = @EmpID
            `);

        if (Password) {
            const hashedPass = await bcrypt.hash(Password, 10);
            await pool.request()
                .input('EmpID', sql.Int, req.user.employeeId)
                .input('Pass', sql.NVarChar, hashedPass)
                .query('UPDATE Users SET PasswordHash = @Pass WHERE EmployeeID = @EmpID');
        }
        res.json({ message: 'Profile updated successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Notifications: Get Unread
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query('SELECT * FROM Notifications WHERE EmployeeID = @EmpID AND IsRead = 0 ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Notifications: Mark as Read
app.post('/api/notifications/read/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('UPDATE Notifications SET IsRead = 1 WHERE NotificationID = @ID');
        res.json({ message: 'Notification marked as read' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Employee: Get History
app.get('/api/employees/history/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.params.id)
            .query(`
                SELECT h.*, 
                       d1.DepartmentName as OldDept, d2.DepartmentName as NewDept,
                       ds1.DesignationName as OldDesig, ds2.DesignationName as NewDesig
                FROM EmployeeHistory h
                LEFT JOIN Departments d1 ON h.OldDepartmentID = d1.DepartmentID
                LEFT JOIN Departments d2 ON h.NewDepartmentID = d2.DepartmentID
                LEFT JOIN Designations ds1 ON h.OldDesignationID = ds1.DesignationID
                LEFT JOIN Designations ds2 ON h.NewDesignationID = ds2.DesignationID
                WHERE h.EmployeeID = @EmpID
                ORDER BY h.ChangeDate DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Broadcast Announcement
app.post('/api/broadcast', authenticateToken, async (req, res) => {
    const { title, message } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Title', sql.NVarChar, `[Global Announcement] ${title}`)
            .input('Msg', sql.NVarChar, message)
            .query('INSERT INTO Notifications (EmployeeID, Title, Message) SELECT EmployeeID, @Title, @Msg FROM Employees');
        res.json({ message: 'Broadcast sent to all employees' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- LEAVE MANAGEMENT ---

// Get all Leave Types
app.get('/api/leaves/types', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM LeaveTypes');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch leave types' }); }
});

// Get Leave Balance for current user
app.get('/api/leaves/balance/:typeID', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .input('TypeID', sql.Int, req.params.typeID)
            .query('SELECT dbo.fn_GetLeaveBalance(@EmpID, @TypeID) as Balance');
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Apply for Leave
app.post('/api/leaves/apply', authenticateToken, async (req, res) => {
    const { leaveTypeID, startDate, endDate, reason } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .input('TypeID', sql.Int, leaveTypeID)
            .input('Start', sql.Date, startDate)
            .input('End', sql.Date, endDate)
            .input('Reason', sql.NVarChar, reason)
            .query(`
                INSERT INTO LeaveRequests (EmployeeID, LeaveTypeID, StartDate, EndDate, Reason, Status)
                VALUES (@EmpID, @TypeID, @Start, @End, @Reason, 'Pending')
            `);
        res.json({ message: 'Leave application submitted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get My Leaves
app.get('/api/leaves/my', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT lr.*, lt.LeaveTypeName 
                FROM LeaveRequests lr 
                JOIN LeaveTypes lt ON lr.LeaveTypeID = lt.LeaveTypeID
                WHERE lr.EmployeeID = @EmpID
                ORDER BY lr.AppliedDate DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Get All Pending Leaves
app.get('/api/leaves/pending', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT lr.*, lt.LeaveTypeName, e.FirstName, e.LastName 
                FROM LeaveRequests lr 
                JOIN LeaveTypes lt ON lr.LeaveTypeID = lt.LeaveTypeID
                JOIN Employees e ON lr.EmployeeID = e.EmployeeID
                WHERE lr.Status = 'Pending'
                ORDER BY lr.AppliedDate ASC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Respond to Leave
app.post('/api/leaves/respond/:id', authenticateToken, async (req, res) => {
    const { status } = req.body; // 'Approved' or 'Rejected'
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .input('Status', sql.NVarChar, status)
            .query('UPDATE LeaveRequests SET Status = @Status WHERE LeaveRequestID = @ID');

        // If approved, add a notification for the employee
        if (status === 'Approved' || status === 'Rejected') {
            const leaveRes = await pool.request().input('ID', sql.Int, req.params.id).query('SELECT EmployeeID FROM LeaveRequests WHERE LeaveRequestID = @ID');
            const empID = leaveRes.recordset[0].EmployeeID;
            await pool.request()
                .input('EmpID', sql.Int, empID)
                .input('Title', sql.NVarChar, `Leave Request ${status}`)
                .input('Msg', sql.NVarChar, `Your leave request has been ${status.toLowerCase()} by HR.`)
                .query('INSERT INTO Notifications (EmployeeID, Title, Message) VALUES (@EmpID, @Title, @Msg)');
        }

        res.json({ message: `Leave request ${status.toLowerCase()}` });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- PERFORMANCE & REWARDS ---

// Admin: Create Performance Review
app.post('/api/performance/review', authenticateToken, async (req, res) => {
    const { employeeID, score, comments } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('ReviewerID', sql.Int, req.user.employeeId)
            .input('Score', sql.Int, score)
            .input('Comments', sql.NVarChar, comments)
            .query(`
                INSERT INTO PerformanceReviews (EmployeeID, ReviewerID, Score, Comments)
                VALUES (@EmpID, @ReviewerID, @Score, @Comments)
            `);

        // Notify employee
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('Title', sql.NVarChar, 'New Performance Review')
            .input('Msg', sql.NVarChar, `A new performance review has been published. Score: ${score}/100`)
            .query('INSERT INTO Notifications (EmployeeID, Title, Message) VALUES (@EmpID, @Title, @Msg)');

        res.json({ message: 'Review published successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Award Reward Points
app.post('/api/performance/reward', authenticateToken, async (req, res) => {
    const { employeeID, points, reason } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('Points', sql.Int, points)
            .input('Reason', sql.NVarChar, reason)
            .query(`
                INSERT INTO EmployeeRewardPoints (EmployeeID, Points, Reason)
                VALUES (@EmpID, @Points, @Reason)
            `);

        // Notify employee
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('Title', sql.NVarChar, 'Reward Points Awarded!')
            .input('Msg', sql.NVarChar, `You have been awarded ${points} reward points for: ${reason}`)
            .query('INSERT INTO Notifications (EmployeeID, Title, Message) VALUES (@EmpID, @Title, @Msg)');

        res.json({ message: 'Reward points awarded successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- BONUSES ---

app.get('/api/bonuses', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT b.*, e.FirstName + ' ' + e.LastName as EmployeeName, e.EmployeeCode
            FROM Bonuses b
            JOIN Employees e ON b.EmployeeID = e.EmployeeID
            ORDER BY b.BonusDate DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch bonuses' }); }
});

app.post('/api/bonuses', authenticateToken, async (req, res) => {
    const { employeeID, bonusType, bonusAmount } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('Type', sql.NVarChar, bonusType)
            .input('Amount', sql.Decimal, bonusAmount)
            .query('INSERT INTO Bonuses (EmployeeID, BonusType, BonusAmount) VALUES (@EmpID, @Type, @Amount)');
        res.json({ message: 'Bonus added successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/bonuses/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM Bonuses WHERE BonusID = @ID');
        res.json({ message: 'Bonus removed' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- DEDUCTIONS ---

app.get('/api/deductions', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT d.*, e.FirstName + ' ' + e.LastName as EmployeeName, e.EmployeeCode
            FROM Deductions d
            JOIN Employees e ON d.EmployeeID = e.EmployeeID
            ORDER BY d.DeductionDate DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch deductions' }); }
});

app.post('/api/deductions', authenticateToken, async (req, res) => {
    const { employeeID, deductionType, deductionAmount } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('Type', sql.NVarChar, deductionType)
            .input('Amount', sql.Decimal, deductionAmount)
            .query('INSERT INTO Deductions (EmployeeID, DeductionType, DeductionAmount) VALUES (@EmpID, @Type, @Amount)');
        res.json({ message: 'Deduction added successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/deductions/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM Deductions WHERE DeductionID = @ID');
        res.json({ message: 'Deduction removed' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- SALARY STRUCTURE ---

app.get('/api/salary-structure', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ss.*, e.FirstName + ' ' + e.LastName as EmployeeName, e.EmployeeCode
            FROM SalaryStructure ss
            JOIN Employees e ON ss.EmployeeID = e.EmployeeID
            ORDER BY e.FirstName
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch salary structures' }); }
});

app.get('/api/salary-structure/:empId', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.params.empId)
            .query('SELECT * FROM SalaryStructure WHERE EmployeeID = @EmpID');
        res.json(result.recordset[0] || null);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/salary-structure', authenticateToken, async (req, res) => {
    const { employeeID, basicSalary, houseAllowance, medicalAllowance, transportAllowance } = req.body;
    try {
        const pool = await poolPromise;
        // Upsert: update if exists, insert if not
        const existing = await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .query('SELECT SalaryID FROM SalaryStructure WHERE EmployeeID = @EmpID');

        if (existing.recordset.length > 0) {
            await pool.request()
                .input('EmpID', sql.Int, employeeID)
                .input('Basic', sql.Decimal, basicSalary)
                .input('House', sql.Decimal, houseAllowance || 0)
                .input('Medical', sql.Decimal, medicalAllowance || 0)
                .input('Transport', sql.Decimal, transportAllowance || 0)
                .query(`UPDATE SalaryStructure 
                        SET BasicSalary=@Basic, HouseAllowance=@House, MedicalAllowance=@Medical, TransportAllowance=@Transport
                        WHERE EmployeeID=@EmpID`);
        } else {
            await pool.request()
                .input('EmpID', sql.Int, employeeID)
                .input('Basic', sql.Decimal, basicSalary)
                .input('House', sql.Decimal, houseAllowance || 0)
                .input('Medical', sql.Decimal, medicalAllowance || 0)
                .input('Transport', sql.Decimal, transportAllowance || 0)
                .query(`INSERT INTO SalaryStructure (EmployeeID, BasicSalary, HouseAllowance, MedicalAllowance, TransportAllowance)
                        VALUES (@EmpID, @Basic, @House, @Medical, @Transport)`);
        }
        res.json({ message: 'Salary structure saved' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- TAX SLABS ---

app.get('/api/tax-slabs', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM TaxSlabs ORDER BY MinSalary ASC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch tax slabs' }); }
});

app.post('/api/tax-slabs', authenticateToken, async (req, res) => {
    const { minSalary, maxSalary, taxPercentage } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Min', sql.Decimal, minSalary)
            .input('Max', sql.Decimal, maxSalary)
            .input('Tax', sql.Decimal, taxPercentage)
            .query('INSERT INTO TaxSlabs (MinSalary, MaxSalary, TaxPercentage) VALUES (@Min, @Max, @Tax)');
        res.json({ message: 'Tax slab added' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/tax-slabs/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM TaxSlabs WHERE TaxSlabID = @ID');
        res.json({ message: 'Tax slab removed' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- SHIFTS ---

app.get('/api/shifts', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Shifts ORDER BY ShiftName');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch shifts' }); }
});

app.post('/api/shifts', authenticateToken, async (req, res) => {
    const { shiftName, startTime, endTime } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Name', sql.NVarChar, shiftName)
            .input('Start', sql.VarChar(8), startTime)
            .input('End', sql.VarChar(8), endTime)
            .query('INSERT INTO Shifts (ShiftName, StartTime, EndTime) VALUES (@Name, @Start, @End)');
        res.json({ message: 'Shift created' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/shifts/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM Shifts WHERE ShiftID = @ID');
        res.json({ message: 'Shift deleted' });
    } catch (err) { res.status(400).json({ message: 'Cannot delete shift. It may be assigned to employees.' }); }
});

// Employee Shift Assignment
app.get('/api/shifts/assignments', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT es.*, e.FirstName + ' ' + e.LastName as EmployeeName, e.EmployeeCode,
                   s.ShiftName, CONVERT(NVARCHAR(8), s.StartTime, 108) as StartTime, 
                   CONVERT(NVARCHAR(8), s.EndTime, 108) as EndTime
            FROM EmployeeShifts es
            JOIN Employees e ON es.EmployeeID = e.EmployeeID
            JOIN Shifts s ON es.ShiftID = s.ShiftID
            ORDER BY es.AssignedDate DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch assignments' }); }
});

app.post('/api/shifts/assign', authenticateToken, async (req, res) => {
    const { employeeID, shiftID } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('EmpID', sql.Int, employeeID)
            .input('ShiftID', sql.Int, shiftID)
            .query('INSERT INTO EmployeeShifts (EmployeeID, ShiftID, AssignedDate) VALUES (@EmpID, @ShiftID, CAST(GETDATE() AS DATE))');
        res.json({ message: 'Shift assigned successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- KPIs ---

app.get('/api/kpis', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM KPIs ORDER BY KPIName');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch KPIs' }); }
});

app.post('/api/kpis', authenticateToken, async (req, res) => {
    const { kpiName, kpiWeight } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Name', sql.NVarChar, kpiName)
            .input('Weight', sql.Decimal, kpiWeight)
            .query('INSERT INTO KPIs (KPIName, KPIWeight) VALUES (@Name, @Weight)');
        res.json({ message: 'KPI created' });
    } catch (err) { res.status(500).json({ message: 'KPI name must be unique. ' + err.message }); }
});

app.delete('/api/kpis/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM KPIs WHERE KPIID = @ID');
        res.json({ message: 'KPI deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- INTERVIEWS ---

app.get('/api/interviews', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT i.*, a.FirstName + ' ' + a.LastName as ApplicantName, 
                   a.AppliedPosition, a.Email as ApplicantEmail
            FROM Interviews i
            JOIN Applicants a ON i.ApplicantID = a.ApplicantID
            ORDER BY i.InterviewDate DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch interviews' }); }
});

app.post('/api/interviews', authenticateToken, async (req, res) => {
    const { applicantID, interviewDate, feedback } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('AppID', sql.Int, applicantID)
            .input('Date', sql.DateTime, new Date(interviewDate))
            .input('Feedback', sql.NVarChar, feedback || '')
            .query('INSERT INTO Interviews (ApplicantID, InterviewDate, Feedback) VALUES (@AppID, @Date, @Feedback)');
        res.json({ message: 'Interview scheduled' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/interviews/:id', authenticateToken, async (req, res) => {
    const { interviewScore, feedback } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .input('Score', sql.Int, interviewScore)
            .input('Feedback', sql.NVarChar, feedback)
            .query('UPDATE Interviews SET InterviewScore = @Score, Feedback = @Feedback WHERE InterviewID = @ID');
        res.json({ message: 'Interview result recorded' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- LOOKUP MANAGEMENT ---


// Branches
app.get('/api/lookups/branches', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Branches');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/lookups/branches', authenticateToken, async (req, res) => {
    const { name, city, country } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('City', sql.NVarChar, city)
            .input('Country', sql.NVarChar, country)
            .query('INSERT INTO Branches (BranchName, City, Country) VALUES (@Name, @City, @Country)');
        res.json({ message: 'Branch added successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/lookups/branches/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM Branches WHERE BranchID = @ID');
        res.json({ message: 'Branch deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Cannot delete branch. It may be linked to existing employees or other records.' });
    }
});

// Departments
app.get('/api/lookups/departments', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Departments');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/lookups/departments', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .query('INSERT INTO Departments (DepartmentName) VALUES (@Name)');
        res.json({ message: 'Department added successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/lookups/departments/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM Departments WHERE DepartmentID = @ID');
        res.json({ message: 'Department deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Cannot delete department. It may have linked employees or data.' });
    }
});

// Designations
app.get('/api/lookups/designations', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Designations');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/lookups/designations', authenticateToken, async (req, res) => {
    const { name, baseSalary } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Base', sql.Decimal, baseSalary)
            .query('INSERT INTO Designations (DesignationName, BaseSalary) VALUES (@Name, @Base)');
        res.json({ message: 'Designation added successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/lookups/designations/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ID', sql.Int, req.params.id)
            .query('DELETE FROM Designations WHERE DesignationID = @ID');
        res.json({ message: 'Designation deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Cannot delete designation. It may be assigned to employees.' });
    }
});

// --- ANALYTICS & DASHBOARD ---
app.get('/api/profile/metrics', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const empID = req.user.employeeId;

        // 1. Attendance Streak (consecutive Present)
        const streakRes = await pool.request()
            .input('EmpID', sql.Int, empID)
            .query(`
                WITH Groups AS (
                    SELECT Status, AttendanceDate,
                           ROW_NUMBER() OVER (ORDER BY AttendanceDate DESC) - 
                           ROW_NUMBER() OVER (PARTITION BY Status ORDER BY AttendanceDate DESC) as grp
                    FROM Attendance WHERE EmployeeID = @EmpID
                ),
                LatestGroup AS (
                    SELECT TOP 1 Status, COUNT(*) as Streak
                    FROM Groups
                    WHERE Status = 'Present'
                    GROUP BY grp, Status
                    ORDER BY MIN(AttendanceDate) DESC
                )
                SELECT ISNULL((SELECT Streak FROM LatestGroup), 0) as Streak
            `);

        // 2. Peer Recognition (Count of reward entries)
        const peerRes = await pool.request()
            .input('EmpID', sql.Int, empID)
            .query('SELECT COUNT(*) as Count FROM EmployeeRewardPoints WHERE EmployeeID = @EmpID');

        // 3. Efficiency (Latest Review Score)
        const effRes = await pool.request()
            .input('EmpID', sql.Int, empID)
            .query('SELECT TOP 1 Score FROM PerformanceReviews WHERE EmployeeID = @EmpID ORDER BY ReviewDate DESC');

        const role = req.user.role;
        const security = role.includes('Admin') || role.includes('Director') ? 'Maximum' : 'Standard';

        res.json({
            streak: streakRes.recordset[0].Streak > 0 ? `${streakRes.recordset[0].Streak} Days` : '0 Days',
            recognition: `+${peerRes.recordset[0].Count}`,
            efficiency: effRes.recordset[0] ? `${effRes.recordset[0].Score}%` : 'N/A',
            security: security
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Advanced Workforce Intelligence
app.get('/api/analytics/workforce-pulse', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;

        // 1. Departmental Punctuality Leaderboard
        const deptLeaderboard = await pool.request().query(`
            SELECT d.DepartmentName, 
                   COUNT(a.AttendanceID) as TotalDays,
                   SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.AttendanceID) as PunctualityRate
            FROM Attendance a
            JOIN Employees e ON a.EmployeeID = e.EmployeeID
            JOIN Departments d ON e.DepartmentID = d.DepartmentID
            GROUP BY d.DepartmentName
            ORDER BY PunctualityRate DESC
        `);

        // 2. High-Performance Burnout Risk (High rewards but also high late count/long hours)
        const burnoutRisk = await pool.request().query(`
            SELECT TOP 5 e.FirstName + ' ' + e.LastName as Name, d.DepartmentName,
                   (SELECT COUNT(*) FROM Attendance WHERE EmployeeID = e.EmployeeID AND Status = 'Late') as LateCount,
                   (SELECT ISNULL(SUM(Points), 0) FROM EmployeeRewardPoints WHERE EmployeeID = e.EmployeeID) as TotalPoints
            FROM Employees e
            JOIN Departments d ON e.DepartmentID = d.DepartmentID
            ORDER BY TotalPoints DESC, LateCount DESC
        `);

        // 3. Operational Presence (By Branch)
        const branchPresence = await pool.request().query(`
            SELECT b.BranchName, COUNT(e.EmployeeID) as TotalEmployees,
                   (SELECT COUNT(*) FROM Attendance a2 JOIN Employees e2 ON a2.EmployeeID = e2.EmployeeID 
                    WHERE e2.BranchID = b.BranchID AND a2.AttendanceDate = CAST(GETDATE() AS DATE)) as PresentToday
            FROM Branches b
            LEFT JOIN Employees e ON b.BranchID = e.BranchID
            GROUP BY b.BranchID, b.BranchName
        `);

        res.json({
            leaderboard: deptLeaderboard.recordset,
            burnout: burnoutRisk.recordset,
            presence: branchPresence.recordset
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`🚀 SmartHR+ Server running at http://localhost:${port}`));
}

module.exports = app;
