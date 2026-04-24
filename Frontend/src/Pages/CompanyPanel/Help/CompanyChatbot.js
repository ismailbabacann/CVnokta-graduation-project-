import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import styles from './CompanyChatbot.module.css';

const BOT_INTRO = 'Merhaba! 👋 Ben hr.ai İşveren Asistanıyım. İlan oluşturma, aday değerlendirme, raporlama veya platform süreçleri hakkında her türlü sorunuzu yanıtlayabilirim.';

function CompanyChatbot() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: BOT_INTRO }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesAreaRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        if (messagesAreaRef.current) {
            messagesAreaRef.current.scrollTo({
                top: messagesAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userText = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:8888/api/v1/chatbot/company', {
                message: userText,
                history: messages.slice(-6)
            });

            if (response.data && response.data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
            }
        } catch (error) {
            console.error('Chatbot hatası:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Şu anda sistemde bir yoğunluk var, lütfen daha sonra tekrar deneyin.' 
            }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus({ preventScroll: true });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const sendQuickQuestion = (question) => {
        setInputValue(question);
        setTimeout(() => {
            const btn = document.getElementById('company-send-btn');
            if(btn) btn.click();
        }, 50);
    };

    return (
        <div className={styles.chatbotWrapper}>
            <div className={styles.chatPanel}>
                {/* Messages area */}
                <div className={styles.messagesArea} ref={messagesAreaRef}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble}`}
                        >
                            {msg.role === 'assistant' && <span className={styles.botAvatar}>🤖</span>}
                            <div className={styles.messageContent}>
                                {msg.content}
                            </div>
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
                {messages.length < 3 && (
                    <div className={styles.quickQuestions}>
                        <button onClick={() => sendQuickQuestion('İlan nasıl verilir?')} className={styles.chip}>İlan Nasıl Verilir?</button>
                        <button onClick={() => sendQuickQuestion('Adayları nasıl değerlendiriyorsunuz?')} className={styles.chip}>Değerlendirme Süreci</button>
                        <button onClick={() => sendQuickQuestion('NLP nedir?')} className={styles.chip}>NLP Teknolojisi</button>
                        <button onClick={() => sendQuickQuestion('Mülakatları sistem mi yapıyor?')} className={styles.chip}>AI Mülakat</button>
                    </div>
                )}

                {/* Input area */}
                <div className={styles.inputArea}>
                    <textarea
                        ref={inputRef}
                        className={styles.textarea}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="İşveren asistanına soru sorun..."
                        rows={1}
                        disabled={isLoading}
                    />
                    <button 
                        id="company-send-btn"
                        className={styles.sendBtn} 
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CompanyChatbot;
