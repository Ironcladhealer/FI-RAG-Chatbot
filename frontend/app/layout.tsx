import './global.css'

export const metadata = {
    title: 'FI RAG Chatbot',
    description: 'A chatbot for Formula 1 using Retrieval-Augmented Generation (RAG) techniques.',
}

const RootLayout = ({ children }) => {
    return (
        <html lang="en">
            <body suppressHydrationWarning>{children}</body>
        </html>
    )
}

export default RootLayout