import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { ConnectionSettings, AiConfig } from '../../types';
import { Button } from '../ui/Button';
import { AiSettingsCard } from './AiSettingsCard';

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.theme === 'dark') {
      return 'dark';
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
    onSettingsChange: (settings: ConnectionSettings) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [theme, setTheme] = useTheme();
  const [localSettings, setLocalSettings] = useState(settings);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supabaseTestMessage, setSupabaseTestMessage] = useState('');
  
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  const handleSupabaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAiAssistantChange = (newConfig: AiConfig) => {
    setLocalSettings(prev => ({ ...prev, aiAssistantConfig: newConfig }));
  };
  
  const handleDatasetManagerChange = (newConfig: AiConfig) => {
    setLocalSettings(prev => ({ ...prev, datasetManagerAiConfig: newConfig }));
  };

  const handleSave = async () => {
    await onSettingsChange(localSettings);
  };

  const handleTestSupabaseConnection = async () => {
    setSupabaseTestStatus('testing');
    setSupabaseTestMessage('');
    try {
        if (!localSettings.supabaseUrl || !localSettings.supabaseAnonKey) {
            throw new Error("Supabase URL and Anon Key are required.");
        }
        const testClient = createClient(localSettings.supabaseUrl, localSettings.supabaseAnonKey);
        
        const tablesAndViews = [
            'persons', 'marriages', 'ancestry_relations', 'descendants_relations', 
            'lateral_relations', 'paternal_haplogroup_trace', 'maternal_haplogroup_trace', 
            'paternal_enslaved_trace', 'maternal_enslaved_trace'
        ];

        const testResults = await Promise.all(
            tablesAndViews.map(name => 
                testClient.from(name).select('*', { count: 'exact', head: true })
                .then(res => ({ name, ...res }))
            )
        );

        const permissionErrors = testResults.filter(res => res.error && res.error.message.includes('permission denied'));
        
        if (permissionErrors.length > 0) {
            const failingNames = permissionErrors.map(e => e.name);
            
            const grantStatements = failingNames.map(name => 
                `GRANT SELECT ON TABLE public.${name} TO anon, authenticated;`
            ).join('\n');

            const policyStatements = failingNames.map(name =>
`
-- Policy for ${name}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = '${name}' AND policyname = 'Allow public read access to ${name}'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access to ${name}" ON public.${name} FOR SELECT TO anon, authenticated USING (true);';
  END IF;
END
$$;`
            ).join('\n');

            const fullScript = 
`-- Grant basic read access to the application's user role.
${grantStatements}

-- Create policies to satisfy Row Level Security (RLS) for public access.
${policyStatements}`;

            const errorMessage = `Permission Denied. Your database requires two types of permissions: basic read access (GRANT) and a policy for Row Level Security (RLS).\n\nTo fix this, please run the following complete SQL script in your Supabase SQL Editor. It's safe to run multiple times.\n\n${fullScript}`;
            throw new Error(errorMessage);
        }
        
        const otherErrors = testResults.filter(res => res.error);
        if (otherErrors.length > 0) {
            throw new Error(`Connection test failed on table/view "${otherErrors[0].name}": ${otherErrors[0].error.message}`);
        }
        
        setSupabaseTestStatus('success');
        setSupabaseTestMessage('Connection successful! Read access verified for all required tables and views.');
    } catch (error: any) {
        setSupabaseTestStatus('error');
        setSupabaseTestMessage(error.message);
    }
  };
  
  const baseInputClasses = "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold">Settings</h2>
            <Button onClick={handleSave}>Save & Connect</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Supabase Connection" icon={ICONS.DATABASE} className="lg:col-span-1">
                <div className="space-y-4 p-2">
                     <div>
                        <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Supabase URL</label>
                         <input
                            type="text"
                            name="supabaseUrl"
                            value={localSettings.supabaseUrl}
                            onChange={handleSupabaseChange}
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
                            onChange={handleSupabaseChange}
                            className={baseInputClasses}
                            placeholder="your-anon-key"
                        />
                    </div>
                    <div className="pt-2">
                        <Button variant="secondary" onClick={handleTestSupabaseConnection} disabled={supabaseTestStatus === 'testing'}>
                            Test Connection
                        </Button>
                        {supabaseTestStatus !== 'idle' && supabaseTestStatus !== 'testing' && (
                            <p className={`text-sm whitespace-pre-wrap mt-2 ${supabaseTestStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                {supabaseTestMessage}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            <Card title="Appearance" icon={ICONS.SETTINGS} className="lg:col-span-1">
                <div className="flex items-center justify-between p-2 h-full">
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
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AiSettingsCard 
                title="AI Assistant"
                config={localSettings.aiAssistantConfig}
                onConfigChange={handleAiAssistantChange}
            />
            <AiSettingsCard 
                title="Dataset Manager AI"
                config={localSettings.datasetManagerAiConfig}
                onConfigChange={handleDatasetManagerChange}
            />
        </div>
    </div>
  );
};
