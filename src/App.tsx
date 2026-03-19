import { ChangeEvent, useMemo, useRef, useState } from 'react';

type StatusTone = 'idle' | 'success' | 'error';

type StatusState = {
  tone: StatusTone;
  title: string;
  detail: string;
};

const starterJson = `{
  "name": "JSON Editor",
  "version": 1,
  "features": [
    "validate",
    "format",
    "minify",
    "import",
    "export"
  ],
  "active": true
}`;

const defaultStatus: StatusState = {
  tone: 'idle',
  title: 'Ready',
  detail: '粘贴或输入 JSON，然后使用上方工具进行校验、格式化或导出。',
};

function getErrorLocation(message: string) {
  const match = message.match(/position (\d+)/i);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function getLineAndColumn(source: string, position: number) {
  let line = 1;
  let column = 1;

  for (let index = 0; index < position; index += 1) {
    if (source[index] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function parseJson(text: string) {
  const parsed = JSON.parse(text);
  return parsed;
}

function buildErrorStatus(text: string, error: unknown): StatusState {
  const message = error instanceof Error ? error.message : 'Unknown JSON error';
  const position = getErrorLocation(message);

  if (position === null) {
    return {
      tone: 'error',
      title: 'JSON 无效',
      detail: message,
    };
  }

  const { line, column } = getLineAndColumn(text, position);

  return {
    tone: 'error',
    title: 'JSON 无效',
    detail: `${message} (行 ${line}，列 ${column})`,
  };
}

export default function App() {
  const [text, setText] = useState(starterJson);
  const [status, setStatus] = useState<StatusState>(defaultStatus);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const trimmed = text.trim();

    return {
      characters: text.length,
      lines: text === '' ? 1 : text.split('\n').length,
      empty: trimmed.length === 0,
    };
  }, [text]);

  const updateStatusFromValidation = (nextText: string) => {
    if (nextText.trim() === '') {
      setStatus({
        tone: 'idle',
        title: '编辑区为空',
        detail: '请输入 JSON 内容后再执行校验、格式化或压缩。',
      });
      return null;
    }

    try {
      const parsed = parseJson(nextText);
      setStatus({
        tone: 'success',
        title: 'JSON 有效',
        detail: `解析成功，根节点类型为 ${Array.isArray(parsed) ? 'array' : typeof parsed}。`,
      });
      return parsed;
    } catch (error) {
      setStatus(buildErrorStatus(nextText, error));
      return null;
    }
  };

  const handleFormat = () => {
    const parsed = updateStatusFromValidation(text);

    if (parsed === null) {
      return;
    }

    const formatted = JSON.stringify(parsed, null, 2);
    setText(formatted);
    setStatus({
      tone: 'success',
      title: '格式化完成',
      detail: '当前 JSON 已按 2 空格缩进重新排版。',
    });
  };

  const handleMinify = () => {
    const parsed = updateStatusFromValidation(text);

    if (parsed === null) {
      return;
    }

    const minified = JSON.stringify(parsed);
    setText(minified);
    setStatus({
      tone: 'success',
      title: '压缩完成',
      detail: '当前 JSON 已压缩为单行结构。',
    });
  };

  const handleValidate = () => {
    updateStatusFromValidation(text);
  };

  const handleClear = () => {
    setText('');
    setStatus({
      tone: 'idle',
      title: '已清空',
      detail: '编辑区内容已清空。',
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({
        tone: 'success',
        title: '复制成功',
        detail: '当前内容已经复制到剪贴板。',
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        title: '复制失败',
        detail:
          error instanceof Error ? error.message : '浏览器未授予剪贴板访问权限。',
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'json-editor-export.json';
    anchor.click();
    URL.revokeObjectURL(url);

    setStatus({
      tone: 'success',
      title: '下载已开始',
      detail: '当前内容已导出为 json-editor-export.json。',
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      setText(content);
      setStatus({
        tone: 'success',
        title: '文件已导入',
        detail: `已载入 ${file.name}，可以继续编辑或校验。`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        title: '文件读取失败',
        detail: error instanceof Error ? error.message : '无法读取所选文件。',
      });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="workspace">
        <section className="hero-card">
          <p className="eyebrow">Static React Utility</p>
          <h1>JSON Editor</h1>
          <p className="hero-copy">
            一个可直接打包部署的 JSON 编辑器，专注常用文本编辑、校验和导入导出体验。
          </p>

          <div className="meta-row">
            <span>{stats.lines} lines</span>
            <span>{stats.characters} chars</span>
            <span>{stats.empty ? 'empty' : 'in sync'}</span>
          </div>
        </section>

        <section className="panel">
          <div className="toolbar">
            <button type="button" onClick={handleFormat}>
              格式化
            </button>
            <button type="button" onClick={handleMinify}>
              压缩
            </button>
            <button type="button" onClick={handleValidate}>
              校验
            </button>
            <button type="button" onClick={handleCopy}>
              复制
            </button>
            <button type="button" onClick={handleDownload}>
              下载
            </button>
            <button type="button" onClick={handleUploadClick}>
              上传文件
            </button>
            <button type="button" className="ghost" onClick={handleClear}>
              清空
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,text/plain"
              hidden
              onChange={handleFileUpload}
            />
          </div>

          <div className={`status status-${status.tone}`}>
            <strong>{status.title}</strong>
            <span>{status.detail}</span>
          </div>

          <label className="editor-frame" htmlFor="json-editor">
            <span className="editor-label">Editor</span>
            <textarea
              id="json-editor"
              spellCheck={false}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="在这里粘贴 JSON 内容..."
            />
          </label>
        </section>
      </main>
    </div>
  );
}
