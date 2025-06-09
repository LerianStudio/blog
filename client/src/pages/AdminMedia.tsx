import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Image, 
  File, 
  Search, 
  Grid3X3, 
  List,
  Download,
  Copy,
  Trash2,
  Eye,
  Plus,
  Filter
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export default function AdminMedia() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mock data for demonstration - in real implementation, this would fetch from API
  const mockMediaFiles: MediaFile[] = [
    {
      id: "1",
      filename: "hero-image.jpg",
      originalName: "hero-image.jpg",
      mimeType: "image/jpeg",
      size: 2457600,
      url: "/media/hero-image.jpg",
      uploadedAt: new Date("2024-01-15")
    },
    {
      id: "2", 
      filename: "diagram.png",
      originalName: "architecture-diagram.png",
      mimeType: "image/png",
      size: 1024000,
      url: "/media/diagram.png",
      uploadedAt: new Date("2024-01-10")
    },
    {
      id: "3",
      filename: "document.pdf",
      originalName: "technical-spec.pdf", 
      mimeType: "application/pdf",
      size: 5242880,
      url: "/media/document.pdf",
      uploadedAt: new Date("2024-01-08")
    }
  ];

  const { data: mediaFiles = mockMediaFiles, isLoading } = useQuery<MediaFile[]>({
    queryKey: ["/api/admin/media"],
    queryFn: () => Promise.resolve(mockMediaFiles) // Replace with actual API call
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      // Replace with actual upload API
      return Promise.resolve({
        success: true,
        files: Array.from(files).map(file => ({
          id: Math.random().toString(),
          filename: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url: `/media/${file.name}`,
          uploadedAt: new Date()
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // Replace with actual delete API
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const filteredFiles = mediaFiles?.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFileUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    return File;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "File URL copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        
        <main className="flex-1 ml-64">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
                <p className="text-gray-600 mt-1">
                  Upload and manage images, documents, and other files
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-github-blue hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </div>

            {/* Upload Area */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver ? 'border-github-blue bg-blue-50' : 'border-gray-300'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Drop files here or click to upload
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Support for images, documents, and other file types
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Select Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    accept="image/*,application/pdf,.doc,.docx,.txt"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter by Type
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {filteredFiles.length} of {mediaFiles.length} files
                  </p>
                  <p className="text-sm text-gray-600">
                    Total size: {formatFileSize(mediaFiles.reduce((acc, file) => acc + file.size, 0))}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Media Grid/List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="w-5 h-5 mr-2" />
                  Media Files ({filteredFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-blue"></div>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredFiles.map((file) => {
                        const FileIcon = getFileIcon(file.mimeType);
                        return (
                          <div key={file.id} className="group border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="aspect-square mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {file.mimeType.startsWith('image/') ? (
                                <img 
                                  src={file.url} 
                                  alt={file.originalName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileIcon className="w-12 h-12 text-gray-400" />
                              )}
                            </div>
                            <h4 className="font-medium text-sm text-gray-900 truncate mb-1">
                              {file.originalName}
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {formatFileSize(file.size)}
                            </p>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{file.originalName}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {file.mimeType.startsWith('image/') && (
                                      <img 
                                        src={file.url} 
                                        alt={file.originalName}
                                        className="w-full rounded-lg"
                                      />
                                    )}
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Size:</span>
                                        <span>{formatFileSize(file.size)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Type:</span>
                                        <span>{file.mimeType}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Uploaded:</span>
                                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => copyToClipboard(file.url)}
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy URL
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Download className="w-3 h-3 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => copyToClipboard(file.url)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => deleteMutation.mutate(file.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFiles.map((file) => {
                        const FileIcon = getFileIcon(file.mimeType);
                        return (
                          <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <FileIcon className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{file.originalName}</h4>
                                <p className="text-sm text-gray-500">
                                  {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyToClipboard(file.url)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deleteMutation.mutate(file.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No media files</h3>
                    <p className="text-gray-600 mb-4">
                      Upload your first image or document to get started
                    </p>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-github-blue hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}