"""
IndexTTS2.5 配置文件
"""

import os
from pathlib import Path

# 基础路径配置
BASE_DIR = Path(__file__).parent
MODEL_DIR = Path(os.getenv('MODEL_PATH', BASE_DIR / 'models'))
CHECKPOINT_DIR = Path(os.getenv('CHECKPOINT_PATH', BASE_DIR / 'checkpoints'))
OUTPUT_DIR = Path(os.getenv('OUTPUT_PATH', BASE_DIR / 'outputs'))

# 确保目录存在
MODEL_DIR.mkdir(parents=True, exist_ok=True)
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# IndexTTS2.5 配置
INDEXTTS_CONFIG = {
    'model_path': str(MODEL_DIR),
    'checkpoint_path': str(CHECKPOINT_DIR),
    'output_path': str(OUTPUT_DIR),
    'device': os.getenv('DEVICE', 'cpu'),  # 'cpu' 或 'cuda'
    'batch_size': int(os.getenv('BATCH_SIZE', 1)),
    'max_text_length': int(os.getenv('MAX_TEXT_LENGTH', 500)),
}

# API 配置
API_CONFIG = {
    'host': os.getenv('HOST', '0.0.0.0'),
    'port': int(os.getenv('PORT', 8000)),
    'debug': os.getenv('DEBUG', 'False').lower() == 'true',
    'timeout': int(os.getenv('TIMEOUT', 300)),  # 5分钟
}





