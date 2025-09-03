"use client";
import React, { useState, useRef, useEffect } from 'react';
import {
  DocumentTextIcon,
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useErrorHandler, safeAsync, ERROR_TYPES } from '../utils/errorHandler';
import { ClientAIAnalyzer } from '../utils/clientAI';

const AIFileChat = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [aiAnalyzer, setAiAnalyzer] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { handleAsync, clearError } = useErrorHandler();

  // Initialize AI analyzer and animation
  useEffect(() => {
    const initAI = async () => {
      try {
        const analyzer = new ClientAIAnalyzer();
        await analyzer.initialize();
        setAiAnalyzer(analyzer);
      } catch (error) {
        console.warn('Failed to initialize AI analyzer:', error);
      }
    };
    initAI();
    
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  // Enhanced close handler with animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Wait for animation to complete
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    clearError();
    setError('');
    setErrorMessage('');

    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown', 'text/csv'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setError('Please upload a text file, PDF, or markdown file.');
      setErrorMessage('Please upload a text file, PDF, or markdown file.');
      return;
    }

    setIsProcessingFile(true);
    setSelectedFile(file);

    await handleAsync(async () => {
      let content = '';
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'll simulate content extraction
        // In a real implementation, you'd use a PDF parsing library
        content = `PDF file "${file.name}" has been uploaded. This is a simulated extraction of the PDF content. In a production environment, this would contain the actual extracted text from the PDF using libraries like pdf-parse or PDF.js.`;
      } else {
        // For text files
        content = await safeAsync(async () => {
          const reader = new FileReader();
          return await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });
        }, {
          context: { operation: 'file_reading', fileName: file.name },
          operationId: `ai_chat_read_${Date.now()}`,
          retry: true,
          retryOptions: { maxRetries: 2, delay: 1000 }
        });
      }

      setFileContent(content);
      setMessages([{
        id: Date.now(),
        type: 'system',
        content: `File "${file.name}" has been successfully processed and is ready for conversation. You can now ask questions about its content.`,
        timestamp: new Date()
      }]);
    }, {
      context: { operation: 'file_upload', fileName: file.name },
      onError: (error) => {
        setError(error.userMessage || 'Failed to process the file. Please try again.');
        setErrorMessage(error.userMessage || 'Failed to process the file. Please try again.');
      },
      onFinally: () => {
        setIsProcessingFile(false);
      }
    });
  };

  const generateAIResponse = async (userMessage, fileContent, onProgress = null) => {
    if (!aiAnalyzer) {
      return 'AI analyzer is still initializing. Please wait a moment and try again.';
    }

    const lowerMessage = userMessage.toLowerCase();
    
    try {
      // Handle summarization requests
      if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
        if (onProgress) onProgress('Loading AI summarization model...');
        const summary = await aiAnalyzer.generateSummary(fileContent, 300);
        return `Here's a summary of the document:\n\n${summary}`;
      }
      
      // Handle sentiment analysis requests
      if (lowerMessage.includes('sentiment') || lowerMessage.includes('feeling') || lowerMessage.includes('tone')) {
        if (onProgress) onProgress('Loading AI sentiment analysis model...');
        const sentiment = await aiAnalyzer.analyzeSentiment(fileContent);
        return `The overall sentiment of this document is **${sentiment.sentiment}** with a confidence of ${Math.round(sentiment.confidence * 100)}%. ${sentiment.model === 'transformers' ? 'This analysis was performed using advanced AI models.' : ''}`;
      }
      
      // Handle classification requests
      if (lowerMessage.includes('classify') || lowerMessage.includes('category') || lowerMessage.includes('type')) {
        if (onProgress) onProgress('Loading AI text classification model...');
        const classification = await aiAnalyzer.classifyText(fileContent);
        const topCategory = classification.categories[0];
        return `This document appears to be classified as **${topCategory.label}** with ${Math.round(topCategory.confidence * 100)}% confidence.`;
      }
      
      // Handle general questions with question-answering
      if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why') || lowerMessage.includes('when') || lowerMessage.includes('where') || lowerMessage.includes('who')) {
        if (onProgress) onProgress('Loading AI question-answering model...');
        const answer = await aiAnalyzer.answerQuestion(userMessage, fileContent);
        if (answer.confidence > 0.3) {
          return `${answer.answer}\n\n*Confidence: ${Math.round(answer.confidence * 100)}%*`;
        } else {
          return `I couldn't find a confident answer to that question in the document. The document contains information about various topics, but I need a more specific question to provide a better answer.`;
        }
      }
      
      // Default: try question-answering for any other query
      if (onProgress) onProgress('Loading AI question-answering model...');
      const answer = await aiAnalyzer.answerQuestion(userMessage, fileContent);
      if (answer.confidence > 0.2) {
        return `${answer.answer}\n\n*Confidence: ${Math.round(answer.confidence * 100)}%*`;
      }
      
      // Fallback response
      return `I understand you're asking about: "${userMessage}". I can help you with:\n\n• **Summarizing** the document\n• **Analyzing sentiment** and tone\n• **Answering specific questions** about the content\n• **Classifying** the document type\n\nTry asking me something like "What is this document about?" or "Summarize this for me".`;
      
    } catch (error) {
      console.error('AI response generation failed:', error);
      return 'I apologize, but I encountered an error while analyzing the document. Please try rephrasing your question or ask for a summary.';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !fileContent) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    clearError();
    setError('');
    setErrorMessage('');

    await handleAsync(async () => {
      try {
        const aiResponse = await generateAIResponse(inputMessage, fileContent, (progress) => {
          setLoadingMessage(progress);
        });
        
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'ai',
          content: aiResponse,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('AI response generation failed:', error);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'ai',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date()
        }]);
      }
    }, {
      context: { operation: 'send_message', hasFile: !!fileContent },
      onError: (error) => {
        setError(error.userMessage || 'Failed to get AI response. Please try again.');
        setErrorMessage(error.userMessage || 'Failed to get AI response. Please try again.');
      },
      onFinally: () => {
        setIsLoading(false);
        setLoadingMessage('');
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Handle click outside to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col transition-all duration-200 transform ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-electric-cyan/20">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-electric-cyan" />
            <h2 className="text-2xl font-bold text-light-silver">AI File Chat</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-light-silver/60 hover:text-light-silver hover:bg-electric-cyan/10 rounded-lg transition-colors duration-200 hover:scale-105"
            title="Close AI Chat (Esc)"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* File Upload Section */}
        {!selectedFile && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <DocumentArrowUpIcon className="w-16 h-16 text-electric-cyan mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-light-silver mb-2">Upload a Document</h3>
              <p className="text-light-silver/60 mb-6">Upload a text file, PDF, or markdown document to start chatting with your content.</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.md,.csv,text/plain,application/pdf,text/markdown"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="px-6 py-3 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isProcessingFile ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-space-indigo border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Choose File'
                )}
              </button>
              
              {(error || errorMessage) && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error || errorMessage}</span>
                  <button 
                    onClick={() => { setError(''); setErrorMessage(''); clearError(); }}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Interface */}
        {selectedFile && (
          <>
            {/* File Info */}
            <div className="p-4 bg-electric-cyan/10 border-b border-electric-cyan/20">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-5 h-5 text-electric-cyan" />
                <span className="text-light-silver font-medium">{selectedFile.name}</span>
                <span className="text-light-silver/60 text-sm">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-electric-cyan text-space-indigo'
                        : message.type === 'system'
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                        : 'bg-space-indigo/50 text-light-silver border border-electric-cyan/20'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-60 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-space-indigo/50 text-light-silver border border-electric-cyan/20 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-electric-cyan rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-electric-cyan rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-electric-cyan rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <span className="text-sm">{loadingMessage || 'AI is thinking...'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-electric-cyan/20">
              <div className="flex space-x-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your document..."
                  className="flex-1 bg-space-indigo/50 border border-electric-cyan/30 text-light-silver rounded-lg px-4 py-3 focus:outline-none focus:border-electric-cyan resize-none transition-all duration-200 focus:bg-space-indigo/60 focus:ring-2 focus:ring-electric-cyan/20"
                  rows="2"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-3 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-space-indigo border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {(error || errorMessage) && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">{error || errorMessage}</span>
                  <button 
                    onClick={() => { setError(''); setErrorMessage(''); clearError(); }}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIFileChat;