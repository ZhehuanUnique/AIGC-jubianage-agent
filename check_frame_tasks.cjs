const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.ogndfzxtzsifaqwzfojs:2003419519CFF@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' 
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT id, status, processing_type, error_message, created_at 
      FROM video_processing_tasks 
      WHERE processing_type = 'frame_interpolation' 
      ORDER BY id DESC 
      LIMIT 10
    `);
    console.log('补帧任务列表:');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

main();
