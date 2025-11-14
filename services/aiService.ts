import { GoogleGenAI, FunctionDeclaration, Type, Part, FunctionResponsePart } from '@google/genai';
import { AiConfig, ChatMessage, Person, ToolCall, OllamaModel } from '../types';

// --- Tool Definitions (shared between Gemini and Ollama) ---
const tools: FunctionDeclaration[] = [
    {
        name: 'get_people',
        description: 'Get a list of all people in the family tree.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'get_marriages',
        description: 'Get a list of all marriages in the family tree.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'add_person',
        description: 'Add a new person to the family tree.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                first_name: { type: Type.STRING, description: 'The first name of the person.' },
                last_name: { type: Type.STRING, description: 'The last name of the person.' },
                gender: { type: Type.STRING, description: "The person's gender.", enum: ['Male', 'Female', 'Other', 'Unknown'] },
                birth_date: { type: Type.STRING, description: 'The birth date in YYYY-MM-DD format.' },
                death_date: { type: Type.STRING, description: 'The death date in YYYY-MM-DD format.' },
            },
            required: ['first_name', 'last_name']
        }
    },
    {
        name: 'update_person',
        description: 'Update an existing person\'s information.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                person_id: { type: Type.STRING, description: 'The ID of the person to update.' },
                updates: {
                    type: Type.OBJECT,
                    description: 'An object containing the fields to update.',
                    properties: {
                        first_name: { type: Type.STRING },
                        last_name: { type: Type.STRING },
                        gender: { type: Type.STRING, enum: ['Male', 'Female', 'Other', 'Unknown'] },
                        birth_date: { type: Type.STRING, description: 'YYYY-MM-DD format.' },
                        death_date: { type: Type.STRING, description: 'YYYY-MM-DD format.' },
                        mother_id: { type: Type.STRING },
                        father_id: { type: Type.STRING },
                    }
                }
            },
            required: ['person_id', 'updates']
        }
    }
];

// --- Centralized Ollama Helpers ---
const getOllamaEndpoint = (baseUrl: string, path: '/api/chat' | '/api/tags'): string => {
    if (!baseUrl || !baseUrl.trim()) {
        throw new Error("Ollama URL is not configured.");
    }
    const cleanedBase = baseUrl.trim().replace(/\/+$/, '');
    return `${cleanedBase}${path}`;
};

const getOllamaHeaders = (config: Pick<AiConfig, 'ollamaApiKey'>): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (config.ollamaApiKey) {
        headers['Authorization'] = `Bearer ${config.ollamaApiKey}`;
    }
    return headers;
};

const handleOllamaError = async (error: any, urlAttempted: string): Promise<string> => {
    console.error(`Ollama communication error for URL [${urlAttempted}]:`, error);

    if (error.response) { // Check if it's a Response object from a failed fetch
        const response = error.response as Response;
        const errorBody = await response.text().catch(() => 'Could not read error body.');

        if (response.status === 401 || response.status === 403) {
            return `Authentication failed (Status: ${response.status}). Please check your Ollama API Key in Settings.`;
        }
        if (response.status === 404) {
            return `Ollama server responded with 404 Not Found.\n\nThe application tried to access the following URL, which appears to be incorrect:\n${urlAttempted}\n\nPlease check your Ollama URL in Settings. It should be the base address (e.g., http://localhost:11434), not a full API path.`;
        }
        return `Ollama server responded with an error (Status: ${response.status}):\n${errorBody}`;
    }
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return `Connection to Ollama failed. This is almost always a Cross-Origin Resource Sharing (CORS) issue.\n\nYour browser is blocking the request for security reasons. To fix this, you must configure your Ollama server to allow requests from this application's origin.\n\n**Solution:**\nRestart your Ollama server with the OLLAMA_ORIGINS environment variable set. For example:\n\nOLLAMA_ORIGINS='*' ollama serve\n\n(Replace * with the specific origin for better security if possible).`;
    }

    // Generic fallback for other types of errors
    return `An unexpected error occurred while communicating with Ollama: ${error.message}`;
};


// --- Main AI Service ---

type AiResponse = { type: 'text', content: string } | { type: 'tool_call', calls: ToolCall[] };

const generateGeminiResponse = async (history: ChatMessage[], config: AiConfig): Promise<AiResponse> => {
    if (!config.geminiApiKey) {
        return { type: 'text', content: 'Gemini API Key is not configured. Please add it in Settings.' };
    }
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const model = 'gemini-2.5-flash';

    const contents: Part[] = [];
    for (const msg of history) {
        if (msg.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'model') {
            if (msg.toolCalls && msg.toolCalls.length > 0) {
                 const functionCalls = msg.toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.args } }));
                 contents.push({ role: 'model', parts: functionCalls });
            } else {
                 contents.push({ role: 'model', parts: [{ text: msg.content }] });
            }
        } else if (msg.role === 'tool') {
             if (!msg.toolName) continue;
             const functionResponse = {
                functionResponse: {
                    name: msg.toolName,
                    response: { result: msg.content }
                }
            };
            contents.push({ role: 'function', parts: [functionResponse] });
        }
    }
    
    const groupedContents = contents.reduce((acc, part, index) => {
        if (part.role === 'function' && index > 0 && acc.length > 0 && acc[acc.length - 1].role === 'function') {
            (acc[acc.length - 1].parts as FunctionResponsePart[]).push(...(part.parts as FunctionResponsePart[]));
        } else {
            acc.push(part);
        }
        return acc;
    }, [] as Part[]);


    try {
        const response = await ai.models.generateContent({
            model,
            contents: groupedContents,
            config: {
                systemInstruction: config.systemPrompt,
                tools: [{ functionDeclarations: tools }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
             const toolCalls: ToolCall[] = response.functionCalls.map((fc: any) => ({
                id: fc.name + '-' + Date.now() + Math.random(),
                name: fc.name,
                args: fc.args,
            }));
            return { type: 'tool_call', calls: toolCalls };
        }
        if (response.text) {
            return { type: 'text', content: response.text };
        }
        return { type: 'text', content: "I'm sorry, I couldn't generate a response." };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return { type: 'text', content: "Error communicating with Gemini API. Please check your API key and network connection." };
    }
};

const generateOllamaResponse = async (history: ChatMessage[], config: AiConfig): Promise<AiResponse> => {
    const chatUrl = getOllamaEndpoint(config.ollamaUrl, '/api/chat');
    try {
        const ollamaHistory = history.map(msg => {
            switch (msg.role) {
                case 'user':
                    return { role: 'user', content: msg.content };
                case 'model':
                    return { 
                        role: 'assistant', 
                        content: msg.content || null,
                        tool_calls: msg.toolCalls?.map(tc => ({
                            id: tc.id,
                            type: 'function',
                            function: { name: tc.name, arguments: tc.args }
                        }))
                    };
                case 'tool':
                    return {
                        role: 'tool',
                        content: msg.content,
                        tool_call_id: msg.toolCallId,
                    };
            }
        }).filter(Boolean);

        const ollamaTools = tools.map(tool => ({
            type: 'function',
            function: { name: tool.name, description: tool.description, parameters: tool.parameters }
        }));

        const response = await fetch(chatUrl, {
            method: 'POST',
            headers: getOllamaHeaders(config),
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'system', content: config.systemPrompt }, ...ollamaHistory],
                tools: ollamaTools,
                stream: false
            }),
        });
        
        if (!response.ok) throw { response };
        
        const result = await response.json();

        if (result.message?.tool_calls && result.message.tool_calls.length > 0) {
            const toolCalls: ToolCall[] = result.message.tool_calls.map((tc: any) => {
                let args = {};
                try {
                    if (typeof tc.function.arguments === 'string') {
                        args = JSON.parse(tc.function.arguments);
                    } else {
                        args = tc.function.arguments;
                    }
                } catch(e) { console.error("Failed to parse Ollama tool arguments:", tc.function.arguments, e); }
                return { id: tc.id || `${tc.function.name}-${Date.now()}`, name: tc.function.name, args: args };
            });
            return { type: 'tool_call', calls: toolCalls };
        }

        if (result.message?.content) {
            return { type: 'text', content: result.message.content };
        }

        return { type: 'text', content: "Received an empty response from Ollama." };
    } catch (error: any) {
        const friendlyMessage = await handleOllamaError(error, chatUrl);
        return { type: 'text', content: friendlyMessage };
    }
};

export const generateChatResponse = async (
    history: ChatMessage[],
    config: AiConfig,
    allPeople: Person[],
): Promise<AiResponse> => {
    if (config.provider === 'gemini') {
        return generateGeminiResponse(history, config);
    } else {
        return generateOllamaResponse(history, config);
    }
};

export const testOllamaConnection = async (config: Pick<AiConfig, 'ollamaUrl' | 'model' | 'ollamaApiKey'>): Promise<{ success: boolean; message: string }> => {
    const testUrl = getOllamaEndpoint(config.ollamaUrl, '/api/chat');
    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: getOllamaHeaders(config),
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: 'Hi' }],
                stream: false,
            }),
        });
        if (!response.ok) throw { response };
        await response.json();
        return { success: true, message: 'Successfully connected to Ollama and model is available.' };
    } catch (error: any) {
        const friendlyMessage = await handleOllamaError(error, testUrl);
        return { success: false, message: friendlyMessage };
    }
};

export const getOllamaModels = async (ollamaUrl: string, ollamaApiKey?: string): Promise<OllamaModel[]> => {
    const tagsUrl = getOllamaEndpoint(ollamaUrl, '/api/tags');
    try {
        const response = await fetch(tagsUrl, { headers: getOllamaHeaders({ ollamaApiKey: ollamaApiKey || '' }) });
        if (!response.ok) throw { response };
        const data = await response.json();
        if (!data.models || !Array.isArray(data.models)) {
            throw new Error("Invalid response format from Ollama /api/tags endpoint.");
        }
        return data.models;
    } catch (error: any) {
        const friendlyMessage = await handleOllamaError(error, tagsUrl);
        throw new Error(friendlyMessage);
    }
};
