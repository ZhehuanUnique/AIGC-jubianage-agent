const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.ogndfzxtzsifaqwzfojs:2003419519CFF@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' 
});

async function main() {
  try {
    // 重置失败的补帧任务为pending状态
    const result = await pool.query(`
      UPDATE video_processing_tasks 
      SET status = 'pending', error_message = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE processing_type = 'frame_interpolation' AND status = 'failed'
      RETURNING id, status
    `);
    console.log('已重置的任务:');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log(`共重置 ${result.rowCount} 个任务`);
  } catch (error) {
    console.error('重置失败:', error.message);
  } finally {
    await pool.end();
  }
}

main();
