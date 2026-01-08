#!/usr/bin/env python3
"""
IQuest-Coder-V1-40B 客户端使用示例
支持 OpenAI SDK 和原生 requests
"""

# ============================================
# 方法 1: 使用 OpenAI SDK（推荐）
# ============================================

from openai import OpenAI

# 初始化客户端
client = OpenAI(
    base_url="http://你的服务器IP:8000/v1",  # 替换为你的服务器地址
    api_key="dummy"  # vLLM 不需要真实 API key
)

def example_chat():
    """聊天示例"""
    print("💬 聊天示例")
    response = client.chat.completions.create(
        model="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
        messages=[
            {"role": "system", "content": "你是一个专业的编程助手"},
            {"role": "user", "content": "请解释什么是闭包"}
        ],
        temperature=0.6,
        top_p=0.85,
        max_tokens=2048
    )
    print(response.choices[0].message.content)

def example_code_generation():
    """代码生成示例"""
    print("\n🔧 代码生成示例")
    response = client.chat.completions.create(
        model="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
        messages=[
            {"role": "user", "content": """
请用 Python 实现一个 LRU 缓存类，要求：
1. 支持 get 和 put 操作
2. 时间复杂度 O(1)
3. 使用双向链表和哈希表实现
4. 添加详细注释
"""}
        ],
        temperature=0.6,
        top_p=0.85,
        max_tokens=4096
    )
    print(response.choices[0].message.content)

def example_streaming():
    """流式输出示例"""
    print("\n🌊 流式输出示例")
    stream = client.chat.completions.create(
        model="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
        messages=[
            {"role": "user", "content": "请详细解释 Python 的装饰器"}
        ],
        temperature=0.6,
        top_p=0.85,
        max_tokens=2048,
        stream=True
    )
    
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end='', flush=True)
    print()

def example_code_review():
    """代码审查示例"""
    print("\n🔍 代码审查示例")
    code = """
def calculate_sum(numbers):
    total = 0
    for i in range(len(numbers)):
        total = total + numbers[i]
    return total
"""
    
    response = client.chat.completions.create(
        model="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
        messages=[
            {"role": "user", "content": f"""
请审查以下代码，指出可以改进的地方：

```python
{code}
```

请从以下方面分析：
1. 代码风格
2. 性能优化
3. 可读性
4. 最佳实践
"""}
        ],
        temperature=0.6,
        top_p=0.85,
        max_tokens=2048
    )
    print(response.choices[0].message.content)

def example_bug_fixing():
    """Bug 修复示例"""
    print("\n🐛 Bug 修复示例")
    buggy_code = """
def find_max(arr):
    max_val = arr[0]
    for i in range(len(arr)):
        if arr[i] > max_val:
            max_val = arr[i]
    return max_val

# 测试
print(find_max([]))  # 这里会报错
"""
    
    response = client.chat.completions.create(
        model="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
        messages=[
            {"role": "user", "content": f"""
以下代码存在 bug，请找出问题并修复：

```python
{buggy_code}
```

请说明：
1. Bug 的原因
2. 如何修复
3. 提供修复后的完整代码
"""}
        ],
        temperature=0.6,
        top_p=0.85,
        max_tokens=2048
    )
    print(response.choices[0].message.content)


# ============================================
# 方法 2: 使用原生 requests
# ============================================

import requests
import json

API_BASE_URL = "http://你的服务器IP:8000/v1"  # 替换为你的服务器地址

def example_requests():
    """使用 requests 库的示例"""
    print("\n📡 使用 requests 库")
    
    payload = {
        "model": "IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
        "messages": [
            {"role": "user", "content": "写一个 Python 函数计算阶乘"}
        ],
        "temperature": 0.6,
        "top_p": 0.85,
        "max_tokens": 1024
    }
    
    response = requests.post(
        f"{API_BASE_URL}/chat/completions",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(result['choices'][0]['message']['content'])
    else:
        print(f"错误: {response.status_code} - {response.text}")


# ============================================
# 方法 3: 集成到你的项目中
# ============================================

class IQuestCoderClient:
    """IQuest-Coder 客户端封装类"""
    
    def __init__(self, base_url: str, api_key: str = "dummy"):
        self.client = OpenAI(base_url=base_url, api_key=api_key)
        self.model = "IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct"
    
    def generate_code(self, prompt: str, max_tokens: int = 4096) -> str:
        """生成代码"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            top_p=0.85,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    def review_code(self, code: str) -> str:
        """审查代码"""
        prompt = f"请审查以下代码并提供改进建议：\n\n```\n{code}\n```"
        return self.generate_code(prompt)
    
    def fix_bug(self, code: str, error: str) -> str:
        """修复 Bug"""
        prompt = f"""
以下代码出现错误：

```
{code}
```

错误信息：
{error}

请分析问题并提供修复方案。
"""
        return self.generate_code(prompt)
    
    def explain_code(self, code: str) -> str:
        """解释代码"""
        prompt = f"请详细解释以下代码的功能和实现原理：\n\n```\n{code}\n```"
        return self.generate_code(prompt, max_tokens=2048)


def example_client_usage():
    """客户端封装类使用示例"""
    print("\n🎯 客户端封装类示例")
    
    # 初始化客户端
    coder = IQuestCoderClient(base_url="http://你的服务器IP:8000/v1")
    
    # 生成代码
    code = coder.generate_code("写一个 Python 函数实现二分查找")
    print("生成的代码：")
    print(code)
    
    # 审查代码
    review = coder.review_code(code)
    print("\n代码审查：")
    print(review)


if __name__ == "__main__":
    print("="*60)
    print("🚀 IQuest-Coder-V1-40B 客户端示例")
    print("="*60)
    
    # 运行示例（取消注释以运行）
    # example_chat()
    # example_code_generation()
    # example_streaming()
    # example_code_review()
    # example_bug_fixing()
    # example_requests()
    # example_client_usage()
    
    print("\n💡 提示：请先替换代码中的服务器地址，然后取消注释运行示例")
