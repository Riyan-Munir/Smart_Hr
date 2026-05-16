const express = require('express');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const sql = require('mssql');
const jwt = require('jsonwebtoken');
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

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Connected to Azure SQL');
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed:', err);
        // On Vercel, we don't want to crash the process immediately if the connection fails during startup
        // because serverless functions might retry. But for local dev, this is fine.
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    });

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
        if (result.recordset.length === 0 || password !== result.recordset[0].PasswordHash) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = result.recordset[0];
        const token = jwt.sign(
            { id: user.UserID, role: user.RoleName, employeeId: user.EmployeeID, name: `${user.FirstName} ${user.LastName}` },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({ token, user: { name: `${user.FirstName} ${user.LastName}`, role: user.RoleName } });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Lookups (Protected)
app.get('/api/roles', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Roles');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/departments', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Departments');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/designations', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Designations');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/branches', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Branches');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Recruitment: Hire (Complex Enrollment)
app.post('/api/recruitment/hire', authenticateToken, async (req, res) => {
    const e = req.body;
    try {
        const pool = await poolPromise;
        // 1. Enrollment via Stored Procedure
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
            .input('PasswordHash', sql.NVarChar, e.password) // In production hash it
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
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Stats, Attendance, Payroll... 
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const stats = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Employees WHERE EmploymentStatus = 'Active') as ActiveEmployees,
                (SELECT COUNT(*) FROM LeaveRequests WHERE Status = 'Pending') as PendingLeaves,
                (SELECT ISNULL(SUM(NetSalary), 0) FROM Payroll WHERE PayrollMonth = MONTH(GETDATE()) AND PayrollYear = YEAR(GETDATE())) as MonthlyPayout,
                (SELECT COUNT(*) FROM Applicants WHERE Status = 'Applied') as NewApplicants
        `);
        res.json(stats.recordset[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/applicants', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Applicants ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
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
    } catch (err) { res.status(500).json({ message: err.message }); }
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

// Attendance: Mark
app.post('/api/attendance/mark', authenticateToken, async (req, res) => {
    const { checkInTime } = req.body;
    try {
        const pool = await poolPromise;
        
        // Handle time conversion for mssql sql.Time type
        let timeValue = new Date(); // Default to now
        if (checkInTime) {
            const [hours, minutes, seconds] = checkInTime.split(':');
            timeValue = new Date(1970, 0, 1, hours, minutes, seconds || 0);
        }

        await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .input('CheckIn', sql.DateTime, new Date())
            .execute('sp_MarkAttendance');
            
        res.json({ message: 'Attendance marked successfully' });
    } catch (err) { 
        console.error('❌ Attendance Error:', err);
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
                    ISNULL(CAST(WorkingHours AS VARCHAR), '0.0') as Hours
                FROM Attendance 
                WHERE EmployeeID = @EmpID
                ORDER BY AttendanceDate DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Dashboard: High-Level Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const stats = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Employees) as TotalEmployees,
                (SELECT COUNT(*) FROM LeaveRequests WHERE Status = 'Pending') as PendingLeaves,
                (SELECT ISNULL(SUM(NetSalary), 0) FROM Payroll WHERE MONTH(GeneratedDate) = MONTH(GETDATE())) as MonthlyPayroll,
                (SELECT ISNULL(AVG(ProductivityScore), 0) FROM vw_ProductivityScore) as AvgProductivity
        `);
        res.json(stats.recordset[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Analytics: Productivity
app.get('/api/analytics/productivity', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 6 * FROM vw_ProductivityScore ORDER BY ProductivityScore DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Analytics: Risks (Burnout & Attrition)
app.get('/api/analytics/risks', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const risks = await pool.request().query(`
            SELECT TOP 5 e.FirstName + ' ' + e.LastName as Name, 
                   'Burnout' as Category, 
                   CAST(COUNT(a.AttendanceID) AS VARCHAR) + ' Lates' as Risk
            FROM Employees e
            JOIN Attendance a ON e.EmployeeID = a.EmployeeID
            WHERE a.Status = 'Late' AND a.AttendanceDate > DATEADD(day, -30, GETDATE())
            GROUP BY e.EmployeeID, e.FirstName, e.LastName
            HAVING COUNT(a.AttendanceID) >= 2
            UNION ALL
            SELECT TOP 5 e.FirstName + ' ' + e.LastName as Name, 
                   'Attrition' as Category, 
                   'Low Engagement' as Risk
            FROM Employees e
            LEFT JOIN PerformanceReviews pr ON e.EmployeeID = pr.EmployeeID
            LEFT JOIN EmployeeRewardPoints erp ON e.EmployeeID = erp.EmployeeID
            WHERE (pr.Score < 60 OR pr.Score IS NULL) AND erp.PointID IS NULL
            GROUP BY e.EmployeeID, e.FirstName, e.LastName
        `);
        res.json(risks.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Analytics: Personal Performance (Last 7 Days)
app.get('/api/analytics/personal-hours', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT FORMAT(AttendanceDate, 'ddd') as Day, 
                       ISNULL(WorkingHours, 0) as Hours
                FROM Attendance 
                WHERE EmployeeID = @EmpID AND AttendanceDate > DATEADD(day, -7, GETDATE())
                ORDER BY AttendanceDate ASC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
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
    } catch (err) { res.status(500).json({ message: err.message }); }
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
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Payroll: History
app.get('/api/payroll/history', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.*, e.FirstName + ' ' + e.LastName as EmployeeName, e.EmployeeCode
            FROM Payroll p
            JOIN Employees e ON p.EmployeeID = e.EmployeeID
            ORDER BY p.GeneratedDate DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Analytics: Risks
app.get('/api/analytics/risks', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 5 e.FirstName + ' ' + e.LastName as Name, r.BurnoutStatus as Risk, 'Burnout' as Category
            FROM vw_BurnoutRisk r JOIN Employees e ON r.EmployeeID = e.EmployeeID
            UNION
            SELECT TOP 5 e.FirstName + ' ' + e.LastName as Name, r.AttritionRiskLevel as Risk, 'Attrition' as Category
            FROM vw_AttritionRisk r JOIN Employees e ON r.EmployeeID = e.EmployeeID
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
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
app.get('/api/analytics/personal-hours', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmpID', sql.Int, req.user.employeeId)
            .query(`
                SELECT TOP 7 FORMAT(AttendanceDate, 'ddd') as Day, WorkingHours as Hours
                FROM Attendance 
                WHERE EmployeeID = @EmpID 
                ORDER BY AttendanceDate DESC
            `);
        res.json(result.recordset.reverse());
    } catch (err) { res.status(500).json({ message: err.message }); }
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
            await pool.request()
                .input('EmpID', sql.Int, req.user.employeeId)
                .input('Pass', sql.NVarChar, Password)
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

// Analytics: Workforce Distribution
app.get('/api/analytics/workforce', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT d.DepartmentName as name, COUNT(e.EmployeeID) as value
            FROM Departments d
            LEFT JOIN Employees e ON d.DepartmentID = e.DepartmentID
            GROUP BY d.DepartmentName
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- LEAVE MANAGEMENT ---

// Get all Leave Types
app.get('/api/leaves/types', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM LeaveTypes');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: err.message }); }
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
