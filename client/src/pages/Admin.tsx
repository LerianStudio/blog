import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import PostEditor from "@/components/PostEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { FileText, CheckCircle, Edit, Clock, Eye, Rocket, Plus, Pencil, Trash2 } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
}

interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  lastUpdate: string | null;
}

export default function Admin() {
  const [location] = useLocation();
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();

  // Check if we should open the editor based on the route
  useEffect(() => {
    if (location === "/admin/new-post") {
      setEditingPost(null);
      setIsEditorOpen(true);
    }
  }, [location]);

  const { data: posts, isLoading: postsLoading, error: postsError } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/posts"],
  });

  const { data: stats, error: statsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (postsError && isUnauthorizedError(postsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [postsError, toast]);

  const buildSiteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/build", {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Hugo site built successfully",
      });
      console.log("Build output:", data);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to build site",
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postSlug: string) => {
      await apiRequest(`/api/admin/posts/${postSlug}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const handleNewPost = () => {
    setEditingPost(null);
    setIsEditorOpen(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setIsEditorOpen(true);
  };

  const handleDeletePost = (post: BlogPost) => {
    if (confirm(`Are you sure you want to delete "${post.title}"?`)) {
      deletePostMutation.mutate(post.slug);
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPost(null);
  };

  if (isEditorOpen) {
    return (
      <PostEditor 
        post={editingPost} 
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        
        <main className="flex-1 ml-64">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Blog Administration</h1>
                <p className="text-gray-600 mt-1">Manage your blog content and settings</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => buildSiteMutation.mutate()}
                  disabled={buildSiteMutation.isPending}
                  variant="outline"
                  className="text-github-blue border-github-blue hover:bg-github-blue hover:text-white"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {buildSiteMutation.isPending ? "Building..." : "Build Site"}
                </Button>
                <Button onClick={handleNewPost} className="bg-github-blue hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Published</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.publishedPosts || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                  <Edit className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats?.draftPosts || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Update</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    {stats?.lastUpdate 
                      ? new Date(stats.lastUpdate).toLocaleDateString()
                      : "Never"
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Posts Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Posts</CardTitle>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-blue"></div>
                  </div>
                ) : posts && posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.slug} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-900">{post.title}</h3>
                            <Badge
                              variant={post.status === "published" ? "default" : "secondary"}
                              className={post.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                            >
                              {post.status}
                            </Badge>
                            {post.category && (
                              <Badge variant="outline">{post.category}</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Updated: {new Date(post.updatedAt).toLocaleDateString()}</span>
                            {post.tags.length > 0 && (
                              <span>Tags: {post.tags.slice(0, 3).join(", ")}{post.tags.length > 3 ? "..." : ""}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPost(post)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                    <p className="text-gray-600 mb-4">Create your first blog post to get started.</p>
                    <Button onClick={handleNewPost} className="bg-github-blue hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Post
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