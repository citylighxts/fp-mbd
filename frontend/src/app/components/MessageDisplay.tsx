import React from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

interface MessageDisplayProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, type }) => {
  if (!message) return null;

  const getBackgroundColor = (): string => { // Tentukan return type
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  const getIcon = (): JSX.Element | null => { // Tentukan return type
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-xl" />;
      case 'error':
        return <FaExclamationCircle className="text-xl" />;
      case 'info':
        return <FaInfoCircle className="text-xl" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center p-3 rounded-lg border-l-4 mb-4 ${getBackgroundColor()}`} role="alert">
      {getIcon()}
      <p className="ml-3 font-medium">{message}</p>
    </div>
  );
};

export default MessageDisplay;
