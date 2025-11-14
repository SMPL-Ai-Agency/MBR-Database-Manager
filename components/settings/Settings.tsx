import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { ConnectionSettings } from '../../types';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  return [theme, setTheme] as const;
};

interface SettingsProps {
    settings: ConnectionSettings;
    onSettingsChange: (settings: ConnectionSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [theme, setTheme] = useTheme();
  const [localSettings, setLocalSettings] = useState(settings);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    alert("Settings saved!");
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
        const testClient = createClient(localSettings.supabaseUrl, localSettings.supabaseAnonKey);
        // A simple query to test the connection and key validity.
        const { error } = await testClient.from('persons').select('id').limit(1);
        if (error) throw error;
        setTestStatus('success');
        setTestMessage('Connection successful!');
    } catch (error: any) {
        setTestStatus('error');
        setTestMessage(`Connection failed: ${error.message}`);
    }
  };
  
  const baseInputClasses = "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold">Settings</h2>
            <Button onClick={handleSave}>Save Settings</Button>
        </div>

        <Card title="Supabase Connection" icon={ICONS.DATABASE}>
            <div className="space-y-4 p-2">
                 <div>
                    <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Supabase URL</label>
                     <input
                        type="text"
                        name="supabaseUrl"
                        value={localSettings.supabaseUrl}
                        onChange={handleChange}
                        className={baseInputClasses}
                        placeholder="https://your-project-ref.supabase.co"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Supabase Anon Key</label>
                     <input
                        type="password"
                        name="supabaseAnonKey"
                        value={localSettings.supabaseAnonKey}
                        onChange={handleChange}
                        className={baseInputClasses}
                        placeholder="your-anon-key"
                    />
                </div>
                <div className="flex items-center gap-4 pt-2">
                    <Button variant="secondary" onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                        {testStatus === 'testing' ? <div className="flex items-center gap-2"><Spinner /> Testing...</div> : 'Test Connection'}
                    </Button>
                    {testStatus !== 'idle' && testStatus !== 'testing' && (
                        <p className={`text-sm ${testStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                            {testMessage}
                        </p>
                    )}
                </div>
            </div>
        </Card>

        <Card title="Appearance" icon={ICONS.SETTINGS}>
            <div className="flex items-center justify-between p-2">
                <div className="flex flex-col">
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select your preferred interface theme.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Light</span>
                    <label htmlFor="theme-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="theme-toggle"
                            className="sr-only peer"
                            checked={theme === 'dark'}
                            onChange={toggleTheme}
                            aria-label="Theme toggle"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-accent dark:peer-focus:ring-accent peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent"></div>
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Dark</span>
                </div>
            </div>
        </Card>
        
        <Card title="AI Chatbot" icon={ICONS.VOICE_CHAT}>
            <div className="space-y-4 p-2">
                 <div>
                    <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Model Provider</label>
                    <select
                        name="provider"
                        value={localSettings.provider}
                        onChange={handleChange}
                        className={baseInputClasses}
                    >
                        <option value="ollama">Ollama (Local)</option>
                        <option value="gemini">Gemini (Google AI)</option>
                    </select>
                </div>
                
                {localSettings.provider === 'ollama' && (
                    <>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama URL</label>
                             <input
                                type="text"
                                name="ollamaUrl"
                                value={localSettings.ollamaUrl}
                                onChange={handleChange}
                                className={baseInputClasses}
                                placeholder="http://localhost:11434/api/chat"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama Model Name</label>
                             <input
                                type="text"
                                name="model"
                                value={localSettings.model}
                                onChange={handleChange}
                                className={baseInputClasses}
                                placeholder="e.g., gemma:2b, llama3, gpt-oss:20b"
                            />
                        </div>
                    </>
                )}

                {localSettings.provider === 'gemini' && (
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Google AI (Gemini) API Key</label>
                         <input
                            type="password"
                            name="geminiApiKey"
                            value={localSettings.geminiApiKey}
                            onChange={handleChange}
                            className={baseInputClasses}
                            placeholder="Enter your Gemini API Key"
                        />
                    </div>
                )}
                
                 <div>
                    <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">System Prompt</label>
                     <textarea
                        name="systemPrompt"
                        value={localSettings.systemPrompt}
                        onChange={handleChange}
                        rows={5}
                        className={baseInputClasses}
                        placeholder="Define the chatbot's role and personality."
                    />
                </div>
            </div>
        </Card>
    </div>
  );
};