import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

console.log("Server file loaded.");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("fleet.db");
db.pragma('foreign_keys = ON');

// Global Error Handlers
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Email Setup (Optional - will use mock if config is missing)
const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

async function sendEmail(to: string, subject: string, text: string) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"FleetMaster" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text
      });
      console.log(`[Email] Sent to ${to}`);
    } catch (error) {
      console.error("[Email Error]", error);
    }
  } else {
    console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Message: ${text}`);
  }
}

async function startServer() {
  console.log("startServer function called.");
  
  // Initialize database
  console.log("Initializing database...");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS vehicle_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT UNIQUE NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      last_service_date TEXT,
      mileage INTEGER DEFAULT 0,
      holder TEXT,
      owner TEXT,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES vehicle_categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_number TEXT UNIQUE NOT NULL,
      phone TEXT,
      email TEXT,
      assigned_vehicle_id INTEGER,
      FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      cost REAL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      role TEXT DEFAULT 'viewer'
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
    console.log("Core tables created successfully.");
  } catch (err) {
    console.error("CRITICAL ERROR during database initialization:", err);
    process.exit(1);
  }

  // Helper to add column if not exists
  const addColumnIfNotExists = (tableName: string, columnName: string, columnDef: string) => {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const hasColumn = tableInfo.some(col => col.name === columnName);
    if (!hasColumn) {
      try {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
        console.log(`Added column ${columnName} to ${tableName}`);
      } catch (e) {
        console.error(`Failed to add column ${columnName} to ${tableName}:`, e);
      }
    }
  };

  addColumnIfNotExists("drivers", "email", "TEXT");
  addColumnIfNotExists("vehicles", "category_id", "INTEGER REFERENCES vehicle_categories(id) ON DELETE SET NULL");
  addColumnIfNotExists("vehicles", "holder", "TEXT");
  addColumnIfNotExists("vehicles", "owner", "TEXT");
  addColumnIfNotExists("vehicles", "status", "TEXT DEFAULT 'active'");
  addColumnIfNotExists("vehicles", "mileage", "INTEGER DEFAULT 0");
  addColumnIfNotExists("vehicles", "last_service_date", "TEXT");
  addColumnIfNotExists("users", "phone", "TEXT");
  addColumnIfNotExists("users", "email", "TEXT");

  // Log current vehicles columns for debugging
  const vehiclesInfo = db.prepare("PRAGMA table_info(vehicles)").all();
  console.log("Vehicles table columns:", vehiclesInfo.map((c: any) => c.name).join(", "));

  db.exec(`
    INSERT OR IGNORE INTO users (username, password, full_name, role, phone, email) 
    VALUES ('admin', 'admin123', 'מנהל מערכת', 'admin', '0500000000', 'admin@example.com');
  `);
  console.log("Database initialized.");

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Role-based access control middleware
  app.use((req, res, next) => {
    const protectedMethods = ['POST', 'PATCH', 'DELETE'];
    const publicPaths = ['/api/login', '/api/auth/forgot-password', '/api/auth/forgot-username', '/api/auth/verify-code', '/api/auth/reset-password'];
    
    if (protectedMethods.includes(req.method) && !publicPaths.includes(req.path)) {
      const role = req.headers['x-user-role'];
      if (role === 'viewer') {
        return res.status(403).json({ error: "אין לך הרשאות לביצוע פעולה זו (צופה בלבד)" });
      }
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, full_name, role, email FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, full_name, role, phone, email } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO users (username, password, full_name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(username, password, full_name, role, phone, email);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Password Recovery API
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) {
      return res.status(404).json({ error: "כתובת אימייל לא נמצאה במערכת" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(user.id);
    db.prepare("INSERT INTO password_resets (user_id, code, expires_at) VALUES (?, ?, ?)").run(user.id, code, expiresAt);

    // Send Email
    const isMock = !transporter;
    await sendEmail(email, "איפוס סיסמה - FleetMaster", `קוד האיפוס שלך הוא: ${code}`);
    
    res.json({ 
      success: true, 
      message: isMock ? "מצב פיתוח: הקוד נשלח ללוג השרת" : "קוד איפוס נשלח למייל",
      devCode: isMock ? code : undefined
    });
  });

  app.post("/api/auth/forgot-username", async (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) {
      return res.status(404).json({ error: "כתובת אימייל לא נמצאה במערכת" });
    }

    // Send Email
    const isMock = !transporter;
    await sendEmail(email, "שחזור שם משתמש - FleetMaster", `שם המשתמש שלך הוא: ${user.username}`);
    
    res.json({ 
      success: true, 
      message: isMock ? "מצב פיתוח: שם המשתמש נשלח ללוג השרת" : "שם המשתמש נשלח למייל",
      devUsername: isMock ? user.username : undefined
    });
  });

  app.post("/api/auth/verify-code", (req, res) => {
    const { email, code } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) return res.status(404).json({ error: "משתמש לא נמצא" });

    const reset = db.prepare("SELECT * FROM password_resets WHERE user_id = ? AND code = ? AND expires_at > ?")
      .get(user.id, code, new Date().toISOString()) as any;

    if (reset) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "קוד שגוי או פג תוקף" });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { email, code, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) return res.status(404).json({ error: "משתמש לא נמצא" });

    const reset = db.prepare("SELECT * FROM password_resets WHERE user_id = ? AND code = ? AND expires_at > ?")
      .get(user.id, code, new Date().toISOString()) as any;

    if (reset) {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, user.id);
      db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(user.id);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "פעולה לא חוקית" });
    }
  });

  app.patch("/api/users/:id/password", (req, res) => {
    const { password } = req.body;
    const { id } = req.params;
    try {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", (req, res) => {
    const { full_name, role } = req.body;
    const { id } = req.params;
    try {
      db.prepare("UPDATE users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role) WHERE id = ?").run(full_name, role, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // API Routes
  app.get("/api/vehicle-categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM vehicle_categories").all();
    res.json(categories);
  });

  app.post("/api/vehicle-categories", (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare("INSERT INTO vehicle_categories (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vehicle-categories/:id", (req, res) => {
    const { id } = req.params;
    try {
      const transaction = db.transaction(() => {
        db.prepare("UPDATE vehicles SET category_id = NULL WHERE category_id = ?").run(id);
        db.prepare("DELETE FROM vehicle_categories WHERE id = ?").run(id);
      });
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vehicle-categories/:id", (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
      db.prepare("UPDATE vehicle_categories SET name = ? WHERE id = ?").run(name, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/vehicles", (req, res) => {
    const vehicles = db.prepare(`
      SELECT v.*, c.name as category_name 
      FROM vehicles v 
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
    `).all();
    res.json(vehicles);
  });

  app.post("/api/vehicles", (req, res) => {
    const { plate_number, make, model, year, mileage, holder, owner, category_id } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO vehicles (plate_number, make, model, year, mileage, holder, owner, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(plate_number, make, model, year, mileage, holder, owner, category_id);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vehicles/:id", (req, res) => {
    const { status, mileage, last_service_date, make, model, year, plate_number, holder, owner, category_id } = req.body;
    const { id } = req.params;
    try {
      db.prepare(`
        UPDATE vehicles SET 
          status = COALESCE(?, status), 
          mileage = COALESCE(?, mileage), 
          last_service_date = COALESCE(?, last_service_date), 
          make = COALESCE(?, make), 
          model = COALESCE(?, model), 
          year = COALESCE(?, year), 
          plate_number = COALESCE(?, plate_number), 
          holder = COALESCE(?, holder),
          owner = COALESCE(?, owner),
          category_id = COALESCE(?, category_id)
        WHERE id = ?
      `).run(status, mileage, last_service_date, make, model, year, plate_number, holder, owner, category_id, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vehicles/:id", (req, res) => {
    const { id } = req.params;
    try {
      const transaction = db.transaction(() => {
        // Manual cascade for existing databases without ON DELETE CASCADE
        db.prepare("DELETE FROM maintenance WHERE vehicle_id = ?").run(id);
        db.prepare("UPDATE drivers SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id = ?").run(id);
        db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
      });
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/maintenance", (req, res) => {
    const maintenance = db.prepare(`
      SELECT m.*, v.plate_number, v.make, v.model 
      FROM maintenance m 
      JOIN vehicles v ON m.vehicle_id = v.id 
      ORDER BY m.date DESC
    `).all();
    res.json(maintenance);
  });

  app.post("/api/maintenance", (req, res) => {
    const { vehicle_id, description, date, cost } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO maintenance (vehicle_id, description, date, cost) VALUES (?, ?, ?, ?)"
      ).run(vehicle_id, description, date, cost);
      
      // Update vehicle last_service_date
      db.prepare("UPDATE vehicles SET last_service_date = ? WHERE id = ?").run(date, vehicle_id);
      
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/maintenance/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM maintenance WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/drivers", (req, res) => {
    const drivers = db.prepare(`
      SELECT d.*, v.plate_number as assigned_vehicle_plate 
      FROM drivers d 
      LEFT JOIN vehicles v ON d.assigned_vehicle_id = v.id
    `).all();
    res.json(drivers);
  });

  app.post("/api/drivers", async (req, res) => {
    const { name, license_number, phone, email, assigned_vehicle_id } = req.body;
    try {
      const insertDriver = db.prepare(
        "INSERT INTO drivers (name, license_number, phone, email, assigned_vehicle_id) VALUES (?, ?, ?, ?, ?)"
      );
      const insertUser = db.prepare(
        "INSERT INTO users (username, password, full_name, phone, email, role) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const insertReset = db.prepare(
        "INSERT INTO password_resets (user_id, code, expires_at) VALUES (?, ?, ?)"
      );

      let driverId;
      let resetCode;
      
      const transaction = db.transaction(() => {
        const driverInfo = insertDriver.run(name, license_number, phone, email, assigned_vehicle_id);
        driverId = driverInfo.lastInsertRowid;
        const tempPassword = Math.random().toString(36).slice(-8); // Random temp password
        
        try {
          const userInfo = insertUser.run(email, tempPassword, name, phone, email, 'viewer');
          const userId = userInfo.lastInsertRowid;
          
          // Generate a reset code for the "Set your password" link
          resetCode = Math.random().toString(36).slice(-6).toUpperCase();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
          insertReset.run(userId, resetCode, expiresAt);
        } catch (userError: any) {
          console.log("User already exists for this email or error creating user");
        }
        
        return { driverId, resetCode };
      });

      const result = transaction();
      const isMock = !transporter;
      
      if (result.resetCode) {
        // Send "Welcome" email outside transaction
        await sendEmail(email, "ברוך הבא למערכת ניהול הצי - הגדרת חשבון", `
          שלום ${name},
          מנהל המערכת יצר עבורך חשבון חדש.
          כדי להתחיל להשתמש באפליקציה, עליך לקבוע סיסמה חדשה.
          קוד האימות שלך הוא: ${result.resetCode}
          השתמש באופציית "שכחתי סיסמה" במסך הכניסה עם המייל שלך וקוד זה כדי לקבוע סיסמה.
        `);
      }

      res.json({ 
        id: result.driverId, 
        message: isMock ? "מצב פיתוח: הנהג נוצר והקוד נשלח ללוג השרת" : "Driver created and email sent",
        devCode: isMock ? result.resetCode : undefined
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/drivers/:id", (req, res) => {
    const { assigned_vehicle_id, name, phone, license_number, email } = req.body;
    const { id } = req.params;
    try {
      db.prepare(
        "UPDATE drivers SET assigned_vehicle_id = ?, name = COALESCE(?, name), phone = COALESCE(?, phone), license_number = COALESCE(?, license_number), email = COALESCE(?, email) WHERE id = ?"
      ).run(assigned_vehicle_id, name, phone, license_number, email, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/drivers/:id", (req, res) => {
    const { id } = req.params;
    try {
      const driver = db.prepare("SELECT email FROM drivers WHERE id = ?").get(id) as any;
      
      const transaction = db.transaction(() => {
        if (driver && driver.email) {
          db.prepare("DELETE FROM users WHERE email = ? OR username = ?").run(driver.email, driver.email);
        }
        db.prepare("DELETE FROM drivers WHERE id = ?").run(id);
      });
      
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/analytics/mileage", (req, res) => {
    const data = db.prepare("SELECT plate_number, mileage FROM vehicles ORDER BY mileage DESC LIMIT 5").all();
    res.json(data);
  });

  app.get("/api/analytics/costs", (req, res) => {
    const data = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, SUM(cost) as total 
      FROM maintenance 
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `).all();
    res.json(data);
  });

  app.get("/api/stats", (req, res) => {
    const total = db.prepare("SELECT COUNT(*) as count FROM vehicles").get() as any;
    const active = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'active'").get() as any;
    const maintenance = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'maintenance'").get() as any;
    res.json({
      total: total.count,
      active: active.count,
      maintenance: maintenance.count
    });
  });

  // Vite middleware for development
  const isProd = true; // force production mode
  console.log(`Starting server in ${isProd ? 'production' : 'development'} mode...`);

  if (!isProd) {
    console.log("Loading Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware loaded.");
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=========================================`);
    console.log(`SERVER IS LIVE AND LISTENING ON PORT ${PORT}`);
    console.log(`Environment: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`=========================================`);
  });
}

startServer();
