"""
IndexTTS2.5 API 服务
提供文本转语音（TTS）功能的 RESTful API
"""

import os
import sys
import json
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import traceback

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置路径
MODEL_PATH = os.getenv('MODEL_PATH', '/app/models')
CHECKPOINT_PATH = os.getenv('CHECKPOINT_PATH', '/app/checkpoints')
OUTPUT_PATH = os.getenv('OUTPUT_PATH', '/app/outputs')
PORT = int(os.getenv('PORT', 8000))

# 确保输出目录存在
Path(OUTPUT_PATH).mkdir(parents=True, exist_ok=True)

# 全局变量存储模型实例
tts_model = None
available_voices = []

def load_model():
    """加载 IndexTTS2.5 模型"""
    global tts_model, available_voices
    
    try:
        # 这里需要根据 IndexTTS2.5 的实际导入方式调整
        # 示例代码，需要根据实际情况修改
        logger.info(f"正在加载模型，路径: {CHECKPOINT_PATH}")
        
        # TODO: 根据 IndexTTS2.5 的实际 API 导入和初始化模型
        # 示例：
        # from indextts import IndexTTS
        # tts_model = IndexTTS(checkpoint_path=CHECKPOINT_PATH)
        # available_voices = tts_model.list_voices()
        
        # 临时实现：返回模拟数据
        logger.warning("⚠️  模型加载功能需要根据 IndexTTS2.5 实际 API 实现")
        available_voices = [
            {"id": "default", "name": "默认音色", "description": "默认音色"},
            {"id": "voice1", "name": "音色1", "description": "音色1描述"},
        ]
        
        logger.info("✅ 模型加载完成")
        return True
    except Exception as e:
        logger.error(f"❌ 模型加载失败: {str(e)}")
        logger.error(traceback.format_exc())
        return False

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    try:
        # 检查模型是否已加载
        model_loaded = tts_model is not None
        
        return jsonify({
            "status": "healthy" if model_loaded else "loading",
            "model_loaded": model_loaded,
            "model_path": MODEL_PATH,
            "checkpoint_path": CHECKPOINT_PATH,
            "output_path": OUTPUT_PATH,
        }), 200
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@app.route('/api/voices', methods=['GET'])
def get_voices():
    """获取可用音色列表"""
    try:
        if not available_voices:
            return jsonify({
                "success": False,
                "error": "音色列表未加载"
            }), 500
        
        return jsonify({
            "success": True,
            "voices": available_voices
        }), 200
    except Exception as e:
        logger.error(f"获取音色列表失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tts/generate', methods=['POST'])
def generate_tts():
    """生成语音"""
    try:
        data = request.get_json()
        
        # 验证参数
        if not data or 'text' not in data:
            return jsonify({
                "success": False,
                "error": "缺少必需参数: text"
            }), 400
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({
                "success": False,
                "error": "文本不能为空"
            }), 400
        
        voice_id = data.get('voice_id', 'default')
        speed = float(data.get('speed', 1.0))
        pitch = float(data.get('pitch', 0))
        format_type = data.get('format', 'wav')
        
        logger.info(f"生成语音请求: text={text[:50]}..., voice_id={voice_id}, speed={speed}, pitch={pitch}")
        
        # 检查模型是否已加载
        if tts_model is None:
            return jsonify({
                "success": False,
                "error": "模型未加载，请稍后重试"
            }), 503
        
        # TODO: 调用 IndexTTS2.5 生成语音
        # 示例：
        # audio_path = tts_model.generate(
        #     text=text,
        #     voice_id=voice_id,
        #     speed=speed,
        #     pitch=pitch,
        #     output_format=format_type,
        #     output_dir=OUTPUT_PATH
        # )
        
        # 临时实现：返回模拟响应
        logger.warning("⚠️  语音生成功能需要根据 IndexTTS2.5 实际 API 实现")
        
        # 返回模拟数据
        audio_url = f"/api/audio/mock_{hash(text)}.{format_type}"
        
        return jsonify({
            "success": True,
            "audio_url": audio_url,
            "format": format_type,
            "duration": len(text) * 0.1,  # 模拟时长
            "message": "⚠️  这是模拟响应，需要实现实际的 TTS 生成"
        }), 200
        
    except Exception as e:
        logger.error(f"生成语音失败: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """获取生成的音频文件"""
    try:
        audio_path = Path(OUTPUT_PATH) / filename
        if not audio_path.exists():
            return jsonify({
                "success": False,
                "error": "音频文件不存在"
            }), 404
        
        return send_file(
            str(audio_path),
            mimetype='audio/wav',
            as_attachment=False
        )
    except Exception as e:
        logger.error(f"获取音频文件失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "接口不存在"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "服务器内部错误"
    }), 500

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("IndexTTS2.5 API 服务启动中...")
    logger.info(f"模型路径: {MODEL_PATH}")
    logger.info(f"检查点路径: {CHECKPOINT_PATH}")
    logger.info(f"输出路径: {OUTPUT_PATH}")
    logger.info("=" * 50)
    
    # 加载模型
    if load_model():
        logger.info("✅ 服务启动成功")
        app.run(host='0.0.0.0', port=PORT, debug=False)
    else:
        logger.error("❌ 服务启动失败：模型加载失败")
        sys.exit(1)

