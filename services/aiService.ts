import { GoogleGenAI, FunctionDeclaration, Type, Part, FunctionResponsePart } from '@google/genai';
import { AiSettings, ChatMessage, Person, ToolCall } from '../types';

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

// --- Main AI Service ---

type AiResponse = { type: 'text', content: string } | { type: 'tool_call', calls: ToolCall[] };

const generateGeminiResponse = async (history: ChatMessage[], settings: AiSettings): Promise<AiResponse> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    // Build the history in the format Gemini expects
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
                    response: { result: msg.content } // FIX: Changed 'content' to 'result' to match API expectations
                }
            };
            contents.push({ role: 'function', parts: [functionResponse] });
        }
    }
    
    // Group consecutive function responses
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
                systemInstruction: settings.systemPrompt,
                tools: [{ functionDeclarations: tools }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
             const toolCalls: ToolCall[] = response.functionCalls.map((fc: any) => ({
                id: fc.name + '-' + Date.now() + Math.random(), // Gemini API doesn't always provide an ID, so we create one.
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

const generateOllamaResponse = async (history: ChatMessage[], settings: AiSettings): Promise<AiResponse> => {
    const ollamaHistory = history.map(msg => {
        switch (msg.role) {
            case 'user':
                return { role: 'user', content: msg.content };
            case 'model':
                return { 
                    role: 'assistant', 
                    content: msg.content || null, // Ensure content is null if empty for some models
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
    }).filter(Boolean); // Filter out any undefined results, just in case

    const ollamaTools = tools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));

    try {
        const response = await fetch(settings.ollamaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: settings.systemPrompt },
                    ...ollamaHistory
                ],
                tools: ollamaTools,
                stream: false
            }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Ollama API Error Response:", errorBody);
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();

        if (result.message?.tool_calls && result.message.tool_calls.length > 0) {
            const toolCalls: ToolCall[] = result.message.tool_calls.map((tc: any) => {
                let args = {};
                try {
                    // Ollama often returns arguments as a string, so we need to parse it.
                    if (typeof tc.function.arguments === 'string') {
                        args = JSON.parse(tc.function.arguments);
                    } else {
                        args = tc.function.arguments;
                    }
                } catch(e) {
                    console.error("Failed to parse Ollama tool arguments:", tc.function.arguments, e);
                }
                return {
                    id: tc.id || `${tc.function.name}-${Date.now()}`,
                    name: tc.function.name,
                    args: args,
                };
            });
            return { type: 'tool_call', calls: toolCalls };
        }

        if (result.message?.content) {
            return { type: 'text', content: result.message.content };
        }

        return { type: 'text', content: "Received an empty response from Ollama." };

    } catch (error) {
        console.error("Ollama Communication Error:", error);
        return { type: 'text', content: "Error communicating with Ollama. Please ensure the local server is running, the model is loaded, and the URL/model name in Settings are correct." };
    }
};

export const generateChatResponse = async (
    history: ChatMessage[],
    settings: AiSettings,
    allPeople: Person[], // For context
): Promise<AiResponse> => {
    if (settings.provider === 'gemini') {
        return generateGeminiResponse(history, settings);
    } else { // Ollama
        return generateOllamaResponse(history, settings);
    }
};