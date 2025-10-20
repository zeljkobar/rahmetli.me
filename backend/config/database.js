import mysql from "mysql2/promise";

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rahmetli_me",
  port: process.env.DB_PORT || 3306,
  charset: "utf8mb4",
  connectionLimit: 10,
  // MySQL2 compatible options
  waitForConnections: true,
  queueLimit: 0,
  // Remove deprecated options that cause warnings:
  // - acquireTimeout (use queueTimeout instead if needed)
  // - timeout (handled automatically by MySQL2)
  // - reconnect (handled automatically by MySQL2)
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// Execute query helper
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// Execute query with single result
async function executeQuerySingle(sql, params = []) {
  const rows = await executeQuery(sql, params);
  return rows[0] || null;
}

// Transaction helper
async function executeTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export {
  pool,
  testConnection,
  executeQuery,
  executeQuerySingle,
  executeTransaction,
};
