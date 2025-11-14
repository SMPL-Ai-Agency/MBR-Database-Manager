import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { AiConfig, OllamaModel } from '../../types';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { testOllamaConnection, getOllamaModels } from '../../services/aiService';

interface AiSettingsCardProps {
  title: string;
  config: AiConfig;
  onConfigChange: (config: AiConfig) => void;
}

export const AiSettingsCard: React.FC<AiSettingsCardProps> = ({ title, config, onConfigChange }) => {
  const [ollamaTestStatus, setOllamaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [ollamaTestMessage, setOllamaTestMessage] = useState('');
  
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    if (!config.ollamaUrl) return;
    setIsFetchingModels(true);
    setFetchModelsError(null);
    try {
        const models = await getOllamaModels(config.ollamaUrl, config.ollamaApiKey);
        setOllamaModels(models);
        if (models.length > 0 && !models.some(m => m.name === config.model)) {
            onConfigChange({...config, model: models[0].name});
        }
    } catch (error: any) {
        setFetchModelsError(error.message);
        setOllamaModels([]);
    } finally {
        setIsFetchingModels(false);
    }
  }, [config.ollamaUrl, config.ollamaApiKey, config.model, onConfigChange]);

  useEffect(() => {
    if (config.provider === 'ollama') {
        fetchModels();
    }
  }, [config.provider, fetchModels]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onConfigChange({ ...config, [name]: value });
  };

  const handleTestOllamaConnection = async () => {
    setOllamaTestStatus('testing');
    setOllamaTestMessage('');
    const result = await testOllamaConnection({ ollamaUrl: config.ollamaUrl, model: config.model, ollamaApiKey: config.ollamaApiKey });
    if (result.success) {
        setOllamaTestStatus('success');
    } else {
        setOllamaTestStatus('error');
    }
    setOllamaTestMessage(result.message);
  };

  const baseInputClasses = "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5";

  return (
    <Card title={title} icon={ICONS.VOICE_CHAT}>
      <div className="space-y-4 p-2">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Model Provider</label>
          <select
            name="provider"
            value={config.provider}
            onChange={handleChange}
            className={baseInputClasses}
          >
            <option value="ollama">Ollama (Local/Cloud)</option>
            <option value="gemini">Gemini (Google AI)</option>
          </select>
        </div>
        
        {config.provider === 'ollama' && (
          <>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama URL</label>
              <input
                type="text"
                name="ollamaUrl"
                value={config.ollamaUrl}
                onChange={handleChange}
                className={baseInputClasses}
                placeholder="http://localhost:11434"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama API Key (Optional)</label>
              <input
                type="password"
                name="ollamaApiKey"
                value={config.ollamaApiKey}
                onChange={handleChange}
                className={baseInputClasses}
                placeholder="Enter API Key for cloud services"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Ollama Model</label>
              <div className="flex items-center gap-2">
                <select
                  name="model"
                  value={config.model}
                  onChange={handleChange}
                  className={baseInputClasses}
                  disabled={isFetchingModels || !!fetchModelsError}
                >
                  {isFetchingModels && <option>Fetching models...</option>}
                  {fetchModelsError && <option>Error fetching models</option>}
                  {!isFetchingModels && !fetchModelsError && ollamaModels.length === 0 && <option>No models found</option>}
                  {ollamaModels.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={fetchModels} disabled={isFetchingModels}>
                  {isFetchingModels ? <Spinner/> : 'Refresh'}
                </Button>
              </div>
              {fetchModelsError && <p className="text-red-500 text-xs mt-1">{fetchModelsError}</p>}
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button variant="secondary" onClick={handleTestOllamaConnection} disabled={ollamaTestStatus === 'testing' || !config.model}>
                {ollamaTestStatus === 'testing' ? <div className="flex items-center gap-2"><Spinner /> Testing...</div> : 'Test Connection'}
              </Button>
              {ollamaTestStatus !== 'idle' && ollamaTestStatus !== 'testing' && (
                <p className={`text-sm ${ollamaTestStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {ollamaTestMessage}
                </p>
              )}
            </div>
          </>
        )}

        {config.provider === 'gemini' && (
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Google AI (Gemini) API Key</label>
            <input
              type="password"
              name="geminiApiKey"
              value={config.geminiApiKey}
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
            value={config.systemPrompt}
            onChange={handleChange}
            rows={5}
            className={baseInputClasses}
            placeholder="Define the AI's role and personality."
          />
        </div>
      </div>
    </Card>
  );
};
