import React, { useState, useEffect, useRef } from 'react';
import { ConnectionSettings, ChatMessage, Person, Marriage, ToolCall } from '../../types';
import * as aiService from '../../services/aiService';
import * as apiService from '../../services/apiService';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { Spinner } from '../ui/Spinner';

interface ChatbotProps {
    connectionSettings: ConnectionSettings;
    people: Person[];
    marriages: Marriage[];
    refreshData: () => Promise<void>;
}

export const Chatbot: React.FC<ChatbotProps> = ({ connectionSettings, people, marriages, refreshData }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleToolCall = async (toolCall: ToolCall) => {
        const { name, args } = toolCall;
        let result = '';

        try {
            switch (name) {
                case 'get_people':
                    const currentPeople = await apiService.getPeople();
                    result = `Found ${currentPeople.length} people: ` + currentPeople.map(p => `${p.first_name} ${p.last_name} (ID: ${p.id})`).join(', ');
                    break;
                case 'get_marriages':
                     const currentMarriages = await apiService.getMarriages();
                     result = `Found ${currentMarriages.length} marriages.`;
                    break;
                case 'add_person':
                    const personDefaults = { enslaved: false, dna_match: false };
                    const newPersonData = { 
                        ...personDefaults, 
                        ...args, 
                        is_home_person: people.length === 0 
                    };
                    const newPerson = await apiService.addPerson(newPersonData);
                    await refreshData();
                    result = `Successfully added ${newPerson.first_name} ${newPerson.last_name} with ID ${newPerson.id}.`;
                    break;
                case 'update_person':
                    const updatedPerson = await apiService.updatePerson(args.person_id, args.updates);
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

        const response = await aiService.generateChatResponse(newHistory, connectionSettings, people);
        
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
            
            const finalResponse = await aiService.generateChatResponse(historyForNextTurn, connectionSettings, people);
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

    return (
        <Card title="AI Assistant" icon={ICONS.VOICE_CHAT} className="h-full">
            <div className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => {
                        // Don't render internal-state messages in the UI
                        if (msg.role === 'model' && msg.toolCalls) {
                            return null;
                        }
                        return (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && <span className="text-accent self-start mr-2 mt-1 shrink-0">{ICONS.VOICE_CHAT}</span>}
                                <div className={`rounded-lg px-4 py-2 max-w-sm ${
                                    msg.role === 'user' ? 'bg-accent text-white' : 
                                    msg.role === 'tool' ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs italic' :
                                    'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                    {msg.role === 'tool' && msg.toolName && <p className="font-bold mb-1">Tool Executed: {msg.toolName}</p>}
                                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                                </div>
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
                            disabled={isLoading || !connectionSettings.supabaseUrl}
                        />
                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50" disabled={isLoading || !input.trim() || !connectionSettings.supabaseUrl}>
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </Card>
    );
};