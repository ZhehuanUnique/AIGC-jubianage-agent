#!/usr/bin/env python3
"""
IQuest-Coder-V1-40B API 测试脚本
"""

import requests
import json
import time

# 配置
API_BASE_URL = "http://localhost:8000/v1"
MODEL_NAME = "IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct"

def test_health():
    """测试健康检查"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{API_BASE_URL.replace('/v1', '')}/health")
        print(f"✅ 健康检查通过: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ 健康检查失败: {e}")
        return False

def test_models():
    """测试模型列表"""
    print("\n📋 获取模型列表...")
    try:
        response = requests.get(f"{API_BASE_URL}/models")
        models = response.json()
        print(f"✅ 可用模型: {json.dumps(models, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"❌ 获取模型列表失败: {e}")
        return False

def test_chat_completion(prompt: str):
    """测试聊天补全"""
    print(f"\n💬 测试聊天补全...")
    print(f"📝 提示词: {prompt}")
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "top_p": 0.85,
        "max_tokens": 2048,
        "stream": False
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            usage = result.get('usage', {})
            
            print(f"\n✅ 响应成功 (耗时: {elapsed_time:.2f}秒)")
            print(f"📊 Token 使用: {usage}")
            print(f"\n🤖 模型回复:\n{'-'*60}")
            print(content)
            print('-'*60)
            return True
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_streaming(prompt: str):
    """测试流式输出"""
    print(f"\n🌊 测试流式输出...")
    print(f"📝 提示词: {prompt}")
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "top_p": 0.85,
        "max_tokens": 1024,
        "stream": True
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True
        )
        
        print(f"\n🤖 模型回复 (流式):\n{'-'*60}")
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                        content = chunk['choices'][0]['delta'].get('content', '')
                        if content:
                            print(content, end='', flush=True)
                    except:
                        pass
        print(f"\n{'-'*60}")
        print("✅ 流式输出测试完成")
        return True
    except Exception as e:
        print(f"❌ 流式输出测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("="*60)
    print("🧪 IQuest-Coder-V1-40B API 测试")
    print("="*60)
    
    # 1. 健康检查
    if not test_health():
        print("\n❌ 服务未就绪，请检查服务是否正常启动")
        return
    
    # 2. 模型列表
    test_models()
    
    # 3. 简单问答测试
    test_chat_completion("你好，请介绍一下你自己")
    
    # 4. 代码生成测试
    test_chat_completion(
        "请用 Python 写一个函数，实现快速排序算法，要求代码简洁高效，并添加详细注释"
    )
    
    # 5. 流式输出测试
    test_streaming("用一句话解释什么是递归")
    
    print("\n" + "="*60)
    print("✅ 所有测试完成！")
    print("="*60)

if __name__ == "__main__":
    main()
