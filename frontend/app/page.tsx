"use client"
import Image from 'next/image'
import Logo from './assets/f1_logo.png'
import { useState } from 'react'
import Bubble from './components/Bubble'
import PromptSuggestionRow from './components/PromptSuggestionRow'
import LoadingBubble from './components/LoadingBubble'

const Home = () => {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const noMessage = !messages || messages.length === 0

  const append = (msg: { id: string; content: any; role: string }) => {
     // Add the prompt message to the chat history and trigger sending
  setMessages(prev => [...prev, { role: msg.role, content: msg.content }]);
  setInput('');
  setIsLoading(true);

  // Send the prompt to the backend as if it was submitted
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg.content })
  })
    .then(response => response.json())
    .then(data => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    })
    .catch(error => {
      console.error('Chat error:', error);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  const handlePrompt = (promptText) => {
    const msg = {
      id: crypto.randomUUID(),
      content: promptText,
      role: 'user'
    }
    append(msg)
  }

return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <Image src={Logo} alt="App Logo" width={150} height={150} />
      <section className={noMessage ? "" : "populated"}>
        {noMessage ? (
          <div className="mt-6 p-4 bg-white rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4">Welcome to the AI Chat App</h2>
            <p>Ask me anything about F1!</p>
            <br/>
            <PromptSuggestionRow onPromptClick={handlePrompt}/>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-white rounded shadow-md max-h-96 overflow-y-auto">
            {messages.map((message, index) => <Bubble key={`message-${index}`} message={message}/>)}
            {isLoading && <LoadingBubble/>}
          </div>
        )}
      </section>
      <form onSubmit={handleSubmit} className="mt-4 w-full max-w-md">
          <input 
            className='w-full px-3 py-2 border rounded question-box' 
            onChange={handleInputChange} 
            value={input} 
            placeholder='Ask me anything about F1'
            disabled={isLoading}
          />
          <button 
            type='submit'
            className='w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400'
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
    </main>
  )    
}

export default Home
