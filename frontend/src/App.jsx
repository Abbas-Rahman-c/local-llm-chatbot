import { useState, useRef, useEffect } from "react"
import axios from "axios"

export default function App() {
  // Tab state — "chat" or "rag"
  const [activeTab, setActiveTab] = useState("chat")

  // Chat tab state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  // RAG tab state
  const [ragMessages, setRagMessages] = useState([])
  const [ragInput, setRagInput] = useState("")
  const [ragLoading, setRagLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [uploading, setUploading] = useState(false)

  const bottomRef = useRef(null)
  const ragBottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    ragBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ragMessages])

  // Regular chat
const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = { role: "user", content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message: input,
        history: messages  // send full conversation history
      })
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }])
    } finally {
      setLoading(false)
    }
  }

  // PDF upload
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadStatus("Uploading and processing PDF...")
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await axios.post("http://localhost:8000/upload", formData)
      setUploadStatus(`✅ ${res.data.message} (${res.data.chunks} chunks)`)
    } catch {
      setUploadStatus("❌ Upload failed. Try again.")
    } finally {
      setUploading(false)
    }
  }

  // RAG chat
  const sendRagMessage = async () => {
    if (!ragInput.trim() || ragLoading) return
    const userMessage = { role: "user", content: ragInput }
    setRagMessages(prev => [...prev, userMessage])
    setRagInput("")
    setRagLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/rag-chat", { message: ragInput })
      setRagMessages(prev => [...prev, { role: "assistant", content: res.data.response }])
    } catch {
      setRagMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }])
    } finally {
      setRagLoading(false)
    }
  }

  const handleKeyDown = (e, fn) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fn() }
  }

  const MessageBubble = ({ msg }) => (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}>
        {msg.content}
      </div>
    </div>
  )

  const TypingIndicator = () => (
    <div className="flex justify-start">
      <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 bg-gray-900">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        <h1 className="text-lg font-semibold tracking-tight">LLM Chatbot</h1>
        <span className="text-xs text-gray-500 ml-auto">llama3.2 · local</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {["chat", "rag"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition-colors
              ${activeTab === tab ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {tab === "chat" ? "💬 Chat" : "📄 Research (RAG)"}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 mt-20 text-sm">Send a message to start chatting</div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 py-4 border-t border-gray-800 bg-gray-900">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <textarea
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                rows={1}
                placeholder="Type a message... (Enter to send)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, sendMessage)}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-5 py-3 rounded-xl text-sm font-medium transition-colors"
              >Send</button>
            </div>
          </div>
        </>
      )}

      {/* RAG Tab */}
      {activeTab === "rag" && (
        <>
          {/* PDF Upload area */}
          <div className="px-4 py-3 border-b border-gray-800 bg-gray-900">
            <div className="flex items-center gap-4 max-w-4xl mx-auto">
              <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">
                {uploading ? "Processing..." : "📎 Upload PDF"}
                <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
              {uploadStatus && <span className="text-xs text-gray-400">{uploadStatus}</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {ragMessages.length === 0 && (
              <div className="text-center text-gray-600 mt-20 text-sm">
                Upload a PDF above, then ask questions about it
              </div>
            )}
            {ragMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {ragLoading && <TypingIndicator />}
            <div ref={ragBottomRef} />
          </div>

          <div className="px-4 py-4 border-t border-gray-800 bg-gray-900">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <textarea
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                rows={1}
                placeholder="Ask a question about your PDF..."
                value={ragInput}
                onChange={e => setRagInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, sendRagMessage)}
              />
              <button
                onClick={sendRagMessage}
                disabled={ragLoading || !ragInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-5 py-3 rounded-xl text-sm font-medium transition-colors"
              >Send</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}