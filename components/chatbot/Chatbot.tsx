import React, { useState, useEffect, useRef } from 'react';
import { AiConfig, ChatMessage, Person, Marriage, ToolCall, AiFeedback } from '../../types';
import * as aiService from '../../services/aiService';
import * as api from '../../services/apiService';
import * as mockApi from '../../services/mockApiService';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { Spinner } from '../ui/Spinner';
import { FeedbackModal } from '../feedback/FeedbackModal';

interface ChatbotProps {
    aiConfig: AiConfig;
    people: Person[];
    marriages: Marriage[];
    refreshData: () => Promise<void>;
    isDemoMode: boolean;
    title?: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ 
    aiConfig, 
    people, 
    marriages, 
    refreshData, 
    isDemoMode, 
    title = "AI Assistant" 
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackForMessage, setFeedbackForMessage] = useState<ChatMessage | null>(null);
    const [currentRating, setCurrentRating] = useState<1 | -1>(1);

    const { provider, geminiApiKey, ollamaUrl, model } = aiConfig;
    const isConfigured = (provider === 'gemini' && !!geminiApiKey) || (provider === 'ollama' && !!ollamaUrl && !!model);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleToolCall = async (toolCall: ToolCall) => {
        const { name, args } = toolCall;
        let result = '';
        const currentApiService = isDemoMode ? mockApi : api;

        try {
            switch (name) {
                case 'get_people':
                    const currentPeople = await currentApiService.getPeople();
                    result = `Found ${currentPeople.length} people: ` + currentPeople.map(p => `${p.first_name} ${p.last_name} (ID: ${p.id})`).join(', ');
                    break;
                case 'get_marriages':
                     const currentMarriages = await currentApiService.getMarriages();
                     result = `Found ${currentMarriages.length} marriages.`;
                    break;
                case 'add_person':
                    const personDefaults = { enslaved: false, dna_match: false };
                    const newPersonData = { 
                        ...personDefaults, 
                        ...args, 
                        is_home_person: people.length === 0 
                    };
                    const newPerson = await currentApiService.addPerson(newPersonData);
                    await refreshData();
                    result = `Successfully added ${newPerson.first_name} ${newPerson.last_name} with ID ${newPerson.id}.`;
                    break;
                case 'update_person':
                    const updatedPerson = await currentApiService.updatePerson(args.person_id, args.updates);
                    await refreshData();
                    result = `Successfully updated ${updatedPerson.first_name} ${updatedPerson.last_name}.`;
                    break;
                default:
                    result = `Unknown tool: ${name}`;
            }
        } catch (error: any) {
            result = `Error executing tool ${name}: ${error.message}`;
        }
        return result;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
        const newHistory = [...messages, userMessage];
        setMessages(newHistory);
        setInput('');
        setIsLoading(true);

        const response = await aiService.generateChatResponse(newHistory, aiConfig, people);
        
        if (response.type === 'text') {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: response.content }]);
        } else if (response.type === 'tool_call' && response.calls?.length > 0) {
            const modelRequestMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: '',
                toolCalls: response.calls,
            };

            const toolResultMessages: ChatMessage[] = [];
            for (const toolCall of response.calls) {
                const toolResultContent = await handleToolCall(toolCall);
                toolResultMessages.push({
                    id: `${Date.now()}-${toolCall.name}`,
                    role: 'tool',
                    content: toolResultContent,
                    toolCallId: toolCall.id,
                    toolName: toolCall.name,
                });
            }
            
            const historyForNextTurn = [...newHistory, modelRequestMessage, ...toolResultMessages];
            setMessages(historyForNextTurn);
            
            const finalResponse = await aiService.generateChatResponse(historyForNextTurn, aiConfig, people);
            if (finalResponse.type === 'text') {
                const finalModelMessage = { id: (Date.now() + 1).toString(), role: 'model' as const, content: finalResponse.content };
                setMessages(prev => [...prev, finalModelMessage]);
            } else {
                 const errorMessage = { id: (Date.now() + 1).toString(), role: 'model' as const, content: "Something went wrong after using the tool." };
                 setMessages(prev => [...prev, errorMessage]);
            }
        }

        setIsLoading(false);
    };

    const handleOpenFeedback = (message: ChatMessage, rating: 1 | -1) => {
        setFeedbackForMessage(message);
        setCurrentRating(rating);
        setIsFeedbackModalOpen(true);
    };
    
    const handleCloseFeedback = () => {
        setIsFeedbackModalOpen(false);
        setFeedbackForMessage(null);
    };
    
    const handleSubmitFeedback = async (feedbackText: string) => {
        if (!feedbackForMessage) return;

        // Find the user prompt that preceded this model response
        const messageIndex = messages.findIndex(m => m.id === feedbackForMessage.id);
        let userPrompt = "No preceding user prompt found.";
        if (messageIndex > 0) {
            for (let i = messageIndex - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                    userPrompt = messages[i].content;
                    break;
                }
            }
        }

        const feedbackData: Omit<AiFeedback, 'id' | 'created_at'> = {
            user_prompt: userPrompt,
            model_response: feedbackForMessage.content,
            rating: currentRating,
            feedback_text: feedbackText,
            model_used: `${aiConfig.provider}: ${aiConfig.model}`,
            connection_settings: aiConfig,
        };

        try {
            if (isDemoMode) {
                await mockApi.addAiFeedback(feedbackData);
            } else {
                await api.addAiFeedback(feedbackData);
            }
            // Optionally, show a success toast/message here
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            // Optionally, show an error toast/message here
        }

        handleCloseFeedback();
    };


    return (
        <>
            <Card title={title} icon={ICONS.VOICE_CHAT} className="h-full">
                <div className="flex flex-col h-full relative">
                    {!isConfigured && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 flex flex-col justify-center items-center text-center p-4 rounded-b-lg">
                            <div className="text-accent mb-2 w-12 h-12">{ICONS.VOICE_CHAT}</div>
                            <h4 className="font-bold mb-2">AI Assistant Not Configured</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Please configure your {provider === 'gemini' ? 'Gemini API Key' : 'Ollama URL and Model'} in the Settings page to enable the chatbot.
                            </p>
                        </div>
                    )}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => {
                            if (msg.role === 'model' && msg.toolCalls) {
                                return null;
                            }
                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'model' && <span className="text-accent self-start mr-2 mt-1 shrink-0">{ICONS.VOICE_CHAT}</span>}
                                    <div className={`rounded-lg px-4 py-2 max-w-sm ${
                                        msg.role === 'user' ? 'bg-accent text-white' : 
                                        msg.role === 'tool' ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs italic' :
                                        'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        {msg.role === 'tool' && msg.toolName && <p className="font-bold mb-1">Tool Executed: {msg.toolName}</p>}
                                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                                    </div>
                                    {msg.role === 'model' && !isLoading && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleOpenFeedback(msg, 1)} title="Good response" className="p-1 text-gray-400 hover:text-green-500 transition-colors"><span className="w-4 h-4 block">{ICONS.THUMBS_UP}</span></button>
                                            <button onClick={() => handleOpenFeedback(msg, -1)} title="Bad response" className="p-1 text-gray-400 hover:text-red-500 transition-colors"><span className="w-4 h-4 block">{ICONS.THUMBS_DOWN}</span></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {isLoading && (
                             <div className="flex justify-start">
                                <span className="text-accent self-start mr-2 mt-1">{ICONS.VOICE_CHAT}</span>
                                <div className="rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-800 flex items-center gap-2">
                                    <Spinner />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about your family tree..."
                                className="flex-grow bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-accent focus:border-accent"
                                disabled={isLoading || !isConfigured}
                            />
                            <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50" disabled={isLoading || !input.trim() || !isConfigured}>
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </Card>
            {isFeedbackModalOpen && feedbackForMessage && (
                <FeedbackModal
                    isOpen={isFeedbackModalOpen}
                    onClose={handleCloseFeedback}
                    onSubmit={handleSubmitFeedback}
                    rating={currentRating}
                    response={feedbackForMessage.content}
                />
            )}
        </>
    );
};
