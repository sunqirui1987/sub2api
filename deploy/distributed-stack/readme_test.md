# OpenAI 接口 curl 测试

进入部署目录：

```bash
cd ~/sub2api-distributed-stack
```

先设置访问地址和 API Key：

```bash
export OPENAI_BASE_URL="http://127.0.0.1:8080"
export OPENAI_API_KEY="sk-替换成你的key"
```

如果在其他机器测试，把 `OPENAI_BASE_URL` 改成 App 服务器地址：

```bash
export OPENAI_BASE_URL="http://<app-ip>:8080"
```

## 1. 测试模型列表

```bash
curl -sS "$OPENAI_BASE_URL/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

能返回模型列表，说明 Key 鉴权和网关基本可用。

## 2. 测试 Chat Completions

```bash
curl -sS "$OPENAI_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.4-mini",
    "messages": [
      {
        "role": "user",
        "content": "只回复 OK"
      }
    ],
    "stream": false
  }'
```

能看到 `choices[0].message.content` 返回内容，说明普通文本接口可用。

## 3. 测试流式输出

```bash
curl -N "$OPENAI_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.4-mini",
    "messages": [
      {
        "role": "user",
        "content": "只回复 OK"
      }
    ],
    "stream": true
  }'
```

能看到多行 `data:`，最后出现 `data: [DONE]`，说明流式接口可用。

## 4. 测试 Responses API

```bash
curl -sS "$OPENAI_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.4-mini",
    "input": "只回复 OK",
    "max_output_tokens": 32
  }'
```

能返回 `id`、`output` 或 `output_text`，说明 Responses 接口可用。

## 5. 测试 Embeddings

```bash
curl -sS "$OPENAI_BASE_URL/v1/embeddings" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": ["hello", "world"]
  }'
```

能返回 `data[0].embedding` 数组，说明 Embeddings 接口可用。

## 6. 批量测试多个 Key

新建本地文件 `openai_keys.txt`，每行一个 Key：

```text
sk-key-1
sk-key-2
sk-key-3
```

然后执行：

```bash
while read -r key; do
  [ -z "$key" ] && continue
  echo "Testing ${key:0:8}..."
  curl -sS "$OPENAI_BASE_URL/v1/chat/completions" \
    -H "Authorization: Bearer $key" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-5.4-mini",
      "messages": [
        {
          "role": "user",
          "content": "只回复 OK"
        }
      ],
      "stream": false
    }'
  echo
done < openai_keys.txt
```

如果返回正常内容，说明这个 Key 可用；如果返回 `401`、`403`、`429` 或 `No available accounts`，需要检查 Key、账号、额度或上游账号可用性。
