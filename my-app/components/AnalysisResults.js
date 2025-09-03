"use client";
import React, { useState } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  TagIcon,
  HeartIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ClockIcon,
  EyeIcon,
  HashtagIcon,
  LanguageIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const AnalysisResults = ({ analysis, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState('json');
  
  if (!analysis) return null;
  
  const exportResults = (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analysis_results_${timestamp}`;
    
    let content, mimeType;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(analysis, null, 2);
        mimeType = 'application/json';
        break;
      case 'csv':
        const csvData = [
          ['Metric', 'Value'],
          ['Word Count', statistics?.wordCount || 0],
          ['Character Count', statistics?.characterCount || 0],
          ['Sentiment', sentiment?.sentiment || 'N/A'],
          ['Language', language || 'N/A'],
          ['Classification', classification?.categories?.[0]?.label || 'N/A'],
          ...keywords?.map(k => ['Keyword', k.keyword]) || [],
          ...entities?.map(e => ['Entity', e.value]) || [],
          ...topics?.map(t => ['Topic', t.topic]) || []
        ];
        content = csvData.map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
        break;
      case 'txt':
        content = `Analysis Results\n\n` +
          `Summary: ${summary || 'N/A'}\n\n` +
          `Statistics:\n` +
          `- Word Count: ${statistics?.wordCount || 0}\n` +
          `- Character Count: ${statistics?.characterCount || 0}\n\n` +
          `Sentiment: ${sentiment?.sentiment || 'N/A'}\n` +
          `Language: ${language || 'N/A'}\n` +
          `Classification: ${classification?.categories?.[0]?.label || 'N/A'}\n\n` +
          `Keywords: ${keywords?.map(k => k.keyword).join(', ') || 'None'}\n` +
          `Entities: ${entities?.map(e => e.value).join(', ') || 'None'}\n` +
          `Topics: ${topics?.map(t => t.topic).join(', ') || 'None'}`;
        mimeType = 'text/plain';
        break;
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
      alert('Analysis results copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };
  
  const shareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Analysis Results',
          text: `Summary: ${summary}`,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };
  
  const printResults = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Analysis Results</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .metric { margin: 5px 0; }
            .tag { display: inline-block; background: #f0f0f0; padding: 2px 8px; margin: 2px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AI Analysis Results</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          <div class="section">
            <h2>Summary</h2>
            <p>${summary || 'No summary available'}</p>
          </div>
          <div class="section">
            <h2>Statistics</h2>
            <div class="metric">Word Count: ${statistics?.wordCount || 0}</div>
            <div class="metric">Character Count: ${statistics?.characterCount || 0}</div>
          </div>
          <div class="section">
            <h2>Analysis Details</h2>
            <div class="metric">Sentiment: ${sentiment?.sentiment || 'N/A'}</div>
            <div class="metric">Language: ${language || 'N/A'}</div>
            <div class="metric">Classification: ${classification?.categories?.[0]?.label || 'N/A'}</div>
          </div>
          ${keywords?.length ? `
            <div class="section">
              <h2>Keywords</h2>
              ${keywords.map(k => `<span class="tag">${k.keyword}</span>`).join('')}
            </div>
          ` : ''}
          ${entities?.length ? `
            <div class="section">
              <h2>Entities</h2>
              ${entities.map(e => `<span class="tag">${e.value}</span>`).join('')}
            </div>
          ` : ''}
          ${topics?.length ? `
            <div class="section">
              <h2>Topics</h2>
              ${topics.map(t => `<span class="tag">${t.topic}</span>`).join('')}
            </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const { fileName, fileSize, fileType, analysis: results } = analysis;
  const {
    statistics,
    keywords = [],
    sentiment,
    entities = [],
    summary,
    language,
    topics = [],
    classification
  } = results;

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-space-indigo/95 to-purple-900/95 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-electric-cyan/20">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-6 h-6 text-electric-cyan" />
            <div>
              <h2 className="text-2xl font-bold text-light-silver">AI Analysis Results</h2>
              <p className="text-light-silver/60 text-sm">{fileName} • {fileSize}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="p-2 text-light-silver/60 hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <ClipboardDocumentIcon className="w-5 h-5" />
            </button>
            <button
              onClick={shareResults}
              className="p-2 text-light-silver/60 hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
              title="Share results"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={printResults}
              className="p-2 text-light-silver/60 hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
              title="Print results"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-light-silver/60 hover:text-light-silver hover:bg-electric-cyan/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-electric-cyan/20">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: EyeIcon },
              { id: 'details', name: 'Details', icon: ChartBarIcon },
              { id: 'export', name: 'Export', icon: DocumentArrowDownIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-electric-cyan text-electric-cyan'
                      : 'border-transparent text-light-silver/60 hover:text-light-silver hover:border-light-silver/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-electric-cyan">
                    {formatNumber(statistics?.wordCount || 0)}
                  </div>
                  <div className="text-sm text-light-silver/60">Words</div>
                </div>
                <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatNumber(statistics?.characterCount || 0)}
                  </div>
                  <div className="text-sm text-light-silver/60">Characters</div>
                </div>
                <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4 text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {sentiment?.sentiment || 'N/A'}
                  </div>
                  <div className="text-sm text-light-silver/60">Sentiment</div>
                </div>
                <div className="bg-orange-900/30 border border-orange-500/20 rounded-lg p-4 text-center">
                  <div className="text-lg font-bold text-orange-400">
                    {language || 'N/A'}
                  </div>
                  <div className="text-sm text-light-silver/60">Language</div>
                </div>
              </div>
              
              {/* Key Insights */}
              <div className="grid md:grid-cols-2 gap-6">
                {keywords && keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-light-silver mb-3">Top Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {keywords.slice(0, 8).map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-electric-cyan/20 text-electric-cyan"
                        >
                          {keyword.keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {topics && topics.length > 0 && (
                  <div>
                    <h4 className="font-medium text-light-silver mb-3">Main Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {topics.slice(0, 6).map((topic, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-400"
                        >
                          {topic.topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Summary Section */}
            {summary && (
              <div className="lg:col-span-2 bg-electric-cyan/10 border border-electric-cyan/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <DocumentTextIcon className="w-5 h-5 text-electric-cyan" />
                  <h3 className="text-lg font-semibold text-light-silver">Document Summary</h3>
                </div>
                <p className="text-light-silver/80 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Statistics */}
            {statistics && (
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ChartBarIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Document Statistics</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{formatNumber(statistics.wordCount)}</div>
                    <div className="text-sm text-light-silver/60">Words</div>
                  </div>
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{formatNumber(statistics.characterCount)}</div>
                    <div className="text-sm text-light-silver/60">Characters</div>
                  </div>
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{statistics.sentenceCount}</div>
                    <div className="text-sm text-light-silver/60">Sentences</div>
                  </div>
                  <div className="text-center p-3 bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{statistics.paragraphCount}</div>
                    <div className="text-sm text-light-silver/60">Paragraphs</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center p-2 bg-purple-900/10 rounded">
                    <span className="text-light-silver/70 text-sm">Reading Time</span>
                    <span className="text-purple-400 font-medium">{statistics.readingTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-900/10 rounded">
                    <span className="text-light-silver/70 text-sm">Avg Words/Sentence</span>
                    <span className="text-purple-400 font-medium">{statistics.averageWordsPerSentence}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sentiment Analysis */}
            {sentiment && (
              <div className="bg-blue-900/30 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <HeartIcon className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Sentiment Analysis</h3>
                </div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{getSentimentIcon(sentiment)}</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(sentiment)}`}>
                    {sentiment.sentiment.charAt(0).toUpperCase() + sentiment.sentiment.slice(1)}
                  </div>
                  <div className="text-light-silver/60 text-sm mt-2">
                    Confidence: {Math.round(sentiment.confidence * 100)}%
                    {sentiment.model === 'transformers' && (
                      <div className="text-electric-cyan text-xs mt-1 flex items-center justify-center space-x-1">
                        <SparklesIcon className="w-3 h-3" />
                        <span>Advanced AI Model</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-400">{sentiment.positiveWords}</div>
                    <div className="text-sm text-light-silver/60">Positive Words</div>
                  </div>
                  <div className="text-center p-3 bg-red-900/20 rounded-lg">
                    <div className="text-xl font-bold text-red-400">{sentiment.negativeWords}</div>
                    <div className="text-sm text-light-silver/60">Negative Words</div>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <div className="bg-green-900/30 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TagIcon className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Top Keywords</h3>
                </div>
                <div className="space-y-2">
                  {keywords.slice(0, 10).map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-900/20 rounded-lg">
                      <span className="text-light-silver font-medium">{keyword.keyword}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-green-900/30 rounded-full h-2">
                          <div 
                            className="bg-green-400 h-2 rounded-full" 
                            style={{ width: `${Math.min(keyword.relevance, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-green-400 text-sm font-medium">{keyword.frequency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Classification */}
            {classification && classification.categories && classification.categories.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <SparklesIcon className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Document Classification</h3>
                  <div className="text-electric-cyan text-xs flex items-center space-x-1">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI Powered</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {classification.categories.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg">
                      <span className="text-light-silver font-medium capitalize">{category.label}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-yellow-900/30 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${Math.round(category.confidence * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-yellow-400 text-sm font-medium">{Math.round(category.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <div className="bg-orange-900/30 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <HashtagIcon className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Detected Topics</h3>
                </div>
                <div className="space-y-3">
                  {topics.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-900/20 rounded-lg">
                      <span className="text-light-silver font-medium capitalize">{topic.topic}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-orange-900/30 rounded-full h-2">
                          <div 
                            className="bg-orange-400 h-2 rounded-full" 
                            style={{ width: `${topic.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-orange-400 text-sm font-medium">{topic.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {entities.length > 0 && (
              <div className="bg-cyan-900/30 border border-cyan-500/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <EyeIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-light-silver">Extracted Entities</h3>
                </div>
                <div className="space-y-2">
                  {entities.slice(0, 8).map((entity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-cyan-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          entity.type === 'email' ? 'bg-blue-100 text-blue-800' :
                          entity.type === 'url' ? 'bg-green-100 text-green-800' :
                          entity.type === 'phone' ? 'bg-purple-100 text-purple-800' :
                          entity.type === 'date' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entity.type}
                        </span>
                        <span className="text-light-silver text-sm">{entity.value}</span>
                      </div>
                      <span className="text-cyan-400 text-xs">{Math.round(entity.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language & Metadata */}
            <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <LanguageIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-light-silver">Document Metadata</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">Language</span>
                  <span className="text-indigo-400 font-medium uppercase">{language}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">File Type</span>
                  <span className="text-indigo-400 font-medium">{fileType}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">Analysis Date</span>
                  <span className="text-indigo-400 font-medium">
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-900/20 rounded">
                  <span className="text-light-silver/70">Text Length</span>
                  <span className="text-indigo-400 font-medium">{formatNumber(analysis.textLength)} chars</span>
                </div>
              </div>
            </div>

          </div>
        )}
        
        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-electric-cyan/10 border border-electric-cyan/20 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <DocumentArrowDownIcon className="w-5 h-5 text-electric-cyan" />
                <h3 className="text-lg font-semibold text-light-silver">Export Analysis Results</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => exportResults('json')}
                  className="flex items-center justify-center space-x-2 p-4 bg-blue-900/30 border border-blue-500/20 rounded-lg hover:bg-blue-900/50 transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-light-silver font-medium">Export as JSON</span>
                </button>
                
                <button
                  onClick={() => exportResults('csv')}
                  className="flex items-center justify-center space-x-2 p-4 bg-green-900/30 border border-green-500/20 rounded-lg hover:bg-green-900/50 transition-colors"
                >
                  <ChartBarIcon className="w-5 h-5 text-green-400" />
                  <span className="text-light-silver font-medium">Export as CSV</span>
                </button>
                
                <button
                  onClick={() => exportResults('txt')}
                  className="flex items-center justify-center space-x-2 p-4 bg-purple-900/30 border border-purple-500/20 rounded-lg hover:bg-purple-900/50 transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-purple-400" />
                  <span className="text-light-silver font-medium">Export as TXT</span>
                </button>
              </div>
              
              <div className="text-sm text-light-silver/60">
                <p className="mb-2">Export formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>JSON:</strong> Complete analysis data in structured format</li>
                  <li><strong>CSV:</strong> Tabular data suitable for spreadsheet applications</li>
                  <li><strong>TXT:</strong> Human-readable summary report</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-electric-cyan/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-light-silver/60 text-sm">
              <SparklesIcon className="w-4 h-4" />
              <span>Advanced AI analysis powered by Transformers.js - processed locally for maximum privacy</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;