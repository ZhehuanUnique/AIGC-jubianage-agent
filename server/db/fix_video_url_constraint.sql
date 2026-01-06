-- 修复 first_last_frame_videos 表的 video_url 约束
-- 允许 video_url 和 cos_key 为空（pending/processing 状态时还没有视频）

-- 如果 video_url 是 NOT NULL，需要修改为允许 NULL
-- 注意：PostgreSQL 中，如果字段已经是 TEXT 类型，可以直接修改约束

-- 方法1：如果表已经存在且 video_url 是 NOT NULL，需要先删除约束再添加
-- 检查当前约束
DO $$
BEGIN
    -- 检查 video_url 是否有 NOT NULL 约束
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'first_last_frame_videos' 
        AND column_name = 'video_url' 
        AND is_nullable = 'NO'
    ) THEN
        -- 修改为允许 NULL
        ALTER TABLE first_last_frame_videos 
        ALTER COLUMN video_url DROP NOT NULL;
        
        RAISE NOTICE '已修改 video_url 字段允许 NULL';
    ELSE
        RAISE NOTICE 'video_url 字段已经允许 NULL';
    END IF;
    
    -- 检查 cos_key 是否有 NOT NULL 约束
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'first_last_frame_videos' 
        AND column_name = 'cos_key' 
        AND is_nullable = 'NO'
    ) THEN
        -- 修改为允许 NULL
        ALTER TABLE first_last_frame_videos 
        ALTER COLUMN cos_key DROP NOT NULL;
        
        RAISE NOTICE '已修改 cos_key 字段允许 NULL';
    ELSE
        RAISE NOTICE 'cos_key 字段已经允许 NULL';
    END IF;
END $$;

-- 或者，如果希望使用空字符串而不是 NULL，可以保持 NOT NULL 约束
-- 但需要在插入时确保提供空字符串（代码中已经这样做了）

