import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  const [location, navigate] = useLocation();
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();

  const { data: posts, isLoading: postsLoading, error: postsError } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/posts"],
  });

  const { data: stats, error: statsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: buildStatus } = useQuery({
    queryKey: ["/api/admin/build-status"],
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

  useEffect(() => {
    if (statsError && isUnauthorizedError(statsError as Error)) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [statsError, toast]);

  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/posts/${id}`);
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
        description: "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const buildSiteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/build");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/build-status"] });
      toast({
        title: "Success",
        description: "Hugo site built successfully",
      });
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
        description: "Failed to build site",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (location.includes("/admin/editor")) {
      const postId = location.split("/").pop();
      if (postId && postId !== "new") {
        const post = posts?.find(p => p.id === parseInt(postId));
        if (post) {
          setEditingPost(post);
        }
      } else {
        setEditingPost(null);
      }
      setIsEditorOpen(true);
    } else {
      setIsEditorOpen(false);
      setEditingPost(null);
    }
  }, [location, posts]);

  const handleNewPost = () => {
    navigate("/admin/editor/new");
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
    navigate("/admin");
  };

  if (isEditorOpen) {
    return (
      <PostEditor 
        post={editingPost} 
        onClose={handleCloseEditor}
      />
    );
  }

  if (postsLoading) {
    return (
      <div className="min-h-screen flex">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const recentPosts = posts?.slice(0, 5) || [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Manage your blog content and settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                onClick={() => window.open("/hugo", "_blank")}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Hugo Site
              </Button>
              <Button 
                onClick={() => buildSiteMutation.mutate()}
                disabled={buildSiteMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Rocket className="w-4 h-4 mr-2" />
                {buildSiteMutation.isPending ? "Building..." : "Build Hugo Site"}
              </Button>
              <Button onClick={handleNewPost} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Posts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalPosts || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Published</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.publishedPosts || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Drafts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.draftPosts || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Edit className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Updated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts and Quick Actions */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Posts */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Posts</CardTitle>
                    <Button variant="ghost" size="sm">
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No posts created yet.</p>
                      <Button onClick={handleNewPost} className="mt-4">
                        Create your first post
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {recentPosts.map((post) => (
                        <div key={post.id} className="py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge 
                                  variant={post.status === "published" ? "default" : "secondary"}
                                  className={post.status === "published" ? "bg-green-600" : "bg-purple-600"}
                                >
                                  {post.status}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(post.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">{post.title}</h4>
                              <p className="text-sm text-gray-600">
                                {post.excerpt || post.content.substring(0, 100) + "..."}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEditPost(post)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeletePost(post)}
                                disabled={deletePostMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button onClick={handleNewPost} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Post
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Site
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Site Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Build Status</span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Deploy</span>
                      <span className="text-sm text-gray-900 font-medium">2 hours ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
