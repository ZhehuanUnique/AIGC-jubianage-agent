// 使用项目中已安装的 pg 模块
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('./node_modules/pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:246859CFF@localhost:5432/aigc_agent' 
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
