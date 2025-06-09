import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import MarkdownRenderer from "./MarkdownRenderer";
import { ArrowLeft, Save, Check, X, Eye, Edit, Settings } from "lucide-react";
import type { Post, InsertPost } from "@shared/schema";

interface PostEditorProps {
  post?: Post | null;
  onClose: () => void;
}

export default function PostEditor({ post, onClose }: PostEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "settings">("edit");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
    status: "draft" as "draft" | "published",
    featuredImage: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt || "",
        category: post.category || "",
        tags: post.tags?.join(", ") || "",
        status: post.status as "draft" | "published",
        featuredImage: post.featuredImage || "",
      });
    }
  }, [post]);

  const createPostMutation = useMutation({
    mutationFn: async (data: InsertPost) => {
      const response = await apiRequest("POST", "/api/admin/posts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async (data: Partial<InsertPost>) => {
      const response = await apiRequest("PUT", `/api/admin/posts/${post!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (status: "draft" | "published") => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const tags = formData.tags.split(",").map(tag => tag.trim()).filter(Boolean);

    const postData: InsertPost = {
      title: formData.title,
      slug,
      content: formData.content,
      excerpt: formData.excerpt,
      category: formData.category,
      tags,
      status,
      featuredImage: formData.featuredImage,
      publishedAt: status === "published" ? new Date() : null,
      authorId: "", // Will be set by the server
    };

    if (post) {
      updatePostMutation.mutate(postData);
    } else {
      createPostMutation.mutate(postData);
    }
  };

  const handleSaveDraft = () => handleSubmit("draft");
  const handlePublish = () => handleSubmit("published");

  const isPending = createPostMutation.isPending || updatePostMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {post ? "Edit Post" : "New Post"}
              </h1>
              <p className="text-sm text-gray-500">
                {formData.slug ? `content/posts/${formData.slug}.md` : "Untitled post"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={handlePublish}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {isPending ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <Button
            variant="ghost"
            className={`px-4 py-2 text-sm font-medium rounded-none border-b-2 ${
              activeTab === "edit"
                ? "text-blue-600 border-blue-600 bg-blue-50"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("edit")}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="ghost"
            className={`px-4 py-2 text-sm font-medium rounded-none border-b-2 ${
              activeTab === "preview"
                ? "text-blue-600 border-blue-600 bg-blue-50"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="ghost"
            className={`px-4 py-2 text-sm font-medium rounded-none border-b-2 ${
              activeTab === "settings"
                ? "text-blue-600 border-blue-600 bg-blue-50"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Metadata */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Post Settings</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter post title"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="url-friendly-slug"
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Brief description of the post"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="hugo, static-site, web-development"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "draft" | "published") => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input
                id="featuredImage"
                value={formData.featuredImage}
                onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Editor/Preview */}
        <div className="flex-1 flex flex-col">
          {activeTab === "edit" && (
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Start writing your post in Markdown..."
              className="flex-1 border-0 resize-none focus:ring-0 font-mono text-sm leading-relaxed"
            />
          )}
          
          {activeTab === "preview" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{formData.title || "Untitled Post"}</h1>
                {formData.excerpt && (
                  <p className="text-xl text-gray-600 mb-8">{formData.excerpt}</p>
                )}
                <MarkdownRenderer content={formData.content} />
              </div>
            </div>
          )}
          
          {activeTab === "settings" && (
            <div className="flex-1 p-6">
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Post Settings</h2>
                <p className="text-gray-600">
                  Configure additional settings for your post, including SEO metadata, 
                  social sharing options, and publication preferences.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
