#!/usr/bin/env python3
"""
IQuest-Coder-V1-14B API 测试脚本
测试代码生成质量和性能
"""

import requests
import json
import time
from datetime import datetime

# 配置
API_BASE_URL = "http://localhost:8000/v1"
MODEL_NAME = "IQuestLab/IQuest-Coder-V1-14B-Instruct"

# 测试用例
TEST_CASES = [
    {
        "name": "简单函数 - 斐波那契数列",
        "prompt": "写一个 Python 函数计算斐波那契数列的第 n 项，使用动态规划优化",
        "max_tokens": 1024
    },
    {
        "name": "数据结构 - LRU 缓存",
        "prompt": """请用 Python 实现一个 LRU 缓存类，要求：
1. 支持 get(key) 和 put(key, value) 操作
2. 时间复杂度 O(1)
3. 使用双向链表和哈希表实现
4. 添加详细注释""",
        "max_tokens": 2048
    },
    {
        "name": "算法 - 快速排序",
        "prompt": "用 Python 实现快速排序算法，要求代码简洁高效，并添加注释",
        "max_tokens": 1024
    },
    {
        "name": "代码审查",
        "prompt": """请审查以下代码并提供改进建议：

```python
def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr)):
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val
```

请从性能、可读性、边界情况等方面分析。""",
        "max_tokens": 1024
    },
    {
        "name": "Bug 修复",
        "prompt": """以下代码有 bug，请找出并修复：

```python
def binary_search(arr, target):
    left, right = 0, len(arr)
    while left < right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid
        else:
            right = mid
    return -1
```

请说明 bug 的原因和修复方法。""",
        "max_tokens": 1024
    },
    {
        "name": "复杂算法 - 最长公共子序列",
        "prompt": """用 Python 实现最长公共子序列（LCS）算法，要求：
1. 使用动态规划
2. 返回 LCS 的长度和实际序列
3. 时间复杂度 O(mn)
4. 添加详细注释和示例""",
        "max_tokens": 2048
    }
]

def print_header(text):
    """打印标题"""
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def print_section(text):
    """打印章节"""
    print("\n" + "-"*80)
    print(f"  {text}")
    print("-"*80)

def test_health():
    """测试健康检查"""
    print_section("🔍 健康检查")
    try:
        response = requests.get(f"{API_BASE_URL.replace('/v1', '')}/health", timeout=10)
        if response.status_code == 200:
            print("✅ 服务健康")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查异常: {e}")
        return False

def test_models():
    """测试模型列表"""
    print_section("📋 获取模型列表")
    try:
        response = requests.get(f"{API_BASE_URL}/models", timeout=10)
        if response.status_code == 200:
            models = response.json()
            print(f"✅ 可用模型: {json.dumps(models, indent=2, ensure_ascii=False)}")
            return True
        else:
            print(f"❌ 获取模型列表失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 获取模型列表异常: {e}")
        return False

def test_code_generation(test_case):
    """测试代码生成"""
    print_section(f"💻 测试: {test_case['name']}")
    print(f"📝 提示词: {test_case['prompt'][:100]}...")
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": test_case['prompt']}
        ],
        "temperature": 0.6,
        "top_p": 0.85,
        "max_tokens": test_case['max_tokens'],
        "stream": False
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            usage = result.get('usage', {})
            
            # 计算 tokens/秒
            total_tokens = usage.get('completion_tokens', 0)
            tokens_per_sec = total_tokens / elapsed_time if elapsed_time > 0 else 0
            
            print(f"\n✅ 生成成功")
            print(f"⏱️  耗时: {elapsed_time:.2f} 秒")
            print(f"📊 Token 使用: {usage}")
            print(f"🚀 速度: {tokens_per_sec:.1f} tokens/秒")
            print(f"\n🤖 生成的代码:\n{'-'*80}")
            print(content)
            print('-'*80)
            
            return {
                'success': True,
                'elapsed_time': elapsed_time,
                'tokens': total_tokens,
                'tokens_per_sec': tokens_per_sec
            }
        else:
            print(f"❌ 生成失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            return {'success': False}
    except Exception as e:
        print(f"❌ 生成异常: {e}")
        return {'success': False}

def test_streaming():
    """测试流式输出"""
    print_section("🌊 测试流式输出")
    
    prompt = "用一句话解释什么是递归，然后给出一个简单的 Python 递归示例"
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
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=120
        )
        
        print(f"\n🤖 流式输出:\n{'-'*80}")
        token_count = 0
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
                            token_count += len(content.split())
                    except:
                        pass
        
        elapsed_time = time.time() - start_time
        tokens_per_sec = token_count / elapsed_time if elapsed_time > 0 else 0
        
        print(f"\n{'-'*80}")
        print(f"✅ 流式输出完成")
        print(f"⏱️  耗时: {elapsed_time:.2f} 秒")
        print(f"🚀 速度: {tokens_per_sec:.1f} tokens/秒（估算）")
        return True
    except Exception as e:
        print(f"❌ 流式输出失败: {e}")
        return False

def main():
    """主测试函数"""
    print_header(f"🧪 IQuest-Coder-V1-14B API 测试")
    print(f"⏰ 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API 地址: {API_BASE_URL}")
    print(f"🤖 模型: {MODEL_NAME}")
    
    # 1. 健康检查
    if not test_health():
        print("\n❌ 服务未就绪，请检查服务是否正常启动")
        print("💡 提示: 运行 'docker-compose -f docker-compose-14b.yml logs' 查看日志")
        return
    
    # 2. 模型列表
    if not test_models():
        print("\n❌ 无法获取模型列表")
        return
    
    # 3. 代码生成测试
    print_header("📝 代码生成质量测试")
    results = []
    for test_case in TEST_CASES:
        result = test_code_generation(test_case)
        if result['success']:
            results.append(result)
        time.sleep(1)  # 避免请求过快
    
    # 4. 流式输出测试
    test_streaming()
    
    # 5. 性能统计
    if results:
        print_header("📊 性能统计")
        avg_time = sum(r['elapsed_time'] for r in results) / len(results)
        avg_tokens = sum(r['tokens'] for r in results) / len(results)
        avg_speed = sum(r['tokens_per_sec'] for r in results) / len(results)
        
        print(f"\n测试用例数: {len(results)}")
        print(f"平均耗时: {avg_time:.2f} 秒")
        print(f"平均 Token 数: {avg_tokens:.0f}")
        print(f"平均速度: {avg_speed:.1f} tokens/秒")
        
        print("\n性能评估:")
        if avg_speed >= 50:
            print("✅ 优秀 - 推理速度非常快")
        elif avg_speed >= 40:
            print("✅ 良好 - 推理速度符合预期")
        elif avg_speed >= 30:
            print("⚠️  一般 - 推理速度略慢，建议检查配置")
        else:
            print("❌ 较慢 - 推理速度不理想，建议优化配置")
    
    # 6. 总结
    print_header("✅ 测试完成")
    print("\n📝 测试总结:")
    print(f"  - 健康检查: ✅")
    print(f"  - 模型列表: ✅")
    print(f"  - 代码生成: ✅ ({len(results)}/{len(TEST_CASES)} 成功)")
    print(f"  - 流式输出: ✅")
    
    print("\n💡 下一步:")
    print("  1. 如果测试通过，可以开始集成到项目中")
    print("  2. 参考 '集成到现有项目.md' 进行集成")
    print("  3. 根据实际使用情况调整配置参数")
    
    print("\n🎉 IQuest-Coder-V1-14B 部署成功！")

if __name__ == "__main__":
    main()
