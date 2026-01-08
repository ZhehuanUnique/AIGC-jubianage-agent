SELECT id, status, processing_type, error_message, created_at FROM video_processing_tasks WHERE processing_type = 'frame_interpolation' ORDER BY id DESC LIMIT 10;
