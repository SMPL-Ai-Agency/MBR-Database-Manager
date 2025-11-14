import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ICONS } from '../../constants';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedbackText: string) => void;
  rating: 1 | -1;
  response: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, rating, response }) => {
  const [feedbackText, setFeedbackText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(feedbackText);
  };

  const isPositive = rating === 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provide Additional Feedback"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit Feedback</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Response being reviewed:</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 italic">"{response}"</p>
        </div>
        <div>
          <label htmlFor="feedback" className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            Your Rating: 
            <span className={`flex items-center gap-1 font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? ICONS.THUMBS_UP : ICONS.THUMBS_DOWN}
                {isPositive ? 'Good response' : 'Bad response'}
            </span>
          </label>
          <textarea
            id="feedback"
            rows={5}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5"
            placeholder={isPositive ? "What did you like about this response?" : "What was wrong with this response? How could it be improved?"}
          />
        </div>
      </form>
    </Modal>
  );
};
