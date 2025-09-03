import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  PlayIcon,
  SpeakerWaveIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const FilePreview = ({ file, isOpen, onClose, onDownload }) => {
  const [previewContent, setPreviewContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewType, setPreviewType] = useState('unsupported');

  // Get file extension and determine preview type
  const getFileInfo = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    const name = filename?.split('.').slice(0, -1).join('.') || filename;
    
    let type = 'unsupported';
    let category = 'other';
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
      type = 'image';
      category = 'image';
    }
    // Text files
    else if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) {
      type = 'text';
      category = 'text';
    }
    // Code files
    else if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'swift'].includes(ext)) {
      type = 'code';
      category = 'code';
    }
    // PDF files
    else if (ext === 'pdf') {
      type = 'pdf';
      category = 'document';
    }
    // Video files
    else if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
      type = 'video';
      category = 'video';
    }
    // Audio files
    else if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) {
      type = 'audio';
      category = 'audio';
    }
    
    return { ext, name, type, category };
  };

  const fileInfo = getFileInfo(file?.name);

  // Load preview content
  useEffect(() => {
    if (!isOpen || !file) return;
    
    setLoading(true);
    setError(null);
    setPreviewType(fileInfo.type);
    
    // Simulate loading file content (in real app, this would fetch from IPFS/Storacha)
    const loadPreview = async () => {
      try {
        // For demo purposes, we'll simulate different file types
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        switch (fileInfo.type) {
          case 'image':
            // In real app, this would be the actual file URL from IPFS
            setPreviewContent(`data:image/${fileInfo.ext};base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`);
            break;
          case 'text':
            setPreviewContent('This is a sample text file content.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.');
            break;
          case 'code':
            setPreviewContent(`// Sample ${fileInfo.ext.toUpperCase()} file\nfunction example() {\n  console.log("Hello, World!");\n  return true;\n}\n\nexample();`);
            break;
          case 'pdf':
            setPreviewContent('PDF preview would be rendered here using a PDF viewer library.');
            break;
          default:
            setPreviewContent(null);
        }
      } catch (err) {
        setError('Failed to load file preview');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreview();
  }, [isOpen, file, fileInfo.type, fileInfo.ext]);

  // Get file type icon
  const getFileIcon = () => {
    switch (fileInfo.category) {
      case 'image': return <PhotoIcon className="w-8 h-8 text-blue-400" />;
      case 'text': return <DocumentTextIcon className="w-8 h-8 text-green-400" />;
      case 'code': return <CodeBracketIcon className="w-8 h-8 text-purple-400" />;
      case 'document': return <DocumentIcon className="w-8 h-8 text-red-400" />;
      case 'video': return <PlayIcon className="w-8 h-8 text-pink-400" />;
      case 'audio': return <SpeakerWaveIcon className="w-8 h-8 text-yellow-400" />;
      default: return <DocumentIcon className="w-8 h-8 text-gray-400" />;
    }
  };

  // Format file size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render preview content based on file type
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-cyan"></div>
          <span className="ml-3 text-light-silver/60">Loading preview...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-red-400 font-medium">{error}</p>
          <p className="text-light-silver/60 text-sm mt-2">Unable to load file preview</p>
        </div>
      );
    }

    switch (previewType) {
      case 'image':
        return (
          <div className="flex items-center justify-center h-96 bg-black/20 rounded-lg">
            <img 
              src={previewContent} 
              alt={file.name}
              className="max-h-full max-w-full object-contain rounded-lg"
              onError={() => setError('Failed to load image')}
            />
          </div>
        );
      
      case 'text':
      case 'code':
        return (
          <div className="h-96 bg-space-indigo/30 border border-electric-cyan/20 rounded-lg p-4 overflow-auto">
            <pre className="text-light-silver text-sm font-mono whitespace-pre-wrap">
              {previewContent}
            </pre>
          </div>
        );
      
      case 'pdf':
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-space-indigo/30 border border-electric-cyan/20 rounded-lg">
            <DocumentIcon className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-light-silver font-medium">PDF Preview</p>
            <p className="text-light-silver/60 text-sm mt-2">{previewContent}</p>
            <button
              onClick={onDownload}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
            >
              Download to View
            </button>
          </div>
        );
      
      case 'video':
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-black/20 rounded-lg">
            <PlayIcon className="w-16 h-16 text-pink-400 mb-4" />
            <p className="text-light-silver font-medium">Video Preview</p>
            <p className="text-light-silver/60 text-sm mt-2">Video playback not supported in preview</p>
            <button
              onClick={onDownload}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
            >
              Download to Play
            </button>
          </div>
        );
      
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-space-indigo/30 border border-electric-cyan/20 rounded-lg">
            <SpeakerWaveIcon className="w-16 h-16 text-yellow-400 mb-4" />
            <p className="text-light-silver font-medium">Audio Preview</p>
            <p className="text-light-silver/60 text-sm mt-2">Audio playback not supported in preview</p>
            <button
              onClick={onDownload}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
            >
              Download to Play
            </button>
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col items-center justify-center h-96">
            <EyeSlashIcon className="w-16 h-16 text-light-silver/30 mb-4" />
            <p className="text-light-silver/60 font-medium">Preview not available</p>
            <p className="text-light-silver/40 text-sm mt-2">This file type is not supported for preview</p>
            <button
              onClick={onDownload}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300 flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-electric-cyan/20">
          <div className="flex items-center space-x-4">
            {getFileIcon()}
            <div>
              <h2 className="text-xl font-bold text-light-silver">{file?.name}</h2>
              <div className="flex items-center space-x-4 text-sm text-light-silver/60 mt-1">
                <span>{formatBytes(file?.size || 0)}</span>
                <span>•</span>
                <span className="uppercase">{fileInfo.ext} file</span>
                {file?.uploadTime && (
                  <>
                    <span>•</span>
                    <span>{new Date(file.uploadTime).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onDownload}
              className="p-2 text-light-silver/60 hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
              title="Download file"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-light-silver/60 hover:text-light-silver hover:bg-electric-cyan/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden p-6">
          {renderPreview()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-electric-cyan/20">
          <div className="flex items-center justify-between">
            <div className="text-light-silver/60 text-xs">
              Preview may not reflect the exact appearance of the downloaded file
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onDownload}
                className="px-6 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300 flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-space-indigo border border-electric-cyan/20 text-light-silver rounded-lg hover:bg-electric-cyan/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;