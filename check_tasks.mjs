import pool from '/var/www/aigc-agent/server/db/connection.js';
const result = await pool.query('SELECT id, status, error_message, processing_type FROM video_processing_tasks ORDER BY created_at DESC LIMIT 10');
console.log(JSON.stringify(result.rows, null, 2));
process.exit(0);
