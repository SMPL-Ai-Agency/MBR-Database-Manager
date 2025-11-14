import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { AiSettings } from '../../types';

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
    aiSettings: AiSettings;
    onAiSettingsChange: (settings: AiSettings) => void;
}


export const Settings: React.FC<SettingsProps> = ({ aiSettings, onAiSettingsChange }) => {
  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  const handleAiSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onAiSettingsChange({ ...aiSettings, [name]: value });
  };
  
  const baseInputClasses = "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5";


  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold">Settings</h2>
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
                        value={aiSettings.provider}
                        onChange={handleAiSettingChange}
                        className={baseInputClasses}
                    >
                        <option value="ollama">Ollama (Local)</option>
                        <option value="gemini">Gemini (Google AI)</option>
                    </select>
                </div>
                
                {aiSettings.provider === 'ollama' && (
                    <>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama URL</label>
                             <input
                                type="text"
                                name="ollamaUrl"
                                value={aiSettings.ollamaUrl}
                                onChange={handleAiSettingChange}
                                className={baseInputClasses}
                                placeholder="http://localhost:11434/api/chat"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama Model Name</label>
                             <input
                                type="text"
                                name="model"
                                value={aiSettings.model}
                                onChange={handleAiSettingChange}
                                className={baseInputClasses}
                                placeholder="e.g., gemma:2b, llama3, gpt-oss:20b"
                            />
                        </div>
                    </>
                )}
                
                 <div>
                    <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">System Prompt</label>
                     <textarea
                        name="systemPrompt"
                        value={aiSettings.systemPrompt}
                        onChange={handleAiSettingChange}
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
