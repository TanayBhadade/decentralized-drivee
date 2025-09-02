"use client";
import { useState, useMemo } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  DocumentIcon,
  EllipsisVerticalIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import FileSharingInterface from './FileSharingInterface';

const FileTable = ({ files = [], onFileAction }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [openDropdown, setOpenDropdown] = useState(null);
  const [copiedCID, setCopiedCID] = useState(null);
  const [sharingFile, setSharingFile] = useState(null);

  // Sample data if no files provided
  const sampleFiles = [
    {
      id: '1',
      name: 'project-proposal.pdf',
      cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      size: '2.4 MB',
      createdAt: '2024-01-15T10:30:00Z',
      type: 'pdf',
      downloads: 12,
      isShared: true
    },
    {
      id: '2',
      name: 'team-photo.jpg',
      cid: 'QmNRyRpqXjZSnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      size: '5.1 MB',
      createdAt: '2024-01-14T15:45:00Z',
      type: 'image',
      downloads: 8,
      isShared: false
    },
    {
      id: '3',
      name: 'smart-contract.sol',
      cid: 'QmPRyRpqXjZSnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      size: '15.2 KB',
      createdAt: '2024-01-13T09:20:00Z',
      type: 'code',
      downloads: 25,
      isShared: true
    },
    {
      id: '4',
      name: 'presentation.pptx',
      cid: 'QmQRyRpqXjZSnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      size: '8.7 MB',
      createdAt: '2024-01-12T14:10:00Z',
      type: 'presentation',
      downloads: 6,
      isShared: false
    }
  ];

  const displayFiles = files.length > 0 ? files : sampleFiles;

  // Sorting logic
  const sortedFiles = useMemo(() => {
    const sortableFiles = [...displayFiles];
    if (sortConfig.key) {
      sortableFiles.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle date sorting
        if (sortConfig.key === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        // Handle size sorting
        if (sortConfig.key === 'size') {
          aValue = parseFloat(aValue.replace(/[^0-9.]/g, ''));
          bValue = parseFloat(bValue.replace(/[^0-9.]/g, ''));
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableFiles;
  }, [displayFiles, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectFile = (fileId) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map(file => file.id)));
    }
  };

  const copyToClipboard = async (text, fileId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCID(fileId);
      setTimeout(() => setCopiedCID(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type) => {
    return <DocumentIcon className="w-5 h-5 text-gray-500" />;
  };

  const SortableHeader = ({ label, sortKey, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? 
            <ChevronUpIcon className="w-4 h-4" /> : 
            <ChevronDownIcon className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  const ActionDropdown = ({ file }) => (
    <div className="relative">
      <button
        onClick={() => setOpenDropdown(openDropdown === file.id ? null : file.id)}
        className="p-1 rounded-md hover:bg-gray-100 transition-colors"
      >
        <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
      </button>
      
      {openDropdown === file.id && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => {
                onFileAction?.('view', file);
                setOpenDropdown(null);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <EyeIcon className="w-4 h-4 mr-3" />
              View Details
            </button>
            <button
              onClick={() => {
                onFileAction?.('download', file);
                setOpenDropdown(null);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-3" />
              Download
            </button>
            <button
              onClick={() => {
                setSharingFile(file);
                setOpenDropdown(null);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <ShareIcon className="w-4 h-4 mr-3" />
              Share
            </button>
            <hr className="my-1" />
            <button
              onClick={() => {
                onFileAction?.('delete', file);
                setOpenDropdown(null);
              }}
              className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
            >
              <TrashIcon className="w-4 h-4 mr-3" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table Header with Batch Actions */}
      {selectedFiles.size > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Download Selected
              </button>
              <button className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <SortableHeader label="Name" sortKey="name" />
              <SortableHeader label="CID" sortKey="cid" />
              <SortableHeader label="Size" sortKey="size" />
              <SortableHeader label="Created" sortKey="createdAt" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedFiles.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => handleSelectFile(file.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getFileIcon(file.type)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500">{file.downloads} downloads</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {file.cid.substring(0, 20)}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(file.cid, file.id)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Copy CID"
                    >
                      {copiedCID === file.id ? (
                        <CheckIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {file.size}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(file.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    file.isShared 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {file.isShared ? 'Shared' : 'Private'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <ActionDropdown file={file} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {sortedFiles.length === 0 && (
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by uploading your first file.</p>
        </div>
      )}

      {/* File Sharing Interface */}
      {sharingFile && (
        <FileSharingInterface
          file={sharingFile}
          onClose={() => setSharingFile(null)}
        />
      )}
    </div>
  );
};

export default FileTable;