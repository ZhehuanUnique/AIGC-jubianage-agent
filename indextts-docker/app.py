"""
IndexTTS2.5 API 服务
提供文本转语音（TTS）功能的 RESTful API
基于 IndexTTS2 官方 API
"""

import os
import sys
import json
import base64
import logging
import tempfile
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
CHECKPOINT_PATH = os.getenv('CHECKPOINT_PATH', '/app/checkpoints')
CONFIG_PATH = os.getenv('CONFIG_PATH', os.path.join(CHECKPOINT_PATH, 'config.yaml'))
OUTPUT_PATH = os.getenv('OUTPUT_PATH', '/app/outputs')
PORT = int(os.getenv('PORT', 8000))

# IndexTTS2 配置
USE_FP16 = os.getenv('USE_FP16', 'True').lower() == 'true'
USE_CUDA_KERNEL = os.getenv('USE_CUDA_KERNEL', 'True').lower() == 'true'
USE_DEEPSPEED = os.getenv('USE_DEEPSPEED', 'False').lower() == 'true'
DEVICE = os.getenv('DEVICE', 'cuda' if os.getenv('CUDA_VISIBLE_DEVICES') else 'cpu')

# 确保输出目录存在
Path(OUTPUT_PATH).mkdir(parents=True, exist_ok=True)

# 全局变量存储模型实例
tts_model = None

def load_model():
    """加载 IndexTTS2 模型"""
    global tts_model
    
    try:
        logger.info(f"正在加载 IndexTTS2 模型...")
        logger.info(f"配置文件路径: {CONFIG_PATH}")
        logger.info(f"模型目录: {CHECKPOINT_PATH}")
        logger.info(f"设备: {DEVICE}, FP16: {USE_FP16}, CUDA Kernel: {USE_CUDA_KERNEL}")
        
        # 检查配置文件是否存在
        if not os.path.exists(CONFIG_PATH):
            logger.error(f"❌ 配置文件不存在: {CONFIG_PATH}")
            return False
        
        if not os.path.exists(CHECKPOINT_PATH):
            logger.error(f"❌ 模型目录不存在: {CHECKPOINT_PATH}")
            return False
        
        # 导入 IndexTTS2
        from indextts.infer_v2 import IndexTTS2
        
        # 初始化模型
        tts_model = IndexTTS2(
            cfg_path=CONFIG_PATH,
            model_dir=CHECKPOINT_PATH,
            use_fp16=USE_FP16,
            use_cuda_kernel=USE_CUDA_KERNEL,
            use_deepspeed=USE_DEEPSPEED,
            device=DEVICE
        )
        
        logger.info("✅ IndexTTS2 模型加载完成")
        return True
    except ImportError as e:
        logger.error(f"❌ 导入 IndexTTS2 失败: {str(e)}")
        logger.error("请确保已安装 indextts 包: pip install indextts")
        logger.error(traceback.format_exc())
        return False
    except Exception as e:
        logger.error(f"❌ 模型加载失败: {str(e)}")
        logger.error(traceback.format_exc())
        return False

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    try:
        model_loaded = tts_model is not None
        return jsonify({
            "status": "healthy" if model_loaded else "loading",
            "model_loaded": model_loaded
        }), 200
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@app.route('/models', methods=['GET'])
@app.route('/api/models', methods=['GET'])
def get_models():
    """查看加载的模型信息"""
    try:
        if tts_model is None:
            return jsonify({
                "error": "模型未加载"
            }), 503
        
        return jsonify({
            "model_dir": CHECKPOINT_PATH,
            "config_path": CONFIG_PATH,
            "device": DEVICE,
            "use_fp16": USE_FP16,
            "use_cuda_kernel": USE_CUDA_KERNEL
        }), 200
    except Exception as e:
        logger.error(f"获取模型信息失败: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/tts', methods=['POST'])
@app.route('/api/tts', methods=['POST'])
def generate_tts():
    """文本转语音接口（兼容官方 API）"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "error",
                "error": "请求体不能为空"
            }), 400
        
        # 必需参数
        if 'text' not in data:
            return jsonify({
                "status": "error",
                "error": "缺少必需参数: text"
            }), 400
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({
                "status": "error",
                "error": "文本不能为空"
            }), 400
        
        # 检查模型是否已加载
        if tts_model is None:
            return jsonify({
                "status": "error",
                "error": "模型未加载，请稍后重试"
            }), 503
        
        # 处理音色参考音频（spk_audio_prompt）
        spk_audio_prompt = None
        if 'spk_audio_prompt' in data:
            spk_audio = data['spk_audio_prompt']
            # 如果是 base64 编码，先解码保存为临时文件
            if isinstance(spk_audio, str) and spk_audio.startswith('data:audio'):
                # base64 编码的音频
                audio_data = spk_audio.split(',')[1] if ',' in spk_audio else spk_audio
                audio_bytes = base64.b64decode(audio_data)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                    tmp_file.write(audio_bytes)
                    spk_audio_prompt = tmp_file.name
            elif isinstance(spk_audio, str) and (spk_audio.startswith('http://') or spk_audio.startswith('https://')):
                # URL，直接使用
                spk_audio_prompt = spk_audio
            elif isinstance(spk_audio, str) and os.path.exists(spk_audio):
                # 本地文件路径
                spk_audio_prompt = spk_audio
            else:
                return jsonify({
                    "status": "error",
                    "error": "无效的 spk_audio_prompt 格式"
                }), 400
        
        # 处理情感参考音频（emo_audio_prompt，可选）
        emo_audio_prompt = None
        if 'emo_audio_prompt' in data:
            emo_audio = data['emo_audio_prompt']
            if isinstance(emo_audio, str) and emo_audio.startswith('data:audio'):
                audio_data = emo_audio.split(',')[1] if ',' in emo_audio else emo_audio
                audio_bytes = base64.b64decode(audio_data)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                    tmp_file.write(audio_bytes)
                    emo_audio_prompt = tmp_file.name
            elif isinstance(emo_audio, str) and (emo_audio.startswith('http://') or emo_audio.startswith('https://')):
                emo_audio_prompt = emo_audio
            elif isinstance(emo_audio, str) and os.path.exists(emo_audio):
                emo_audio_prompt = emo_audio
        
        # 可选参数
        output_format = data.get('output_format', 'wav')  # wav 或 mp3
        emo_alpha = float(data.get('emo_alpha', 0.7))  # 情感强度 0.0~1.0
        temperature = float(data.get('temperature', 0.3))  # 采样随机性 0.0~1.0
        top_p = float(data.get('top_p', 0.7))  # 核采样阈值 0.0~1.0
        top_k = int(data.get('top_k', 20))  # 仅考虑概率最高的k个token
        num_beams = int(data.get('num_beams', 3))  # 束搜索宽度
        repetition_penalty = float(data.get('repetition_penalty', 1.2))  # 重复惩罚
        length_penalty = float(data.get('length_penalty', 1.0))  # 长度惩罚
        verbose = data.get('verbose', False)
        
        logger.info(f"生成语音请求: text={text[:50]}..., spk_audio={bool(spk_audio_prompt)}, emo_audio={bool(emo_audio_prompt)}")
        
        # 生成输出文件路径
        import hashlib
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        output_filename = f"tts_{text_hash}.{output_format}"
        output_path = os.path.join(OUTPUT_PATH, output_filename)
        
        # 调用 IndexTTS2 生成语音
        tts_model.infer(
            spk_audio_prompt=spk_audio_prompt,
            text=text,
            output_path=output_path,
            emo_audio_prompt=emo_audio_prompt,
            emo_alpha=emo_alpha,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            num_beams=num_beams,
            repetition_penalty=repetition_penalty,
            length_penalty=length_penalty,
            verbose=verbose
        )
        
        # 读取生成的音频文件并转换为 base64
        with open(output_path, 'rb') as f:
            audio_bytes = f.read()
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # 获取音频时长（简单估算，实际应该解析音频文件）
        # 这里使用文本长度估算，实际应该使用 librosa 或 soundfile 解析
        estimated_duration = len(text) * 0.1  # 粗略估算
        
        # 清理临时文件
        if spk_audio_prompt and os.path.exists(spk_audio_prompt) and spk_audio_prompt.startswith('/tmp'):
            try:
                os.unlink(spk_audio_prompt)
            except:
                pass
        if emo_audio_prompt and os.path.exists(emo_audio_prompt) and emo_audio_prompt.startswith('/tmp'):
            try:
                os.unlink(emo_audio_prompt)
            except:
                pass
        
        return jsonify({
            "status": "success",
            "audio": f"data:audio/{output_format};base64,{audio_base64}",
            "duration": estimated_duration,
            "format": output_format
        }), 200
        
    except Exception as e:
        logger.error(f"生成语音失败: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/api/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """获取生成的音频文件"""
    try:
        audio_path = Path(OUTPUT_PATH) / filename
        if not audio_path.exists():
            return jsonify({
                "status": "error",
                "error": "音频文件不存在"
            }), 404
        
        # 根据文件扩展名确定 MIME 类型
        ext = filename.split('.')[-1].lower()
        mimetype_map = {
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'ogg': 'audio/ogg'
        }
        mimetype = mimetype_map.get(ext, 'audio/wav')
        
        return send_file(
            str(audio_path),
            mimetype=mimetype,
            as_attachment=False
        )
    except Exception as e:
        logger.error(f"获取音频文件失败: {str(e)}")
        return jsonify({
            "status": "error",
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
    logger.info(f"配置文件: {CONFIG_PATH}")
    logger.info(f"模型目录: {CHECKPOINT_PATH}")
    logger.info(f"输出路径: {OUTPUT_PATH}")
    logger.info(f"设备: {DEVICE}, FP16: {USE_FP16}")
    logger.info("=" * 50)
    
    # 加载模型
    if load_model():
        logger.info("✅ 服务启动成功")
        logger.info(f"API 地址: http://0.0.0.0:{PORT}")
        logger.info(f"健康检查: http://0.0.0.0:{PORT}/health")
        logger.info(f"TTS 接口: http://0.0.0.0:{PORT}/tts")
        app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
    else:
        logger.error("❌ 服务启动失败：模型加载失败")
        sys.exit(1)

