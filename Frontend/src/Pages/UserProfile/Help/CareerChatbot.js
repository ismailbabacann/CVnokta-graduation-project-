import React, { useState, useRef, useEffect } from 'react';
import styles from './CareerChatbot.module.css';

// Örnek hızlı sorular
const QUICK_QUESTIONS = [
    'HR AI nedir?',
    'Mülakat maili ne zaman gelir?',
    'İyi CV nasıl olur?',
    'Elenmemek için ne yapmalıyım?',
    'Başvuru sürecim nasıl ilerliyor?',
];

const BOT_INTRO = 'Merhaba! 👋 Ben CVnokta Kariyer Asistanıyım. Başvuru süreci, CV hazırlama, mülakat ipuçları veya platform kullanımı hakkında her türlü sorunuzu yanıtlayabilirim. Size nasıl yardımcı olabilirim?';

// AI-NLP backend URL (port 8888 - running uvicorn)
const CHATBOT_API_URL = 'http://localhost:8888/api/v1/chatbot/chat';

function CareerChatbot() {
    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: BOT_INTRO }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesAreaRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        if (messagesAreaRef.current) {
            // Animasyonlu scroll için requestAnimationFrame veya setTimeout da eklenebilir ama basitçe:
            messagesAreaRef.current.scrollTo({
                top: messagesAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text) => {
        const userMessage = text || inputValue.trim();
        if (!userMessage || isLoading) return;

        setInputValue('');
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const history = newMessages.slice(1, -1).map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch(CHATBOT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: history.slice(-6),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            const isRateLimit = err.message?.includes('429');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isRateLimit
                    ? '⏳ Şu anda çok fazla istek var. Lütfen birkaç saniye bekleyip tekrar deneyin.'
                    : '❌ Bağlantı hatası oluştu. Lütfen sayfayı yenileyip tekrar deneyin.',
                isError: true,
            }]);
        } finally {
            setIsLoading(false);
            // Input'a focuslanırken sayfanın yukarı kaymasını engeller
            inputRef.current?.focus({ preventScroll: true });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className={styles.chatbotWrapper}>
            {/* Header - toggle */}
            <button
                className={styles.chatbotToggle}
                onClick={() => setIsOpen(prev => !prev)}
                id="chatbot-toggle-btn"
                aria-expanded={isOpen}
            >
                <span className={styles.toggleIcon}>🤖</span>
                <div className={styles.toggleText}>
                    <span className={styles.toggleTitle}>CV Kariyer Asistanı</span>
                    <span className={styles.toggleSubtitle}>Sorularınızı yanıtlıyorum</span>
                </div>
                <span className={`${styles.toggleArrow} ${isOpen ? styles.arrowUp : ''}`}>▾</span>
            </button>

            {/* Chat panel */}
            {isOpen && (
                <div className={styles.chatPanel}>
                    {/* Messages area */}
                    <div className={styles.messagesArea} id="chatbot-messages" ref={messagesAreaRef}>
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble} ${msg.isError ? styles.errorBubble : ''}`}
                            >
                                {msg.role === 'assistant' && (
                                    <span className={styles.botAvatar}>🤖</span>
                                )}
                                <div className={styles.bubbleText}>{msg.content}</div>
                                {msg.role === 'user' && (
                                    <span className={styles.userAvatar}>👤</span>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className={`${styles.messageBubble} ${styles.botBubble}`}>
                                <span className={styles.botAvatar}>🤖</span>
                                <div className={styles.typingIndicator}>
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick question chips */}
                    <div className={styles.quickQuestionsArea}>
                        {QUICK_QUESTIONS.map((q, idx) => (
                            <button
                                key={idx}
                                className={styles.quickChip}
                                onClick={() => sendMessage(q)}
                                disabled={isLoading}
                            >
                                {q}
                            </button>
                        ))}
                    </div>

                    {/* Input bar */}
                    <div className={styles.inputBar}>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.chatInput}
                            placeholder="Sorunuzu yazın..."
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            id="chatbot-input"
                            maxLength={500}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={() => sendMessage()}
                            disabled={isLoading || !inputValue.trim()}
                            id="chatbot-send-btn"
                            aria-label="Gönder"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CareerChatbot;
