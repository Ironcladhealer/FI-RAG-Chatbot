import React from 'react'
import PromptSuggestionButton from './PromptSuggestionButton'
import { text } from 'stream/consumers'

const PromptSuggestionRow = ({ onPromptClick }) => {
  const prompts = [
    "Who won the 2023 F1 World Championship?",
    "What are the key features of the latest F1 car?",
    "How does the points system work in F1?",
  ]
  
    return (
    <div className='prompt-suggestion-row'>
        {prompts.map((prompt, index) => 
            <PromptSuggestionButton key={`suggestion-${index}`} text={prompt} onClick={() => onPromptClick(prompt)}/>
        )}
    </div>
  )
}

export default PromptSuggestionRow